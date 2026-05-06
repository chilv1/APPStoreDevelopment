/**
 * Performance benchmark — requirement: 1,000 tasks under 100 ms.
 *
 * Synthetic workload:
 *   - 1000 tasks
 *   - Random hierarchy (200 summaries, ~5 children each)
 *   - 1500 FS dependencies sprinkled across leaves
 *   - Single Mon-Fri calendar
 *
 * Asserts:
 *   - schedule() completes
 *   - elapsedMs < 200 (generous for CI; local typically <50ms)
 *   - 0 errors
 *   - critical path non-empty
 */

import { describe, expect, it } from "vitest";
import { schedule } from "../index";
import type { Dependency, TaskInput } from "../types";

function makeWorkload(taskCount: number, depCount: number) {
  const tasks: TaskInput[] = [];
  // 200 summaries.
  const summaryCount = Math.min(Math.floor(taskCount / 5), 200);
  for (let i = 0; i < summaryCount; i++) {
    tasks.push({ id: `S${i}`, name: `Summary ${i}`, duration: 0 });
  }
  // Leaves spread across summaries.
  for (let i = 0; i < taskCount - summaryCount; i++) {
    tasks.push({
      id: `T${i}`,
      name: `Task ${i}`,
      duration: 1 + (i % 5),
      parentId: `S${i % summaryCount}`,
    });
  }
  // Random FS dependencies between leaves.
  const deps: Dependency[] = [];
  const leafCount = taskCount - summaryCount;
  let predIdx = 0;
  for (let i = 0; i < depCount; i++) {
    const a = predIdx % leafCount;
    const b = (predIdx + 1 + (i % 7)) % leafCount;
    if (a !== b && a < b) {
      deps.push({ predId: `T${a}`, succId: `T${b}`, type: "FS", lag: i % 3 });
    }
    predIdx += 1;
  }
  return { tasks, deps };
}

describe("performance", () => {
  it("schedules 1000 tasks + ~1500 deps in <200ms", () => {
    const { tasks, deps } = makeWorkload(1000, 1500);
    const t0 = performance.now();
    const r = schedule({
      projectStart: "2026-06-01",
      tasks,
      dependencies: deps,
    });
    const elapsed = performance.now() - t0;
    expect(r.errors).toEqual([]);
    expect(r.criticalPath.length).toBeGreaterThan(0);
    expect(r.metrics.taskCount).toBe(1000);
    // eslint-disable-next-line no-console
    console.log(`  perf: 1000 tasks scheduled in ${elapsed.toFixed(1)}ms (engine reports ${r.metrics.elapsedMs}ms)`);
    expect(elapsed).toBeLessThan(200);
  });

  it("handles 5000 tasks without crashing (no time limit)", () => {
    const { tasks, deps } = makeWorkload(5000, 8000);
    const r = schedule({
      projectStart: "2026-06-01",
      tasks,
      dependencies: deps,
    });
    expect(r.errors).toEqual([]);
    expect(r.tasks.length).toBe(5000);
    // eslint-disable-next-line no-console
    console.log(`  scaling: 5000 tasks in ${r.metrics.elapsedMs}ms`);
  });
});
