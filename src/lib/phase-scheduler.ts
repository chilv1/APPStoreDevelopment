import { PrismaClient } from "@prisma/client";

const DAY_MS = 1000 * 60 * 60 * 24;

export interface PhaseInput {
  id: string;
  order: number;
  dependencyType: string;   // "FS" | "SS" | "FF" | "SF"
  dependsOnId: string | null;
  lagDays: number;
  durationDays?: number;    // computed from plannedStart/plannedEnd if not provided
  plannedStart?: Date | string | null;
  plannedEnd?: Date | string | null;
}

export interface PhaseSchedule {
  start: Date;
  end: Date;
}

/**
 * Topological sort + schedule computation.
 * Supports FS (Finish-to-Start) and SS (Start-to-Start) with lag days.
 * Returns Map<phaseId, {start, end}>.
 *
 * For phases without a predecessor (dependsOnId = null), uses projectStart as anchor.
 */
export function computePhaseSchedule(
  phases: PhaseInput[],
  projectStart: Date
): Map<string, PhaseSchedule> {
  const result = new Map<string, PhaseSchedule>();
  const visiting = new Set<string>(); // cycle detection

  const phaseMap = new Map(phases.map((p) => [p.id, p]));

  function getDurationMs(phase: PhaseInput): number {
    if (phase.durationDays) return phase.durationDays * DAY_MS;
    if (phase.plannedStart && phase.plannedEnd) {
      const s = new Date(phase.plannedStart).getTime();
      const e = new Date(phase.plannedEnd).getTime();
      if (e > s) return e - s;
    }
    return 14 * DAY_MS; // fallback 14 days
  }

  function visit(phase: PhaseInput): PhaseSchedule {
    if (result.has(phase.id)) return result.get(phase.id)!;
    if (visiting.has(phase.id)) {
      // Cycle detected — break by using projectStart
      const dur = getDurationMs(phase);
      const s = new Date(projectStart);
      return { start: s, end: new Date(s.getTime() + dur) };
    }

    visiting.add(phase.id);

    let startMs = projectStart.getTime();

    if (phase.dependsOnId) {
      const dep = phaseMap.get(phase.dependsOnId);
      if (dep) {
        const depSched = visit(dep);
        const lagMs   = (phase.lagDays ?? 0) * DAY_MS;
        const thisDur = getDurationMs(phase);
        if (phase.dependencyType === "SS") {
          startMs = depSched.start.getTime() + lagMs;
        } else if (phase.dependencyType === "FF") {
          startMs = depSched.end.getTime() + lagMs - thisDur;
        } else if (phase.dependencyType === "SF") {
          startMs = depSched.start.getTime() + lagMs - thisDur;
        } else {
          // FS (default)
          startMs = depSched.end.getTime() + lagMs;
        }
      }
    }

    const durMs = getDurationMs(phase);
    const schedule: PhaseSchedule = {
      start: new Date(startMs),
      end: new Date(startMs + durMs),
    };

    visiting.delete(phase.id);
    result.set(phase.id, schedule);
    return schedule;
  }

  // Sort by order so independent phases get consistent ordering
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  sorted.forEach((p) => visit(p));

  return result;
}

/**
 * After a phase's plannedStart or plannedEnd changes, cascade to all
 * phases that directly or indirectly depend on it (BFS traversal).
 *
 * Returns the number of phases updated.
 */
export async function cascadeDependents(
  changedPhaseId: string,
  prisma: PrismaClient
): Promise<number> {
  // Load ALL phases for the same store in one query
  const changedPhase = await prisma.phase.findUnique({
    where: { id: changedPhaseId },
    select: { storeId: true, plannedStart: true, plannedEnd: true },
  });
  if (!changedPhase) return 0;

  const allPhases = await prisma.phase.findMany({
    where: { storeId: changedPhase.storeId },
    select: {
      id: true,
      order: true,
      dependencyType: true,
      dependsOnId: true,
      lagDays: true,
      plannedStart: true,
      plannedEnd: true,
    },
  });

  // Build dependency map: phaseId → list of phases that depend on it
  const dependentsOf = new Map<string, typeof allPhases>();
  for (const p of allPhases) {
    if (p.dependsOnId) {
      if (!dependentsOf.has(p.dependsOnId)) dependentsOf.set(p.dependsOnId, []);
      dependentsOf.get(p.dependsOnId)!.push(p);
    }
  }

  // Build lookup by id
  const phaseById = new Map(allPhases.map((p) => [p.id, p]));

  const updates: { id: string; plannedStart: Date; plannedEnd: Date }[] = [];
  const visited = new Set<string>();
  const queue: string[] = [changedPhaseId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const current = phaseById.get(currentId);
    if (!current || !current.plannedStart || !current.plannedEnd) continue;

    const deps = dependentsOf.get(currentId) ?? [];
    for (const dep of deps) {
      if (visited.has(dep.id)) continue;

      const lagMs = (dep.lagDays ?? 0) * DAY_MS;

      // Preserve duration
      const oldDurMs =
        dep.plannedStart && dep.plannedEnd
          ? new Date(dep.plannedEnd).getTime() - new Date(dep.plannedStart).getTime()
          : 14 * DAY_MS;

      let newStartMs: number;
      if (dep.dependencyType === "SS") {
        newStartMs = new Date(current.plannedStart).getTime() + lagMs;
      } else if (dep.dependencyType === "FF") {
        newStartMs = new Date(current.plannedEnd).getTime() + lagMs - oldDurMs;
      } else if (dep.dependencyType === "SF") {
        newStartMs = new Date(current.plannedStart).getTime() + lagMs - oldDurMs;
      } else {
        // FS (default)
        newStartMs = new Date(current.plannedEnd).getTime() + lagMs;
      }

      const newStart = new Date(newStartMs);
      const newEnd = new Date(newStartMs + oldDurMs);

      updates.push({ id: dep.id, plannedStart: newStart, plannedEnd: newEnd });

      // Update phaseById so downstream cascades use updated dates
      phaseById.set(dep.id, { ...dep, plannedStart: newStart, plannedEnd: newEnd });

      queue.push(dep.id);
    }
  }

  if (updates.length === 0) {
    // Still need to sync targetOpenDate even when no dependents were cascaded
    // (the changed phase itself may be the last phase)
    await syncTargetOpenDate(changedPhase.storeId, prisma);
    return 0;
  }

  await prisma.$transaction(
    updates.map(({ id, plannedStart, plannedEnd }) =>
      prisma.phase.update({ where: { id }, data: { plannedStart, plannedEnd } })
    )
  );

  // Sync store.targetOpenDate = plannedEnd of the last phase (highest order)
  await syncTargetOpenDate(changedPhase.storeId, prisma);

  return updates.length;
}

async function syncTargetOpenDate(storeId: string, prisma: PrismaClient) {
  const lastPhase = await prisma.phase.findFirst({
    where: { storeId },
    orderBy: { order: "desc" },
    select: { plannedEnd: true },
  });
  if (lastPhase?.plannedEnd) {
    await prisma.storeProject.update({
      where: { id: storeId },
      data: { targetOpenDate: lastPhase.plannedEnd },
    });
  }
}
