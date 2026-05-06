/**
 * Critical Path Method — forward & backward pass.
 *
 * Operates over an already-validated topological order. Per-task data lives
 * in maps keyed by TaskID so callers can stream results without reallocating.
 *
 * Floats:
 *   totalFloat(t) = lateStart(t) - earlyStart(t)            (working days)
 *   freeFloat(t)  = min over successors of (succ.earlyStart - this.earlyFinish - lag)
 * critical iff totalFloat == 0.
 */

import { addWorkingDays, computeFinish, diffWorkingDays, IndexedCalendar, startOfDay } from "./calendar";
import type { DependencyGraph } from "./graph";
import type { Dependency, ScheduleWarning, TaskID, TaskInput } from "./types";

export interface CpmContext {
  graph: DependencyGraph;
  topo: TaskID[];
  calendarFor: (taskId: TaskID) => IndexedCalendar;
  projectStart: Date;
  projectFinish?: Date; // optional; if absent we use max earlyFinish.
}

export interface CpmDates {
  earlyStart: Map<TaskID, Date>;
  earlyFinish: Map<TaskID, Date>;
  lateStart: Map<TaskID, Date>;
  lateFinish: Map<TaskID, Date>;
  totalFloat: Map<TaskID, number>;
  freeFloat: Map<TaskID, number>;
  critical: Set<TaskID>;
  warnings: ScheduleWarning[];
}

function resolveLag(d: Dependency, predDuration: number): number {
  if (typeof d.lagPercent === "number") {
    return Math.round((d.lagPercent / 100) * predDuration);
  }
  return d.lag ?? 0;
}

/**
 * Apply a constraint to a candidate earlyStart. Returns the constrained
 * date and (optionally) a violation message if the constraint fights the
 * dependency-driven schedule.
 */
function applyStartConstraint(
  task: TaskInput,
  candidate: Date,
  cal: IndexedCalendar
): { start: Date; violation?: string } {
  if (!task.constraintType || task.constraintType === "ASAP" || task.constraintType === "ALAP") {
    if (task.start) {
      const pin = startOfDay(task.start);
      // Treat manual start like SNET: pin if later than dependency-driven candidate.
      return pin.getTime() > candidate.getTime() ? { start: pin } : { start: candidate };
    }
    return { start: candidate };
  }
  if (!task.constraintDate) {
    return { start: candidate, violation: `Constraint ${task.constraintType} requires constraintDate` };
  }
  const cd = startOfDay(task.constraintDate);
  switch (task.constraintType) {
    case "MSO": {
      const violation = cd.getTime() < candidate.getTime() ? `MSO ${cd.toISOString().slice(0, 10)} earlier than dependency-driven ${candidate.toISOString().slice(0, 10)}` : undefined;
      return { start: cd, violation };
    }
    case "SNET":
      return { start: cd.getTime() > candidate.getTime() ? cd : candidate };
    case "SNLT": {
      const violation = candidate.getTime() > cd.getTime() ? `SNLT ${cd.toISOString().slice(0, 10)} violated by candidate ${candidate.toISOString().slice(0, 10)}` : undefined;
      return { start: candidate, violation };
    }
    case "MFO":
    case "FNET":
    case "FNLT":
      // Finish-based constraints handled after we compute finish; honor candidate here.
      return { start: candidate };
    default:
      return { start: candidate };
  }
}

function applyFinishConstraint(
  task: TaskInput,
  startCandidate: Date,
  finishCandidate: Date,
  cal: IndexedCalendar,
  duration: number
): { start: Date; finish: Date; violation?: string } {
  if (!task.constraintType || !task.constraintDate) return { start: startCandidate, finish: finishCandidate };
  const cd = startOfDay(task.constraintDate);
  switch (task.constraintType) {
    case "MFO": {
      const newStart = addWorkingDays(cd, -duration, cal);
      const violation = cd.getTime() < finishCandidate.getTime()
        ? `MFO ${cd.toISOString().slice(0, 10)} earlier than dependency-driven ${finishCandidate.toISOString().slice(0, 10)}`
        : undefined;
      return { start: newStart, finish: cd, violation };
    }
    case "FNET":
      if (cd.getTime() > finishCandidate.getTime()) {
        return { start: addWorkingDays(cd, -duration, cal), finish: cd };
      }
      return { start: startCandidate, finish: finishCandidate };
    case "FNLT": {
      const violation = finishCandidate.getTime() > cd.getTime()
        ? `FNLT ${cd.toISOString().slice(0, 10)} violated by candidate ${finishCandidate.toISOString().slice(0, 10)}`
        : undefined;
      return { start: startCandidate, finish: finishCandidate, violation };
    }
    default:
      return { start: startCandidate, finish: finishCandidate };
  }
}

