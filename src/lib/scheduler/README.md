# Scheduling Engine

Standalone TypeScript module implementing the **Critical Path Method (CPM)** with
calendars, constraints, and hierarchy. Zero runtime dependencies — drop the
folder into any TS project.

## Quick start

```ts
import { schedule } from "@/lib/scheduler";

const result = schedule({
  projectStart: "2026-06-01",
  tasks: [
    { id: "A", name: "Site survey",      duration: 5 },
    { id: "B", name: "Permit",           duration: 10 },
    { id: "C", name: "Construction",     duration: 30 },
    { id: "M", name: "Grand opening",    duration: 0  }, // milestone
  ],
  dependencies: [
    { predId: "A", succId: "B", type: "FS" },
    { predId: "B", succId: "C", type: "FS", lag: 2 },
    { predId: "C", succId: "M", type: "FS" },
  ],
});

console.log(result.criticalPath);              // ["A", "B", "C", "M"]
console.log(result.tasks[2].finish);           // Date the construction finishes
console.log(result.warnings, result.errors);   // [], []
```

## API surface

| Export | Purpose |
| --- | --- |
| `schedule(input)` | Run the full pipeline. Returns `ScheduleResult`. |
| `buildGraph`, `detectCycles`, `topoOrder` | Lower-level graph helpers. |
| `forwardPass`, `backwardPass`, `floatAndCritical` | Run individual CPM stages. |
| `addWorkingDays`, `diffWorkingDays`, `computeFinish`, `indexCalendar` | Working-time arithmetic. |
| `DEFAULT_CALENDAR` | Mon–Fri 8h calendar used when none supplied. |

## Inputs

`ScheduleInput`:

- `projectStart` — anchor date (ISO string or Date).
- `tasks: TaskInput[]`
  - `id`, `name`, `duration` (working days)
  - `parentId` for hierarchy (summary tasks roll up automatically)
  - `type: "task" | "summary" | "milestone"` (inferred from duration/children if omitted)
  - `constraintType` + `constraintDate` (`MSO`, `MFO`, `SNET`, `SNLT`, `FNET`, `FNLT`, plus `ASAP` / `ALAP`)
  - `deadline` — soft target; engine emits a warning if missed
  - `actualStart`, `actualFinish` — pin the task to actual progress
  - `calendarId` — per-task calendar override
- `dependencies: Dependency[]`
  - `predId`, `succId`, `type: "FS" | "SS" | "FF" | "SF"`
  - `lag` in working days (negative = lead)
  - `lagPercent` overrides `lag` when present
- `calendars` — list of `Calendar` definitions with `workingDays`, `workingHoursPerDay`, `exceptions`.

## Outputs

`ScheduleResult`:

- `tasks: TaskResult[]` — preserves input order
  - `start`, `finish`, `earlyStart`, `earlyFinish`, `lateStart`, `lateFinish`
  - `duration`, `totalFloat`, `freeFloat`, `critical`
  - `level`, `isSummary`, `rolledUp`, `parentId`
- `criticalPath: TaskID[]` — ordered chain of critical tasks
- `warnings`, `errors` — `{ level, code, message, taskId?, cycle? }`
- `projectStart`, `projectFinish`, `durationDays`
- `metrics: { taskCount, dependencyCount, elapsedMs }`

## Algorithms

| Stage | Algorithm | Complexity |
| --- | --- | --- |
| Build graph | Single pass | O(V + E) |
| Cycle detection | Iterative DFS coloring | O(V + E) |
| Topological order | Kahn's | O(V + E) |
| Forward pass | Walk topo order | O(V + E + D) where D = working-day arithmetic |
| Backward pass | Walk reverse topo | O(V + E + D) |
| Critical path | slack derivation | O(V + E) |
| Summary rollup | Deepest-first | O(S × max children) |

## Performance

Synthetic benchmark (`__tests__/perf.test.ts`):

- **1,000 tasks + 1,500 deps** → ~170 ms
- **5,000 tasks + 8,000 deps** → ~1.9 s

Bottleneck is per-day calendar arithmetic. To optimize further, precompute a
working-day prefix sum across the project span.

## Constraint types

| Code | Behavior |
| --- | --- |
| `ASAP` | Default. Earliest start permitted by predecessors + project start. |
| `ALAP` | Latest start permitted by successors + project finish (use with `scheduleFrom: "FINISH"`). |
| `MSO`  | Hard pin: start = constraintDate. |
| `MFO`  | Hard pin: finish = constraintDate. |
| `SNET` | Start ≥ constraintDate. |
| `SNLT` | Start ≤ constraintDate. (Warning if violated.) |
| `FNET` | Finish ≥ constraintDate. |
| `FNLT` | Finish ≤ constraintDate. (Warning if violated.) |

## Warnings & errors

Errors block scheduling correctness:

- `CYCLE` — circular dependency. Engine produces best-effort dates anyway.
- `SELF_LOOP`, `DUPLICATE_ID`, `NEGATIVE_DURATION`, `MISSING_CONSTRAINT_DATE`.

Warnings are non-blocking diagnostics:

- `CONSTRAINT_VIOLATION` — constraint fights dependency-driven schedule.
- `DEADLINE_MISSED` — finish exceeds the soft deadline.
- `DANGLING_PRED` / `DANGLING_SUCC` — dependency references a missing task.

## Tests

```bash
npm test                                     # full suite
npx vitest run src/lib/scheduler             # only scheduler
npx vitest run src/lib/scheduler --reporter=verbose
```

Coverage includes: linear FS chains, multi-pred convergence, every dep type
(FS/SS/FF/SF), positive/negative lag, lagPercent, milestones, nested summaries,
each constraint type, deadline detection, calendar exceptions (holidays + extra
working Saturdays), self-loops, 2-cycles, 3-cycles, dangling deps, duplicate
ids, negative durations, critical-path correctness, free vs total float,
actual-date pinning, and the 1k-task perf budget.
