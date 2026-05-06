/**
 * DAG construction, cycle detection, topological order.
 *
 * Algorithms:
 *  - cycle detect: DFS coloring (white/gray/black). O(V+E).
 *  - topo sort:    Kahn's algorithm. O(V+E). Uses zero-indegree queue.
 *
 * Hierarchy edges (parent→children) are NOT considered dependencies for
 * scheduling order — children are scheduled then summary tasks roll up.
 */

import type { Dependency, ScheduleWarning, TaskID, TaskInput } from "./types";

export interface DependencyGraph {
  /** All task ids in input order. */
  ids: TaskID[];
  /** id → predecessor dependencies (incoming). */
  preds: Map<TaskID, Dependency[]>;
  /** id → successor dependencies (outgoing). */
  succs: Map<TaskID, Dependency[]>;
  /** id → child task ids (hierarchy). */
  children: Map<TaskID, TaskID[]>;
  /** id → outline level (root=0). */
  level: Map<TaskID, number>;
  /** id → TaskInput for fast access. */
  byId: Map<TaskID, TaskInput>;
}

export function buildGraph(tasks: TaskInput[], deps: Dependency[]): DependencyGraph {
  const byId = new Map<TaskID, TaskInput>();
  const preds = new Map<TaskID, Dependency[]>();
  const succs = new Map<TaskID, Dependency[]>();
  const children = new Map<TaskID, TaskID[]>();

  for (const t of tasks) {
    byId.set(t.id, t);
    preds.set(t.id, []);
    succs.set(t.id, []);
    children.set(t.id, []);
  }

  for (const d of deps) {
    if (!byId.has(d.predId) || !byId.has(d.succId)) continue; // skip dangling
    preds.get(d.succId)!.push(d);
    succs.get(d.predId)!.push(d);
  }

  for (const t of tasks) {
    if (t.parentId && byId.has(t.parentId)) {
      children.get(t.parentId)!.push(t.id);
    }
  }

  // Compute outline levels (parent depth).
  const level = new Map<TaskID, number>();
  function depth(id: TaskID): number {
    if (level.has(id)) return level.get(id)!;
    const p = byId.get(id)?.parentId;
    const d = p && byId.has(p) ? depth(p) + 1 : 0;
    level.set(id, d);
    return d;
  }
  for (const t of tasks) depth(t.id);

  return { ids: tasks.map((t) => t.id), preds, succs, children, level, byId };
}

/**
 * Detect cycles in the dependency DAG.
 * Returns the list of cycles found (one warning per cycle).
 */
export function detectCycles(g: DependencyGraph): ScheduleWarning[] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<TaskID, number>();
  for (const id of g.ids) color.set(id, WHITE);
  const cycles: ScheduleWarning[] = [];

  function visit(start: TaskID): void {
    // Iterative DFS using explicit stack to avoid recursion limit on big DAGs.
    const stack: { id: TaskID; idx: number }[] = [{ id: start, idx: 0 }];
    const path: TaskID[] = [];
    color.set(start, GRAY);
    path.push(start);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const outs = g.succs.get(top.id) ?? [];
      if (top.idx >= outs.length) {
        color.set(top.id, BLACK);
        stack.pop();
        path.pop();
        continue;
      }
      const next = outs[top.idx++].succId;
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        // Found cycle — extract from path[index_of_next..end] + next.
        const startIdx = path.indexOf(next);
        const cycle = path.slice(startIdx).concat(next);
        cycles.push({
          level: "error",
          code: "CYCLE",
          message: `Circular dependency: ${cycle.join(" → ")}`,
          cycle,
        });
        // Don't recurse further; treat as visited.
        continue;
      }
      if (c === WHITE) {
        color.set(next, GRAY);
        path.push(next);
        stack.push({ id: next, idx: 0 });
      }
    }
  }

  for (const id of g.ids) {
    if (color.get(id) === WHITE) visit(id);
  }
  return cycles;
}

/**
 * Topological order (Kahn's). Returns ids in dependency-respecting order.
 * If the graph contains cycles, the cyclic tasks are appended at the end
 * (so callers can still produce best-effort dates and surface the cycle).
 */
export function topoOrder(g: DependencyGraph): TaskID[] {
  const indeg = new Map<TaskID, number>();
  for (const id of g.ids) indeg.set(id, g.preds.get(id)!.length);

  const queue: TaskID[] = [];
  for (const id of g.ids) if (indeg.get(id) === 0) queue.push(id);

  const out: TaskID[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    out.push(id);
    for (const d of g.succs.get(id) ?? []) {
      const n = (indeg.get(d.succId) ?? 0) - 1;
      indeg.set(d.succId, n);
      if (n === 0) queue.push(d.succId);
    }
  }

  if (out.length < g.ids.length) {
    // Cyclic remainder — append in input order (deterministic).
    for (const id of g.ids) if (!out.includes(id)) out.push(id);
  }
  return out;
}
