/**
 * Bridge between Prisma models and the scheduling engine.
 *
 * Lives outside the engine folder by intent: the engine is pure / portable,
 * and this file is the single seam where Prisma-specific shapes meet it.
 *
 * Responsibilities:
 *  - load a store's phases + dependencies from DB
 *  - convert into ScheduleInput (works with both new TaskDependency rows
 *    and the legacy Phase.dependsOnId fields, preferring new where present)
 *  - cycle pre-check helper (used by API routes before persisting an edge)
 *  - persistence: write back computed start/finish to phases (best-effort)
 */

import type { PrismaClient } from "@prisma/client";
import { schedule } from "./schedule";
import type { Dependency, ScheduleInput, ScheduleResult, TaskInput } from "./types";

/** Days between two Date instances, rounded down. Used to derive a coarse duration when dates are missing. */
function diffDays(a: Date | null, b: Date | null): number {
  if (!a || !b) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
}

/**
 * Read all phases + dependencies for a single store and convert into the
 * shape the engine consumes. Mixed-source: prefers TaskDependency rows;
 * if a phase has zero TaskDependency entries but has a legacy `dependsOnId`,
 * we synthesize a single FS edge from it. (Backfill should already cover
 * this — kept as a safety net for unit-test fixtures + freshly-created phases.)
 */
export async function loadStoreSchedule(prisma: PrismaClient, storeId: string): Promise<ScheduleInput> {
  const [store, phases, deps] = await Promise.all([
    prisma.storeProject.findUnique({ where: { id: storeId }, select: { id: true, targetOpenDate: true, createdAt: true } }),
    prisma.phase.findMany({
      where: { storeId },
      orderBy: { order: "asc" },
      select: {
        id: true, name: true, order: true, status: true,
        plannedStart: true, plannedEnd: true,
        actualStart: true, actualEnd: true,
        dependsOnId: true, dependencyType: true, lagDays: true,
      },
    }),
    prisma.taskDependency.findMany({
      where: { predecessor: { storeId }, successor: { storeId } },
      select: { id: true, predecessorId: true, successorId: true, type: true, lagDays: true, lagPercent: true },
    }),
  ]);

  if (!store) throw new Error(`Store ${storeId} not found`);

  // Project anchor: earliest plannedStart, falling back to store creation.
  const earliest = phases.reduce<Date | null>((acc, p) => {
    if (!p.plannedStart) return acc;
    if (!acc || p.plannedStart.getTime() < acc.getTime()) return p.plannedStart;
    return acc;
  }, null);
  const projectStart = earliest ?? store.createdAt;

  const tasks: TaskInput[] = phases.map((p) => ({
    id: p.id,
    name: p.name,
    duration: diffDays(p.plannedStart, p.plannedEnd) || 14,
    actualStart: p.actualStart ?? undefined,
    actualFinish: p.actualEnd ?? undefined,
  }));

  // Build dependency list — prefer TaskDependency rows.
  const phaseIdsWithNewDeps = new Set(deps.map((d) => d.successorId));
  const dependencies: Dependency[] = deps.map((d) => ({
    predId: d.predecessorId,
    succId: d.successorId,
    type: d.type as Dependency["type"],
    lag: d.lagDays,
    lagPercent: d.lagPercent ?? undefined,
  }));

  // Fall back to legacy single-pred for phases that haven't been migrated.
  for (const p of phases) {
    if (p.dependsOnId && !phaseIdsWithNewDeps.has(p.id)) {
      dependencies.push({
        predId: p.dependsOnId,
        succId: p.id,
        type: (p.dependencyType as Dependency["type"]) ?? "FS",
        lag: p.lagDays,
      });
    }
  }

  return { projectStart, tasks, dependencies };
}

/** Run the engine against a store's current DB state. */
export async function scheduleStore(prisma: PrismaClient, storeId: string): Promise<ScheduleResult> {
  const input = await loadStoreSchedule(prisma, storeId);
  return schedule(input);
}

/**
 * Returns the predecessor chain that would be created by adding edge
 * `predId → succId`, or `null` if no cycle is introduced.
 *
 * Used by the API route before persisting a new TaskDependency.
 */
export async function wouldFormCycle(
  prisma: PrismaClient,
  predId: string,
  succId: string
): Promise<string[] | null> {
  if (predId === succId) return [predId, succId];

  // Reachability: from `succId`, can we already reach `predId` through the
  // existing dependency graph? If yes, the new edge would close a cycle.
  const visited = new Set<string>();
  const queue: string[] = [succId];
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === predId) {
      // Reconstruct cycle path.
      const path: string[] = [predId];
      let p: string | undefined = parent.get(cur);
      while (p && p !== succId) {
        path.unshift(p);
        p = parent.get(p);
      }
      path.unshift(succId);
      path.push(succId); // close the loop visually
      return path;
    }
    if (visited.has(cur)) continue;
    visited.add(cur);

    // Outgoing edges from `cur` — both new + legacy.
    const [outNew, outLegacy] = await Promise.all([
      prisma.taskDependency.findMany({ where: { predecessorId: cur }, select: { successorId: true } }),
      prisma.phase.findMany({ where: { dependsOnId: cur }, select: { id: true } }),
    ]);
    for (const d of outNew) {
      if (!visited.has(d.successorId)) {
        parent.set(d.successorId, cur);
        queue.push(d.successorId);
      }
    }
    for (const p of outLegacy) {
      if (!visited.has(p.id)) {
        parent.set(p.id, cur);
        queue.push(p.id);
      }
    }
  }

  return null;
}

/**
 * Persist computed schedule back to phases (best-effort, only updates
 * planned dates that differ). Returns count of phases updated.
 *
 * Skips writing for phases marked COMPLETED or with explicit actuals to
 * avoid clobbering tracked progress.
 */
export async function applyScheduleToStore(
  prisma: PrismaClient,
  storeId: string,
  result: ScheduleResult
): Promise<number> {
  const phases = await prisma.phase.findMany({
    where: { storeId },
    select: { id: true, status: true, plannedStart: true, plannedEnd: true, actualStart: true },
  });
  const byId = new Map(phases.map((p) => [p.id, p]));
  let updated = 0;

  for (const t of result.tasks) {
    const phase = byId.get(t.id);
    if (!phase) continue;
    if (phase.status === "COMPLETED" || phase.actualStart) continue;
    const same = phase.plannedStart?.getTime() === t.start.getTime() &&
                 phase.plannedEnd?.getTime() === t.finish.getTime();
    if (same) continue;
    await prisma.phase.update({
      where: { id: t.id },
      data: { plannedStart: t.start, plannedEnd: t.finish },
    });
    updated++;
  }
  return updated;
}
