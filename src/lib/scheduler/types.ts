/**
 * Scheduling engine type definitions.
 *
 * Pure data shapes — zero dependencies on Prisma, React, or the host app.
 * Designed so this folder can be lifted into its own npm package.
 */

export type TaskID = string;

export type DepType = "FS" | "SS" | "FF" | "SF";

/**
 * MS-Project–compatible constraint types.
 *  ASAP — As Soon As Possible (default; only project start/preds bound it)
 *  ALAP — As Late As Possible (only project finish/succs bound it)
 *  MSO  — Must Start On (hard pin)
 *  MFO  — Must Finish On (hard pin)
 *  SNET — Start No Earlier Than
 *  SNLT — Start No Later Than
 *  FNET — Finish No Earlier Than
 *  FNLT — Finish No Later Than
 */
export type ConstraintType =
  | "ASAP"
  | "ALAP"
  | "MSO"
  | "MFO"
  | "SNET"
  | "SNLT"
  | "FNET"
  | "FNLT";

export type TaskKind = "task" | "summary" | "milestone";

export interface Dependency {
  predId: TaskID;
  succId: TaskID;
  type: DepType;
  /** Lag in working days. Negative = lead. Ignored if `lagPercent` set. */
  lag?: number;
  /** Lag as % of predecessor duration. Overrides `lag` if both supplied. */
  lagPercent?: number;
}

export interface CalendarException {
  /** ISO date "YYYY-MM-DD" */
  date: string;
  /** If false → non-working day. If true → override working hours for that day. */
  isWorking: boolean;
  /** Working hours (only used when isWorking=true and you need a custom day length) */
  hours?: number;
}

export interface Calendar {
  id: string;
  name: string;
  /** Day-of-week (0=Sun..6=Sat) considered working. Default Mon-Fri = [1,2,3,4,5]. */
  workingDays: number[];
  /** Default hours per working day. */
  workingHoursPerDay: number;
  /** Date-specific overrides (holidays, half-days, extra working Saturdays). */
  exceptions?: CalendarException[];
}

export interface TaskInput {
  id: TaskID;
  name: string;
  /** Working-day duration. Milestones must use 0. Summaries are derived (use 0 here). */
  duration: number;
  /** Hierarchy parent. null/undefined = root-level. */
  parentId?: TaskID | null;
  /** task | summary | milestone. Defaults: dur=0 → milestone, has children → summary, else task. */
  type?: TaskKind;
  constraintType?: ConstraintType;
  /** Required when constraintType is one of MSO/MFO/SNET/SNLT/FNET/FNLT. */
  constraintDate?: Date | string;
  /** Soft target — late finish should not exceed this; reported as warning if it does. */
  deadline?: Date | string;
  /** Manually pinned start (overrides ASAP forward pass). Treated like SNET when set without constraint. */
  start?: Date | string;
  /** Optional: actual progress markers. If present, task starts at actualStart. */
  actualStart?: Date | string;
  actualFinish?: Date | string;
  /** 0..100 — used for free-float adjustment near completed tasks (not for slack calc). */
  percentComplete?: number;
  /** Calendar to apply for THIS task. Falls back to project default. */
  calendarId?: string;
  /** Optional priority for downstream leveling (engine itself doesn't use it). */
  priority?: number;
}

export interface ScheduleInput {
  /** Project anchor date. Tasks without explicit start/constraint align to or after this. */
  projectStart: Date | string;
  tasks: TaskInput[];
  dependencies: Dependency[];
  /** Optional list of calendars. If absent, a default Mon-Fri 8h calendar is created. */
  calendars?: Calendar[];
  defaultCalendarId?: string;
  /**
   * START → forward-driven (default; project starts on `projectStart`)
   * FINISH → backward-driven; requires `projectFinish`
   */
  scheduleFrom?: "START" | "FINISH";
  projectFinish?: Date | string;
}

export interface TaskResult {
  id: TaskID;
  name: string;
  type: TaskKind;
  parentId: TaskID | null;
  level: number;
  isSummary: boolean;
  /** True iff dates were derived from children (summary tasks). */
  rolledUp: boolean;

  earlyStart: Date;
  earlyFinish: Date;
  lateStart: Date;
  lateFinish: Date;

  /** The dates the task is actually scheduled on (= earlyStart/Finish under START scheduling). */
  start: Date;
  finish: Date;

  duration: number;

  /** lateFinish - earlyFinish (working days). 0 ⇒ critical. */
  totalFloat: number;
  /** Float available without delaying any successor's earlyStart. */
  freeFloat: number;
  critical: boolean;

  /** Populated if this task's dates violate its constraint or deadline. */
  constraintViolation?: string;
}

export type WarningLevel = "warning" | "error";

export interface ScheduleWarning {
  level: WarningLevel;
  taskId?: TaskID;
  code: string;
  message: string;
  /** For cycle errors: the chain of task ids forming the cycle. */
  cycle?: TaskID[];
}

export interface ScheduleResult {
  tasks: TaskResult[];
  /** Ordered list of task ids on the critical path (longest chain through totalFloat=0 tasks). */
  criticalPath: TaskID[];
  warnings: ScheduleWarning[];
  errors: ScheduleWarning[];
  projectStart: Date;
  projectFinish: Date;
  /** Project duration in working days. */
  durationDays: number;
  metrics: {
    taskCount: number;
    dependencyCount: number;
    elapsedMs: number;
  };
}
