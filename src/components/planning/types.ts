// Shared types for the new Planning UI.

export type View = "wbs" | "gantt" | "resources" | "calendar";

export type ConstraintType = "ASAP" | "ALAP" | "MSO" | "MFO" | "SNET" | "SNLT" | "FNET" | "FNLT" | null;

export interface PlanningPhase {
  id: string;
  order: number;
  phaseNumber: number;
  name: string;
  status: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  dependencyType: string;
  dependsOnId: string | null;
  lagDays: number;
  constraintType: ConstraintType;
  constraintDate: string | null;
  deadline: string | null;
  pct: number;
  progressPct: number;
  taskCount: number;
}

export interface PlanningStore {
  id: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  targetOpenDate: string | null;
  region: string | null;
  pm: { id: string; name: string } | null;
  branch: string | null;
  phases: PlanningPhase[];
}

export interface ScheduleTask {
  id: string;
  name: string;
  type: "task" | "summary" | "milestone";
  parentId: string | null;
  level: number;
  isSummary: boolean;
  rolledUp: boolean;
  earlyStart: string;
  earlyFinish: string;
  lateStart: string;
  lateFinish: string;
  start: string;
  finish: string;
  duration: number;
  totalFloat: number;
  freeFloat: number;
  critical: boolean;
}

export interface ScheduleResp {
  tasks: ScheduleTask[];
  criticalPath: string[];
  warnings: { level: string; code: string; message: string; taskId?: string }[];
  errors:   { level: string; code: string; message: string; taskId?: string }[];
  projectStart: string;
  projectFinish: string;
  durationDays: number;
  metrics: { taskCount: number; dependencyCount: number; elapsedMs: number };
}

export interface DepRow {
  id: string;
  predecessorId: string;
  successorId: string;
  type: "FS" | "SS" | "FF" | "SF";
  lagDays: number;
  lagPercent: number | null;
  hard: boolean;
  notes: string | null;
  predecessor?: { id: string; name: string; phaseNumber: number; order: number };
  successor?: { id: string; name: string; phaseNumber: number; order: number };
}

export interface DepsResp {
  phaseId: string;
  name: string;
  predecessors: DepRow[];
  successors: DepRow[];
}
