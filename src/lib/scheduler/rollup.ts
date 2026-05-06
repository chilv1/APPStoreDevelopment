/**
 * Summary-task rollup.
 *
 * After leaf tasks have been scheduled (forward+backward), each summary task
 * inherits:
 *   start  = min(child.start)
 *   finish = max(child.finish)
 *   duration = working-day distance from start to finish
 *
 * Total float of a summary = lateFinish (= finish, since summary is bounded by latest child)
 * minus earlyFinish — typically 0.
 *
 * Rollup walks summaries deepest-first so nested summaries compute correctly.
 */

import { diffWorkingDays, IndexedCalendar } from "./calendar";
import type { DependencyGraph } from "./graph";
import type { TaskID } from "./types";

export function rollupSummaries(
  graph: DependencyGraph,
  ES: Map<TaskID, Date>,
  EF: Map<TaskID, Date>,
  LS: Map<TaskID, Date>,
  LF: Map<TaskID, Date>,
  TF: Map<TaskID, number>,
  FF: Map<TaskID, number>,
  calendarFor: (id: TaskID) => IndexedCalendar
): Set<TaskID> {
  // Collect summaries; sort by depth descending.
  const summaries: TaskID[] = [];
  for (const id of graph.ids) {
    if ((graph.children.get(id) ?? []).length > 0) summaries.push(id);
  }
  summaries.sort((a, b) => (graph.level.get(b) ?? 0) - (graph.level.get(a) ?? 0));

  const rolledUp = new Set<TaskID>();
  for (const sid of summaries) {
    const kids = graph.children.get(sid) ?? [];
    if (kids.length === 0) continue;
    let minES = Infinity, maxEF = -Infinity, minLS = Infinity, maxLF = -Infinity;
    for (const k of kids) {
      const es = ES.get(k); const ef = EF.get(k); const ls = LS.get(k); const lf = LF.get(k);
      if (!es || !ef || !ls || !lf) continue;
      if (es.getTime() < minES) minES = es.getTime();
      if (ef.getTime() > maxEF) maxEF = ef.getTime();
      if (ls.getTime() < minLS) minLS = ls.getTime();
      if (lf.getTime() > maxLF) maxLF = lf.getTime();
    }
    if (!Number.isFinite(minES)) continue;
    const cal = calendarFor(sid);
    const startD = new Date(minES), finishD = new Date(maxEF);
    const lStartD = new Date(minLS), lFinishD = new Date(maxLF);
    ES.set(sid, startD);
    EF.set(sid, finishD);
    LS.set(sid, lStartD);
    LF.set(sid, lFinishD);
    TF.set(sid, diffWorkingDays(startD, lStartD, cal));
    FF.set(sid, 0);
    rolledUp.add(sid);
  }
  return rolledUp;
}
