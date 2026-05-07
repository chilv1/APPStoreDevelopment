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
      actualStart: true,
      actualEnd: true,
      status: true,
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

  // Stable start/end: bounded BELOW by planned. If actual is later than planned
  // (slip), use actual to push downstream out. If actual is earlier than planned
  // (finished early), DON'T pull downstream back past pred's plannedEnd — that
  // would cause dep to visually overtake pred's planned position. Falls back to
  // planned when actual is null.
  const stableStart = (p: { actualStart: Date | null; plannedStart: Date | null }): number | null => {
    const planned = p.plannedStart ? new Date(p.plannedStart).getTime() : null;
    const actual  = p.actualStart  ? new Date(p.actualStart).getTime()  : null;
    if (planned === null && actual === null) return null;
    if (planned === null) return actual;
    if (actual  === null) return planned;
    return Math.max(planned, actual);
  };
  const stableEnd = (p: { actualEnd: Date | null; plannedEnd: Date | null }): number | null => {
    const planned = p.plannedEnd ? new Date(p.plannedEnd).getTime() : null;
    const actual  = p.actualEnd  ? new Date(p.actualEnd).getTime()  : null;
    if (planned === null && actual === null) return null;
    if (planned === null) return actual;
    if (actual  === null) return planned;
    return Math.max(planned, actual);
  };

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const current = phaseById.get(currentId);
    if (!current) continue;
    const cStartMs = stableStart(current);
    const cEndMs   = stableEnd(current);
    if (cStartMs === null || cEndMs === null) continue;

    const deps = dependentsOf.get(currentId) ?? [];
    for (const dep of deps) {
      if (visited.has(dep.id)) continue;

      // Skip update for COMPLETED dependents — their plan is historical fact
      // and shouldn't move. Still propagate to THEIR dependents (using their
      // actual dates as anchor) in case downstream non-completed phases need
      // to align with the completed phase's actuals.
      if ((dep as any).status === "COMPLETED") {
        queue.push(dep.id);
        continue;
      }

      const lagMs = (dep.lagDays ?? 0) * DAY_MS;

      // Preserve duration of the dependent (planned duration is the baseline)
      const oldDurMs =
        dep.plannedStart && dep.plannedEnd
          ? new Date(dep.plannedEnd).getTime() - new Date(dep.plannedStart).getTime()
          : 14 * DAY_MS;

      let newStartMs: number;
      if (dep.dependencyType === "SS") {
        newStartMs = cStartMs + lagMs;
      } else if (dep.dependencyType === "FF") {
        newStartMs = cEndMs + lagMs - oldDurMs;
      } else if (dep.dependencyType === "SF") {
        newStartMs = cStartMs + lagMs - oldDurMs;
      } else {
        // FS (default)
        newStartMs = cEndMs + lagMs;
      }

      // Snap dep to the dependency anchor (forward OR backward to tighten
      // gaps), bounded by stable anchor of pred. If dep is already at the
      // exact anchor, nothing to write — but still propagate downstream.
      const currentStartMs = dep.plannedStart ? new Date(dep.plannedStart).getTime() : null;
      if (currentStartMs !== null && currentStartMs === newStartMs) {
        queue.push(dep.id);
        continue;
      }

      const newStart = new Date(newStartMs);
      const newEnd = new Date(newStartMs + oldDurMs);

      // Update planned dates so the new plan reflects the slip end-to-end.
      // Actuals (historical fact) are NOT touched — they still drive the bar
      // position for completed/in-progress phases.
      updates.push({ id: dep.id, plannedStart: newStart, plannedEnd: newEnd });

      // For downstream cascade, walk using the NEWLY planned end as the
      // basis — not the stale actualEnd. This way slips propagate forward
      // even past phases that finished early in the original plan.
      phaseById.set(dep.id, {
        ...dep,
        plannedStart: newStart,
        plannedEnd: newEnd,
        // Hide actuals for the downstream walk — keep DB row's actuals intact,
        // but successors should align to the new plan, not the old reality.
        actualStart: null,
        actualEnd: null,
      });

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
