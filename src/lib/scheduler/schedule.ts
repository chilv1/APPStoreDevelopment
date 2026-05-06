/**
 * Public scheduling entry point: `schedule(input) → result`.
 *
 * Pipeline:
 *   1. Validate (basic shape, required constraint dates)
 *   2. Build DAG, detect cycles
 *   3. Topological order (cycles append at end deterministically)
 *   4. Forward pass (earlyStart/earlyFinish, constraints, deadlines)
 *   5. Backward pass (lateStart/lateFinish)
 *   6. Float + critical
 *   7. Summary rollup
 *   8. Assemble TaskResult[] preserving input order
 */

import { backwardPass, CpmContext, floatAndCritical, forwardPass } from "./cpm";
import {
  addWorkingDays, computeFinish, DEFAULT_CALENDAR, diffWorkingDays,
  IndexedCalendar, indexCalendar, startOfDay,
} from "./calendar";
import { buildGraph, detectCycles, topoOrder } from "./graph";
import { rollupSummaries } from "./rollup";
import type {
  Calendar, ScheduleInput, ScheduleResult, ScheduleWarning, TaskID, TaskInput, TaskKind, TaskResult,
} from "./types";

function validate(input: ScheduleInput): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const ids = new Set<TaskID>();
  for (const t of input.tasks) {
    if (ids.has(t.id)) {
      warnings.push({ level: "error", taskId: t.id, code: "DUPLICATE_ID", message: `Duplicate task id: ${t.id}` });
    }
    ids.add(t.id);
    if (t.duration < 0) {
      warnings.push({ level: "error", taskId: t.id, code: "NEGATIVE_DURATION", message: `Task ${t.id} has negative duration` });
    }
    if (
      t.constraintType &&
      ["MSO", "MFO", "SNET", "SNLT", "FNET", "FNLT"].includes(t.constraintType) &&
      !t.constraintDate
    ) {
      warnings.push({
        level: "error", taskId: t.id, code: "MISSING_CONSTRAINT_DATE",
        message: `Task ${t.id} uses constraint ${t.constraintType} without constraintDate`,
      });
    }
  }
  for (const d of input.dependencies) {
    if (!ids.has(d.predId)) {
      warnings.push({ level: "warning", code: "DANGLING_PRED", message: `Dependency references missing predecessor ${d.predId}` });
    }
    if (!ids.has(d.succId)) {
      warnings.push({ level: "warning", code: "DANGLING_SUCC", message: `Dependency references missing successor ${d.succId}` });
    }
    if (d.predId === d.succId) {
      warnings.push({ level: "error", code: "SELF_LOOP", message: `Self-loop on task ${d.predId}` });
    }
  }
  return warnings;
}

function inferKind(t: TaskInput, hasChildren: boolean): TaskKind {
  if (t.type) return t.type;
  if (hasChildren) return "summary";
  if (t.duration === 0) return "milestone";
  return "task";
}

export function schedule(input: ScheduleInput): ScheduleResult {
  const t0 = Date.now();
  const initialWarnings = validate(input);
  const errors = initialWarnings.filter((w) => w.level === "error");

  const calendars: Calendar[] = input.calendars && input.calendars.length > 0 ? input.calendars : [DEFAULT_CALENDAR];
  const indexed = new Map<string, IndexedCalendar>();
  for (const c of calendars) indexed.set(c.id, indexCalendar(c));
  const defaultCalId = input.defaultCalendarId ?? calendars[0].id;
  const calendarFor = (taskId: TaskID): IndexedCalendar => {
    const t = input.tasks.find((x) => x.id === taskId);
    const id = t?.calendarId ?? defaultCalId;
    return indexed.get(id) ?? indexed.get(defaultCalId) ?? indexCalendar(DEFAULT_CALENDAR);
  };

  const graph = buildGraph(input.tasks, input.dependencies);
  const cycles = detectCycles(graph);
  errors.push(...cycles);

  const topo = topoOrder(graph);

  const projectStart = startOfDay(input.projectStart);
  const projectFinish = input.projectFinish ? startOfDay(input.projectFinish) : undefined;

  const ctx: CpmContext = { graph, topo, calendarFor, projectStart, projectFinish };

  const fwd = forwardPass(ctx);
  const bwd = backwardPass(ctx, fwd.earlyStart, fwd.earlyFinish);
  const fc = floatAndCritical(ctx, fwd.earlyStart, fwd.earlyFinish, bwd.lateStart, bwd.lateFinish);
  const rolledUp = rollupSummaries(graph, fwd.earlyStart, fwd.earlyFinish, bwd.lateStart, bwd.lateFinish, fc.totalFloat, fc.freeFloat, calendarFor);

  // Re-evaluate critical for summary tasks (after rollup).
  for (const id of rolledUp) {
    const tf = fc.totalFloat.get(id) ?? 0;
    if (tf <= 0) fc.critical.add(id);
  }

  // Assemble result.
  const tasks: TaskResult[] = input.tasks.map((t) => {
    const hasChildren = (graph.children.get(t.id) ?? []).length > 0;
    const kind = inferKind(t, hasChildren);
    const es = fwd.earlyStart.get(t.id) ?? projectStart;
    const ef = fwd.earlyFinish.get(t.id) ?? es;
    const ls = bwd.lateStart.get(t.id) ?? es;
    const lf = bwd.lateFinish.get(t.id) ?? ef;
    return {
      id: t.id,
      name: t.name,
      type: kind,
      parentId: t.parentId ?? null,
      level: graph.level.get(t.id) ?? 0,
      isSummary: hasChildren,
      rolledUp: rolledUp.has(t.id),
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      start: es,
      finish: ef,
      duration: hasChildren
        ? diffWorkingDays(es, ef, calendarFor(t.id))
        : t.duration,
      totalFloat: fc.totalFloat.get(t.id) ?? 0,
      freeFloat: fc.freeFloat.get(t.id) ?? 0,
      critical: fc.critical.has(t.id),
    };
  });

  // Project span.
  let projFinish = projectStart;
  for (const r of tasks) if (r.finish.getTime() > projFinish.getTime()) projFinish = r.finish;
  const elapsedMs = Date.now() - t0;

  const allWarnings = [
    ...initialWarnings.filter((w) => w.level === "warning"),
    ...fwd.warnings,
  ];

  return {
    tasks,
    criticalPath: fc.orderedCriticalPath,
    warnings: allWarnings,
    errors,
    projectStart,
    projectFinish: projFinish,
    durationDays: diffWorkingDays(projectStart, projFinish, calendarFor(input.tasks[0]?.id ?? "")),
    metrics: {
      taskCount: input.tasks.length,
      dependencyCount: input.dependencies.length,
      elapsedMs,
    },
  };
}

// Re-export helpers callers commonly need.
export { addWorkingDays, computeFinish, DEFAULT_CALENDAR, diffWorkingDays, indexCalendar, startOfDay };
