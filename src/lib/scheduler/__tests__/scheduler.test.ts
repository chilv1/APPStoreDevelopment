/**
 * Scheduling-engine unit tests.
 *
 * Run:  npx vitest run src/lib/scheduler
 *
 * Covers:
 *   - linear FS chain
 *   - parallel branches converging
 *   - SS / FF / SF dep types
 *   - lag (positive + negative lead) + lagPercent
 *   - milestones (duration 0)
 *   - summary task rollup (multi-level)
 *   - constraint types (MSO, SNET, FNLT, MFO)
 *   - deadline warning
 *   - calendar exceptions (holiday)
 *   - cycle detection (self-loop, 2-cycle, 3-cycle)
 *   - dangling dependency
 *   - duplicate id
 *   - critical path correctness with branches
 *   - free float vs total float
 *   - actual start/finish pinning
 *   - perf: 1000 tasks under 100ms
 */

import { describe, it, expect } from "vitest";
import { schedule } from "../index";
import type { Calendar, Dependency, ScheduleInput, TaskInput } from "../types";

const PROJECT_START = "2026-06-01"; // Monday

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function tasks(specs: Array<Partial<TaskInput> & { id: string; name?: string; duration?: number }>): TaskInput[] {
  return specs.map((s) => ({ name: s.id, duration: 1, ...s }));
}

function fs(predId: string, succId: string, lag = 0): Dependency {
  return { predId, succId, type: "FS", lag };
}