/**
 * Forward pass — walk in topological order, compute earlyStart/earlyFinish.
 * Summary tasks are deferred (set to roll up later).
 */
export function forwardPass(ctx: CpmContext): {
  earlyStart: Map<TaskID, Date>;
  earlyFinish: Map<TaskID, Date>;
  warnings: ScheduleWarning[];
} {
  const { graph, topo, calendarFor, projectStart } = ctx;
  const ES = new Map<TaskID, Date>();
  const EF = new Map<TaskID, Date>();
  const warnings: ScheduleWarning[] = [];

  for (const id of topo) {
    const t = graph.byId.get(id)!;
    const cal = calendarFor(id);

    // Summaries — defer; they roll up after children resolved.
    const isSummary = (graph.children.get(id) ?? []).length > 0;
    if (isSummary) continue;

    let candidateStart = startOfDay(projectStart);

    // Actuals pin the start.
    if (t.actualStart) candidateStart = startOfDay(t.actualStart);

    for (const d of graph.preds.get(id) ?? []) {
      const predEF = EF.get(d.predId);
      const predES = ES.get(d.predId);
      const pred = graph.byId.get(d.predId);
      if (!predEF || !predES || !pred) continue;
      const lag = resolveLag(d, pred.duration);
      let driven: Date;
      switch (d.type) {
        case "FS":
          driven = addWorkingDays(predEF, lag, cal);
          break;
        case "SS":
          driven = addWorkingDays(predES, lag, cal);
          break;
        case "FF":
          driven = addWorkingDays(predEF, lag - t.duration, cal);
          break;
        case "SF":
          driven = addWorkingDays(predES, lag - t.duration, cal);
          break;
      }
      if (driven.getTime() > candidateStart.getTime()) candidateStart = driven;
    }

    // Apply start-side constraints.
    const startApplied = applyStartConstraint(t, candidateStart, cal);
    if (startApplied.violation) {
      warnings.push({ level: "warning", taskId: id, code: "CONSTRAINT_VIOLATION", message: startApplied.violation });
    }
    let start = startApplied.start;

    // Snap to a working day (constraint dates may land on weekends).
    if (t.duration > 0) start = addWorkingDays(start, 0, cal);

    let finish = computeFinish(start, t.duration, cal);

    // Apply finish-side constraints (may shift start/finish).
    const finishApplied = applyFinishConstraint(t, start, finish, cal, t.duration);
    if (finishApplied.violation) {
      warnings.push({ level: "warning", taskId: id, code: "CONSTRAINT_VIOLATION", message: finishApplied.violation });
    }
    start = finishApplied.start;
    finish = finishApplied.finish;

    // Actual finish overrides.
    if (t.actualFinish) finish = startOfDay(t.actualFinish);

    // Deadline check.
    if (t.deadline) {
      const dl = startOfDay(t.deadline);
      if (finish.getTime() > dl.getTime()) {
        warnings.push({
          level: "warning",
          taskId: id,
          code: "DEADLINE_MISSED",
          message: `Deadline ${dl.toISOString().slice(0, 10)} missed (finish ${finish.toISOString().slice(0, 10)})`,
        });
      }
    }

    ES.set(id, start);
    EF.set(id, finish);
  }

  return { earlyStart: ES, earlyFinish: EF, warnings };
}

/**
 * Backward pass — walk in reverse topological order, compute lateStart/lateFinish.
 */
