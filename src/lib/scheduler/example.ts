/**
 * Example: how to plug the scheduler into the existing telecom-store-manager
 * planning module. NOT part of the engine — illustration + smoke test only.
 *
 * Run:  npx tsx src/lib/scheduler/example.ts
 */

import { schedule } from "./index";

// Simulated input from a single store with 11 phases + sub-tasks under "Construction".
const tasks = [
  // Phase summary tasks
  { id: "P1", name: "Site survey",         duration: 0 },
  { id: "P2", name: "Lease negotiation",   duration: 0 },
  { id: "P3", name: "Permits",             duration: 14 },
  { id: "P4", name: "Design",              duration: 0 }, // summary
  { id: "P4a", name: "Architectural",      duration: 10, parentId: "P4" },
  { id: "P4b", name: "Mechanical/Electrical", duration: 7, parentId: "P4" },
  { id: "P4c", name: "Furniture spec",     duration: 5,  parentId: "P4" },
  { id: "P5", name: "Construction",        duration: 0 }, // summary
  { id: "P5a", name: "Demolition",         duration: 5, parentId: "P5" },
  { id: "P5b", name: "Civil works",        duration: 20, parentId: "P5" },
  { id: "P5c", name: "Finishing",          duration: 12, parentId: "P5" },
  { id: "P6", name: "Equipment install",   duration: 8 },
  { id: "P7", name: "POS + connectivity",  duration: 5 },
  { id: "P8", name: "Staff hiring + training", duration: 21 },
  { id: "P9", name: "Marketing collateral", duration: 7 },
  { id: "P10", name: "Soft launch",         duration: 3 },
  { id: "P11", name: "Grand opening",       duration: 0 }, // milestone
];

// Site survey, lease, permits — initial phases (P1, P2 are 0-duration markers from research)
// Real values would come from PhaseTemplate records.
const tasksWithDur = tasks.map((t) =>
  t.duration === 0 && !t.id.startsWith("P11") && !t.id.startsWith("P4") && !t.id.startsWith("P5")
    ? { ...t, duration: 7 } // give markers a default
    : t
);

const dependencies = [
  { predId: "P1", succId: "P2", type: "FS" as const },
  { predId: "P2", succId: "P3", type: "FS" as const },
  { predId: "P3", succId: "P4a", type: "FS" as const },
  { predId: "P3", succId: "P4b", type: "SS" as const, lag: 3 },
  { predId: "P3", succId: "P4c", type: "FS" as const },
  { predId: "P4", succId: "P5a", type: "FS" as const },
  { predId: "P5a", succId: "P5b", type: "FS" as const },
  { predId: "P5b", succId: "P5c", type: "FS" as const, lag: -3 }, // overlap finishing into civil tail
  { predId: "P5", succId: "P6", type: "FS" as const },
  { predId: "P6", succId: "P7", type: "FS" as const },
  { predId: "P3", succId: "P8", type: "FS" as const, lag: 30 }, // start training 30d after permits
  { predId: "P5", succId: "P9", type: "SS" as const },
  { predId: "P7", succId: "P10", type: "FS" as const },
  { predId: "P8", succId: "P10", type: "FS" as const },
  { predId: "P10", succId: "P11", type: "FS" as const },
];

const result = schedule({
  projectStart: "2026-06-01",
  tasks: tasksWithDur,
  dependencies,
});

console.log("Project span:", result.projectStart.toISOString().slice(0, 10), "→", result.projectFinish.toISOString().slice(0, 10));
console.log("Working-day duration:", result.durationDays);
console.log("Critical path:", result.criticalPath.join(" → "));
console.log("Errors:", result.errors.length, "/ Warnings:", result.warnings.length);
console.log("Engine elapsed:", result.metrics.elapsedMs, "ms");
console.log();
console.log("Tasks:");
console.table(
  result.tasks.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    start: t.start.toISOString().slice(0, 10),
    finish: t.finish.toISOString().slice(0, 10),
    dur: t.duration,
    tf: t.totalFloat,
    crit: t.critical ? "★" : "",
  }))
);
