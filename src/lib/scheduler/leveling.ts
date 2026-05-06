/**
 * Resource leveling — defer tasks that overload a resource until allocation
 * fits, preferring tasks with positive total float so the project finish
 * doesn't slip when avoidable.
 *
 * Algorithm:
 *   1. Build per-resource demand events from the input schedule
 *      (start/finish dates × units/100 of the resource's maxUnits).
 *   2. Walk events in time order; if cumulative demand > 100% of capacity
 *      for any resource at any moment, find the latest-priority "movable"
 *      task contributing to the overload and shift it forward by 1 day,
 *      capped by its slack (or beyond if `allowSlippage=true`).
 *   3. Re-emit the schedule. Returns adjusted start/finish per task plus
 *      a leveling log so the UI can explain what moved.
 *
 * This is a heuristic — not a true ILP solver. Good enough for v1; runs
 * in O(T·R) where T is tasks and R is resources with assignments.
 */

import type { TaskResult } from "./types";

const MS_PER_DAY = 86_400_000;

export interface AssignmentInput {
  taskId: string;
  resourceId: string;
  units: number;     // % allocation
  maxUnits: number;  // resource's capacity %
  priority?: number; // higher = keep early; lower = movable first
}

export interface LevelingInput {
  tasks: TaskResult[];
  assignments: AssignmentInput[];
  allowSlippage?: boolean;
}

export interface LevelingMove {
  taskId: string;
  taskName: string;
  resourceId: string;
  shiftedDays: number;
  reason: string;
}

export interface LevelingResult {
  tasks: TaskResult[];
  moves: LevelingMove[];
  iterations: number;
  resolved: boolean;
}

interface DemandPoint {
  start: number;
  end: number;
  units: number;
  taskId: string;
  priority: number;
}

function peakOnDay(intervals: DemandPoint[], day: number): { sum: number; intervals: DemandPoint[] } {
  const overlapping = intervals.filter((iv) => iv.start <= day && iv.end > day);
  return { sum: overlapping.reduce((s, iv) => s + iv.units, 0), intervals: overlapping };
}

export function levelSchedule(input: LevelingInput): LevelingResult {
  const tasks = input.tasks.map((t) => ({ ...t }));
  const moves: LevelingMove[] = [];
  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  // Group assignments by resource.
  const byResource = new Map<string, { maxUnits: number; assignments: AssignmentInput[] }>();
  for (const a of input.assignments) {
    if (!byResource.has(a.resourceId)) byResource.set(a.resourceId, { maxUnits: a.maxUnits, assignments: [] });
    byResource.get(a.resourceId)!.assignments.push(a);
  }

  const MAX_ITERATIONS = 1000;
  let iter = 0;
  let made = true;

  while (made && iter < MAX_ITERATIONS) {
    made = false;
    iter++;

    for (const [resourceId, { maxUnits, assignments }] of byResource) {
      const intervals: DemandPoint[] = assignments.map((a) => {
        const t = tasksById.get(a.taskId);
        if (!t) return null;
        return {
          start: t.start.getTime(),
          end:   t.finish.getTime(),
          units: a.units,
          taskId: a.taskId,
          priority: a.priority ?? 0,
        };
      }).filter((x): x is DemandPoint => x !== null);

      // Find the earliest day with overload.
      const events = [
        ...intervals.map((iv) => ({ t: iv.start, kind: "+" as const, iv })),
        ...intervals.map((iv) => ({ t: iv.end,   kind: "-" as const, iv })),
      ].sort((a, b) => a.t - b.t || (a.kind === "-" ? -1 : 1));

      let cur = 0;
      let firstOverloadAt: number | null = null;
      const live: DemandPoint[] = [];
      for (const e of events) {
        if (e.kind === "+") { cur += e.iv.units; live.push(e.iv); }
        else { cur -= e.iv.units; const i = live.indexOf(e.iv); if (i >= 0) live.splice(i, 1); }
        if (cur > maxUnits) { firstOverloadAt = e.t; break; }
      }

      if (firstOverloadAt === null) continue; // resource is feasible

      // Pick the most movable task at that moment: lowest priority, max float.
      const overlap = peakOnDay(intervals, firstOverloadAt);
      const candidates = overlap.intervals
        .map((iv) => ({ iv, task: tasksById.get(iv.taskId)! }))
        .filter((c) => c.task && (input.allowSlippage || c.task.totalFloat > 0))
        .sort((a, b) => a.iv.priority - b.iv.priority || b.task.totalFloat - a.task.totalFloat);

      if (candidates.length === 0) {
        // Cannot level without slipping — bail (or accept with allowSlippage).
        continue;
      }
      const pick = candidates[0];
      const shiftDays = 1; // micro-step; loop will keep shifting until feasible
      pick.task.start  = new Date(pick.task.start.getTime()  + shiftDays * MS_PER_DAY);
      pick.task.finish = new Date(pick.task.finish.getTime() + shiftDays * MS_PER_DAY);
      pick.task.earlyStart  = pick.task.start;
      pick.task.earlyFinish = pick.task.finish;
      pick.task.totalFloat = Math.max(0, pick.task.totalFloat - shiftDays);

      moves.push({
        taskId: pick.iv.taskId,
        taskName: pick.task.name,
        resourceId,
        shiftedDays: shiftDays,
        reason: `Resource ${resourceId} demand ${overlap.sum}% > ${maxUnits}% on ${new Date(firstOverloadAt).toISOString().slice(0,10)}`,
      });
      made = true;
      break;
    }
  }

  // Aggregate moves per task.
  const aggMoves = new Map<string, LevelingMove>();
  for (const m of moves) {
    const cur = aggMoves.get(m.taskId);
    if (cur) cur.shiftedDays += m.shiftedDays;
    else aggMoves.set(m.taskId, { ...m });
  }

  return {
    tasks,
    moves: [...aggMoves.values()],
    iterations: iter,
    resolved: !made,
  };
}
