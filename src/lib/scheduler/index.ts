/**
 * Public API surface of the scheduling engine.
 *
 * Usage:
 *   import { schedule } from "@/lib/scheduler";
 *   const result = schedule({ projectStart: "2026-06-01", tasks, dependencies });
 *   console.log(result.tasks, result.criticalPath, result.warnings);
 *
 * Independent — has no runtime imports outside this folder.
 */

export * from "./types";
export {
  schedule,
  addWorkingDays,
  computeFinish,
  DEFAULT_CALENDAR,
  diffWorkingDays,
  indexCalendar,
  startOfDay,
} from "./schedule";
export { buildGraph, detectCycles, topoOrder } from "./graph";
export { forwardPass, backwardPass, floatAndCritical } from "./cpm";
export { rollupSummaries } from "./rollup";
