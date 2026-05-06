/**
 * Stream 5 P2 — Timesheet → ResourceAssignment.actualWork sync.
 *
 * When a TimeEntry transitions to APPROVED, we want the matching
 * ResourceAssignment (resource = the user's mapped Resource, phase = the
 * timeentry's phase) to accumulate `actualWork`, and `cost` to refresh
 * from `actualWork × resource.standardRate`.
 *
 * Behavior:
 *   - If a Resource exists with `userId == timeEntry.userId`, reuse it.
 *     Otherwise, create one in-place (kind=WORK, name=user.name).
 *   - If a ResourceAssignment(resourceId, phaseId) exists, add hours to
 *     actualWork and recompute cost. Otherwise create one with
 *     workHours=0 (planned), actualWork=hours, cost=hours×standardRate.
 *
 * Idempotency note: this runs on the APPROVE transition only, so each
 * TimeEntry contributes once. (If an entry is re-approved after being
 * rejected, it'll add hours again. We ignore that edge for v1 — admins
 * are expected not to re-approve.)
 */

import type { PrismaClient } from "@prisma/client";

export async function syncApprovedTimeToActualWork(
  prisma: PrismaClient,
  timeEntryId: string
): Promise<{ resourceId: string; assignmentId: string; addedHours: number; addedCost: number } | null> {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId },
    select: {
      id: true, userId: true, phaseId: true, hours: true, status: true,
      user: { select: { id: true, name: true, email: true, role: true, region: true } },
      phase: { select: { id: true, storeId: true } },
    },
  });
  if (!entry || entry.status !== "APPROVED") return null;

  // Find or create the user's Resource — scoped to the same store as the phase.
  let resource = await prisma.resource.findFirst({
    where: { userId: entry.userId, OR: [{ storeId: entry.phase.storeId }, { storeId: null }] },
    select: { id: true, standardRate: true, costPerUse: true },
  });
  if (!resource) {
    const created = await prisma.resource.create({
      data: {
        name: entry.user.name,
        kind: "WORK",
        email: entry.user.email,
        userId: entry.userId,
        storeId: entry.phase.storeId,
        standardRate: 0,
        maxUnits: 100,
      },
      select: { id: true, standardRate: true, costPerUse: true },
    });
    resource = created;
  }

  // Find or create the assignment.
  const assignment = await prisma.resourceAssignment.upsert({
    where: { resourceId_phaseId: { resourceId: resource.id, phaseId: entry.phaseId } },
    create: {
      resourceId: resource.id,
      phaseId: entry.phaseId,
      units: 100,
      workHours: 0,
      actualWork: entry.hours,
      cost: entry.hours * resource.standardRate,
    },
    update: {
      actualWork: { increment: entry.hours },
    },
    select: { id: true, actualWork: true, workHours: true },
  });

  // Refresh cost from actualWork × rate (+ costPerUse one-time, only first sync).
  const newCost = assignment.actualWork * resource.standardRate;
  await prisma.resourceAssignment.update({
    where: { id: assignment.id },
    data: { cost: newCost },
  });

  return {
    resourceId: resource.id,
    assignmentId: assignment.id,
    addedHours: entry.hours,
    addedCost: entry.hours * resource.standardRate,
  };
}