export function backwardPass(
  ctx: CpmContext,
  ES: Map<TaskID, Date>,
  EF: Map<TaskID, Date>
): { lateStart: Map<TaskID, Date>; lateFinish: Map<TaskID, Date> } {
  const { graph, topo, calendarFor, projectFinish } = ctx;
  const LS = new Map<TaskID, Date>();
  const LF = new Map<TaskID, Date>();

  // Project finish anchor: explicit, or max earlyFinish across leaves.
  let anchor = projectFinish ? startOfDay(projectFinish) : new Date(0);
  if (!projectFinish) {
    for (const ef of EF.values()) if (ef.getTime() > anchor.getTime()) anchor = ef;
  }

  for (let i = topo.length - 1; i >= 0; i--) {
    const id = topo[i];
    const t = graph.byId.get(id)!;
    const cal = calendarFor(id);
    const isSummary = (graph.children.get(id) ?? []).length > 0;
    if (isSummary) continue;

    let candidateFinish = anchor;
    const succs = graph.succs.get(id) ?? [];
    let resolvedAny = false;
    if (succs.length > 0) {
      let bound: Date | null = null;
      for (const d of succs) {
        const sLS = LS.get(d.succId);
        const sLF = LF.get(d.succId);
        const succ = graph.byId.get(d.succId);
        // Skip cyclic / not-yet-resolved successors — they'll fall back to anchor.
        if (!sLS || !sLF || !succ) continue;
        resolvedAny = true;
        const lag = resolveLag(d, t.duration);
        let driven: Date;
        switch (d.type) {
          case "FS":
            driven = addWorkingDays(sLS, -lag, cal);
            break;
          case "SS":
            driven = addWorkingDays(sLS, -lag + t.duration, cal); // succ.LS - lag = this.LS, finish = LS + dur
            break;
          case "FF":
            driven = addWorkingDays(sLF, -lag, cal);
            break;
          case "SF":
            driven = addWorkingDays(sLF, -lag + t.duration, cal); // succ.LF >= this.LS + dur + lag
            break;
        }
        if (bound === null || driven.getTime() < bound.getTime()) bound = driven;
      }
      if (resolvedAny && bound) candidateFinish = bound;
      // If no successors resolved (e.g. cycle), candidateFinish stays at anchor.
    }

    // Hard pinning by constraints (MSO/MFO) clamps the late dates equal to early dates.
    if (t.constraintType === "MSO" || t.constraintType === "MFO") {
      const start = ES.get(id)!;
      const finish = EF.get(id)!;
      LS.set(id, start);
      LF.set(id, finish);
      continue;
    }

    const finish = candidateFinish;
    const start = addWorkingDays(finish, -t.duration, cal);
    LS.set(id, start);
    LF.set(id, finish);
  }

  return { lateStart: LS, lateFinish: LF };
}

/**
 * Compute totalFloat, freeFloat, critical set.
 * Critical path = chain of critical tasks ordered by earlyStart.
 */
export function floatAndCritical(
  ctx: CpmContext,
  ES: Map<TaskID, Date>,
  EF: Map<TaskID, Date>,
  LS: Map<TaskID, Date>,
  LF: Map<TaskID, Date>
): { totalFloat: Map<TaskID, number>; freeFloat: Map<TaskID, number>; critical: Set<TaskID>; orderedCriticalPath: TaskID[] } {
  const { graph, calendarFor } = ctx;
  const TF = new Map<TaskID, number>();
  const FF = new Map<TaskID, number>();
  const critical = new Set<TaskID>();

  for (const id of graph.ids) {
    const es = ES.get(id);
    const ls = LS.get(id);
    const ef = EF.get(id);
    if (!es || !ls || !ef) continue;
    const cal = calendarFor(id);
    const tf = diffWorkingDays(es, ls, cal);
    TF.set(id, tf);
    if (tf <= 0) critical.add(id);

    const succs = graph.succs.get(id) ?? [];
    if (succs.length === 0) {
      FF.set(id, tf); // leaf: free float == total float
    } else {
      let minSlack = Infinity;
      for (const d of succs) {
        const succES = ES.get(d.succId);
        if (!succES) continue;
        const t = graph.byId.get(id)!;
        const lag = resolveLag(d, t.duration);
        let driven: Date;
        switch (d.type) {
          case "FS":
            driven = addWorkingDays(ef, lag, cal);
            break;
          case "SS":
            driven = addWorkingDays(es, lag, cal);
            break;
          case "FF":
            driven = addWorkingDays(ef, lag - graph.byId.get(d.succId)!.duration, cal);
            break;
          case "SF":
            driven = addWorkingDays(es, lag - graph.byId.get(d.succId)!.duration, cal);
            break;
        }
        const slack = diffWorkingDays(driven, succES, cal);
        if (slack < minSlack) minSlack = slack;
      }
      FF.set(id, Number.isFinite(minSlack) ? Math.max(0, minSlack) : tf);
    }
  }

  // Derive ordered critical path = critical tasks sorted by earlyStart, tie-break by id.
  const ordered = [...critical].sort((a, b) => {
    const ta = ES.get(a)!.getTime();
    const tb = ES.get(b)!.getTime();
    return ta - tb || (a < b ? -1 : 1);
  });

  return { totalFloat: TF, freeFloat: FF, critical, orderedCriticalPath: ordered };
}
