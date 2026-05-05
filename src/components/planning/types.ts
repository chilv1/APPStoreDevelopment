export type ViewMode = "gantt" | "resource" | "calendar" | "network" | "usage";
export type ZoomMode = "day" | "week" | "month" | "quarter";
export type DepType = "FS" | "SS" | "FF" | "SF";
export type RibbonTab = "task" | "resource" | "project" | "view" | "format";

export interface PlanTask {
  id: string;
  type: "summary" | "task" | "milestone";
  name: string;
  dur: number;             // days
  start: Date | null;
  fin: Date | null;
  pred: string | null;     // phase id of predecessor
  depType: DepType;
  lag: number;             // lag days
  pct: number;             // 0-100
  res: string;             // resource name
  level: number;           // 0=store, 1=phase
  parentId: string | null; // store id for phases
  status: string;
  critical: boolean;
  milestone: boolean;
  expanded: boolean;
  storeId: string;
  baseline: { start: Date; fin: Date } | null;
  // original API ids
  phaseId?: string;        // actual phase id (same as id for phase rows)
}

export interface PlanResource {
  id: string;
  name: string;
  type: string;
  group: string;
  units: string;
  rate: string;
  assignedTasks: number;
  overAllocated: boolean;
}

export interface PlanningState {
  tasks: PlanTask[];
  resources: PlanResource[];
  viewMode: ViewMode;
  zoomMode: ZoomMode;
  selectedId: string | null;
  showCritical: boolean;
  showBaseline: boolean;
  showArrows: boolean;
  detailOpen: boolean;
  ribbonTab: RibbonTab;
  filterStatus: string;
  searchQuery: string;
  calOffset: number;   // months offset for calendar view
  loading: boolean;
  saving: boolean;
  notif: string | null;
}

// Data from API
export interface ApiPhase {
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
  pct: number;
  taskCount: number;
}

export interface ApiStore {
  id: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  targetOpenDate: string | null;
  region: string | null;
  pm: { id: string; name: string } | null;
  branch: string | null;
  phases: ApiPhase[];
}