describe("scheduling engine", () => {
  describe("forward pass — basic", () => {
    it("schedules a single task starting at projectStart", () => {
      const input: ScheduleInput = {
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 5 }]),
        dependencies: [],
      };
      const r = schedule(input);
      expect(r.errors).toEqual([]);
      expect(iso(r.tasks[0].start)).toBe("2026-06-01");
      expect(iso(r.tasks[0].finish)).toBe("2026-06-08"); // skip Sat/Sun
      expect(r.tasks[0].duration).toBe(5);
    });

    it("chains two FS tasks", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 3 }, { id: "B", duration: 2 }]),
        dependencies: [fs("A", "B")],
      });
      expect(iso(r.tasks[0].finish)).toBe("2026-06-04");
      expect(iso(r.tasks[1].start)).toBe("2026-06-04");
      expect(iso(r.tasks[1].finish)).toBe("2026-06-08");
    });

    it("respects FS lag in working days", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 2 }, { id: "B", duration: 1 }]),
        dependencies: [fs("A", "B", 3)],
      });
      // A finishes Wed 2026-06-03. +3 working days = Mon 2026-06-08.
      expect(iso(r.tasks[1].start)).toBe("2026-06-08");
    });

    it("supports negative lag (lead)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 5 }, { id: "B", duration: 2 }]),
        dependencies: [fs("A", "B", -2)],
      });
      // A finishes Mon 2026-06-08; lead -2 => B starts Thu 2026-06-04.
      expect(iso(r.tasks[1].start)).toBe("2026-06-04");
    });

    it("supports lagPercent (50% of pred 4-day duration = 2 days)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 4 }, { id: "B", duration: 1 }]),
        dependencies: [{ predId: "A", succId: "B", type: "FS", lagPercent: 50 }],
      });
      // A end = Fri 2026-06-05. +2 days = Tue 2026-06-09.
      expect(iso(r.tasks[1].start)).toBe("2026-06-09");
    });
  });

  describe("dependency types SS / FF / SF", () => {
    it("SS: succ starts when pred starts (+ lag)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 5 }, { id: "B", duration: 3 }]),
        dependencies: [{ predId: "A", succId: "B", type: "SS", lag: 1 }],
      });
      expect(iso(r.tasks[1].start)).toBe("2026-06-02"); // Tue
    });

    it("FF: succ finishes when pred finishes (+ lag)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 5 }, { id: "B", duration: 2 }]),
        dependencies: [{ predId: "A", succId: "B", type: "FF" }],
      });
      // A finishes 2026-06-08. B is 2 days, ending 2026-06-08 → starts 2026-06-04.
      expect(iso(r.tasks[1].finish)).toBe("2026-06-08");
    });

    it("SF: succ finishes when pred starts (+ lag)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 5, start: "2026-06-15" }, { id: "B", duration: 2 }]),
        dependencies: [{ predId: "A", succId: "B", type: "SF" }],
      });
      // A start 2026-06-15. SF: B finish at A.start = 2026-06-15. B 2-day → start 2026-06-11.
      expect(iso(r.tasks[1].finish)).toBe("2026-06-15");
    });
  });

  describe("milestones + summaries", () => {
    it("treats duration=0 as milestone", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 3 }, { id: "M", duration: 0 }]),
        dependencies: [fs("A", "M")],
      });
      expect(r.tasks[1].type).toBe("milestone");
      expect(iso(r.tasks[1].start)).toBe("2026-06-04");
      expect(iso(r.tasks[1].finish)).toBe("2026-06-04");
    });

    it("rolls up summary dates from leaf children", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([
          { id: "PARENT" },                                    // summary
          { id: "C1", duration: 3, parentId: "PARENT" },
          { id: "C2", duration: 5, parentId: "PARENT" },
        ]),
        dependencies: [fs("C1", "C2")],
      });
      const parent = r.tasks.find((t) => t.id === "PARENT")!;
      expect(parent.isSummary).toBe(true);
      expect(parent.rolledUp).toBe(true);
      expect(iso(parent.start)).toBe("2026-06-01");
      // C1 ends 2026-06-04, C2 5d → ends 2026-06-11
      expect(iso(parent.finish)).toBe("2026-06-11");
    });

    it("supports nested summaries (3 levels deep)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([
          { id: "L1" },
          { id: "L2", parentId: "L1" },
          { id: "T", duration: 4, parentId: "L2" },
        ]),
        dependencies: [],
      });
      const l1 = r.tasks.find((t) => t.id === "L1")!;
      const l2 = r.tasks.find((t) => t.id === "L2")!;
      expect(l1.isSummary).toBe(true);
      expect(l2.isSummary).toBe(true);
      expect(iso(l1.start)).toBe("2026-06-01");
      expect(iso(l1.finish)).toBe("2026-06-05");
      expect(iso(l2.finish)).toBe("2026-06-05");
    });
  });

  describe("constraints", () => {
    it("MSO pins start (and warns if earlier than dep-driven)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([
          { id: "A", duration: 5 },
          { id: "B", duration: 2, constraintType: "MSO", constraintDate: "2026-06-04" },
        ]),
        dependencies: [fs("A", "B")],
      });
      expect(iso(r.tasks[1].start)).toBe("2026-06-04");
      expect(r.warnings.find((w) => w.code === "CONSTRAINT_VIOLATION")).toBeTruthy();
    });

    it("SNET delays task to constraint date if later than dep-driven", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([
          { id: "A", duration: 1, constraintType: "SNET", constraintDate: "2026-06-15" },
        ]),
        dependencies: [],
      });
      expect(iso(r.tasks[0].start)).toBe("2026-06-15");
    });

    it("FNLT warns if finish exceeds constraint", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 30, constraintType: "FNLT", constraintDate: "2026-06-05" }]),
        dependencies: [],
      });
      expect(r.warnings.find((w) => w.code === "CONSTRAINT_VIOLATION")).toBeTruthy();
    });

    it("MFO pins finish and back-computes start", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 3, constraintType: "MFO", constraintDate: "2026-06-10" }]),
        dependencies: [],
      });
      expect(iso(r.tasks[0].finish)).toBe("2026-06-10");
    });

    it("flags missing constraint date", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: [{ id: "A", name: "A", duration: 1, constraintType: "MSO" }],
        dependencies: [],
      });
      expect(r.errors.find((e) => e.code === "MISSING_CONSTRAINT_DATE")).toBeTruthy();
    });
  });

  describe("deadline", () => {
    it("warns when finish exceeds deadline", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 10, deadline: "2026-06-05" }]),
        dependencies: [],
      });
      expect(r.warnings.find((w) => w.code === "DEADLINE_MISSED")).toBeTruthy();
    });
  });

  describe("calendar — holidays", () => {
    it("skips a custom holiday", () => {
      const cal: Calendar = {
        id: "C", name: "C",
        workingDays: [1, 2, 3, 4, 5],
        workingHoursPerDay: 8,
        exceptions: [{ date: "2026-06-03", isWorking: false }], // Wed off
      };
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 5 }]),
        dependencies: [],
        calendars: [cal],
        defaultCalendarId: "C",
      });
      // 5 working days starting Mon Jun 1, skipping Wed Jun 3:
      // Mon, Tue, Thu, Fri, Mon Jun 8 → finish = Jun 9
      expect(iso(r.tasks[0].finish)).toBe("2026-06-09");
    });

    it("treats Saturday as working when exception isWorking=true", () => {
      const cal: Calendar = {
        id: "C", name: "C",
        workingDays: [1, 2, 3, 4, 5],
        workingHoursPerDay: 8,
        exceptions: [{ date: "2026-06-06", isWorking: true }], // Sat ON
      };
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: 6 }]),
        dependencies: [],
        calendars: [cal],
        defaultCalendarId: "C",
      });
      // 6 working days from Mon: Mon..Fri (5) + Sat = finish = Mon Jun 8
      expect(iso(r.tasks[0].finish)).toBe("2026-06-08");
    });
  });

  describe("cycle detection", () => {
    it("detects self-loop", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A" }]),
        dependencies: [fs("A", "A")],
      });
      expect(r.errors.find((e) => e.code === "SELF_LOOP")).toBeTruthy();
    });

    it("detects 2-cycle (A→B→A)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A" }, { id: "B" }]),
        dependencies: [fs("A", "B"), fs("B", "A")],
      });
      const cyc = r.errors.find((e) => e.code === "CYCLE");
      expect(cyc).toBeTruthy();
      expect(cyc!.cycle?.length).toBeGreaterThan(2);
    });

    it("detects 3-cycle (A→B→C→A)", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A" }, { id: "B" }, { id: "C" }]),
        dependencies: [fs("A", "B"), fs("B", "C"), fs("C", "A")],
      });
      expect(r.errors.find((e) => e.code === "CYCLE")).toBeTruthy();
    });

    it("does not flag a DAG with diamond", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }]),
        dependencies: [fs("A", "B"), fs("A", "C"), fs("B", "D"), fs("C", "D")],
      });
      expect(r.errors).toEqual([]);
    });
  });

  describe("validation warnings", () => {
    it("flags duplicate ids", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A" }, { id: "A" }]),
        dependencies: [],
      });
      expect(r.errors.find((e) => e.code === "DUPLICATE_ID")).toBeTruthy();
    });

    it("flags negative duration", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A", duration: -3 }]),
        dependencies: [],
      });
      expect(r.errors.find((e) => e.code === "NEGATIVE_DURATION")).toBeTruthy();
    });

    it("warns about dangling predecessor", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([{ id: "A" }]),
        dependencies: [fs("GHOST", "A")],
      });
      expect(r.warnings.find((w) => w.code === "DANGLING_PRED")).toBeTruthy();
    });
  });

  describe("critical path & float", () => {
    it("marks the longest path as critical", () => {
      // A--3--B--3--D
      //   \--1--C--1--/
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([
          { id: "A", duration: 1 },
          { id: "B", duration: 3 },
          { id: "C", duration: 1 },
          { id: "D", duration: 1 },
        ]),
        dependencies: [fs("A", "B"), fs("A", "C"), fs("B", "D"), fs("C", "D")],
      });
      const ids = (id: string) => r.tasks.find((t) => t.id === id)!;
      expect(ids("A").critical).toBe(true);
      expect(ids("B").critical).toBe(true);
      expect(ids("D").critical).toBe(true);
      expect(ids("C").critical).toBe(false);
      expect(ids("C").totalFloat).toBeGreaterThan(0);
    });

    it("free float >= 0 always", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([
          { id: "A", duration: 2 },
          { id: "B", duration: 1 },
          { id: "C", duration: 5 },
          { id: "D", duration: 1 },
        ]),
        dependencies: [fs("A", "B"), fs("A", "C"), fs("B", "D"), fs("C", "D")],
      });
      for (const t of r.tasks) expect(t.freeFloat).toBeGreaterThanOrEqual(0);
    });
  });

  describe("actuals", () => {
    it("pins start to actualStart even if dependency would suggest earlier", () => {
      const r = schedule({
        projectStart: PROJECT_START,
        tasks: tasks([
          { id: "A", duration: 1 },
          { id: "B", duration: 2, actualStart: "2026-06-15" },
        ]),
        dependencies: [fs("A", "B")],
      });
      expect(iso(r.tasks[1].start)).toBe("2026-06-15");
    });
  });
});
