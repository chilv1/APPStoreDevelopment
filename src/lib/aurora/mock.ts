/**
 * Aurora PM — Mock data layer
 * All data is in-memory. No DB calls. Vietnamese telecom flavor.
 */

export type ProjectStatus = "PLANNING" | "ACTIVE" | "AT_RISK" | "COMPLETED" | "ON_HOLD";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Project {
  id: string;
  code: string;
  name: string;
  region: string;
  pm: string;
  status: ProjectStatus;
  progress: number;
  start: string;
  end: string;
  budget: number;
  spent: number;
  health: "GREEN" | "AMBER" | "RED";
}

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  wbs: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  start: string;
  end: string;
  duration: number;
  progress: number;
  dependencies: string[];
}

export interface Resource {
  id: string;
  name: string;
  role: string;
  region: string;
  capacityHours: number;
  costRate: number;
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  date: string;
  hours: number;
  notes: string;
}

export interface KPI {
  id: string;
  label: string;
  value: string;
  delta: number;
  trend: number[];
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: "Portfolio" | "Resource" | "Financial";
  kpis: { label: string; value: string }[];
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    code: "AUR-001",
    name: "Cua hang Viettel tai Quan 1",
    region: "Ho Chi Minh",
    pm: "Nguyen Van An",
    status: "ACTIVE",
    progress: 64,
    start: "2026-02-01",
    end: "2026-07-15",
    budget: 1_800_000_000,
    spent: 1_120_000_000,
    health: "GREEN",
  },
  {
    id: "p2",
    code: "AUR-002",
    name: "Cua hang Mobifone tai Cau Giay",
    region: "Ha Noi",
    pm: "Tran Thi Bich",
    status: "AT_RISK",
    progress: 38,
    start: "2026-01-15",
    end: "2026-06-30",
    budget: 1_400_000_000,
    spent: 920_000_000,
    health: "AMBER",
  },
  {
    id: "p3",
    code: "AUR-003",
    name: "Cua hang Vinaphone tai Da Nang",
    region: "Da Nang",
    pm: "Le Hoang Phuc",
    status: "PLANNING",
    progress: 12,
    start: "2026-04-01",
    end: "2026-09-15",
    budget: 1_650_000_000,
    spent: 180_000_000,
    health: "GREEN",
  },
  {
    id: "p4",
    code: "AUR-004",
    name: "Cua hang Viettel tai Hai Phong",
    region: "Hai Phong",
    pm: "Pham Quoc Cuong",
    status: "COMPLETED",
    progress: 100,
    start: "2025-09-01",
    end: "2026-02-28",
    budget: 1_500_000_000,
    spent: 1_485_000_000,
    health: "GREEN",
  },
  {
    id: "p5",
    code: "AUR-005",
    name: "Cua hang Mobifone tai Can Tho",
    region: "Can Tho",
    pm: "Vo Thi Mai",
    status: "ON_HOLD",
    progress: 22,
    start: "2026-03-10",
    end: "2026-08-20",
    budget: 1_350_000_000,
    spent: 290_000_000,
    health: "RED",
  },
];

const TASK_TEMPLATES: { title: string; sub: string[] }[] = [
  {
    title: "Khao sat mat bang",
    sub: ["Do dac dien tich", "Chup hinh hien trang", "Lap so do"],
  },
  {
    title: "Thiet ke noi that",
    sub: ["Concept thiet ke", "Ban ve 2D", "Render 3D"],
  },
  {
    title: "Xin giay phep",
    sub: ["Don xin phep xay dung", "Phong chay chua chay", "An toan dien"],
  },
  {
    title: "Thi cong",
    sub: ["Xay dung tho", "Hoan thien noi that", "Lap dat thiet bi"],
  },
  {
    title: "Khai truong",
    sub: ["Marketing pre-launch", "Le khai truong", "Bao cao van hanh"],
  },
];

function buildTasksForProject(projectId: string, baseIdx: number): Task[] {
  const out: Task[] = [];
  let counter = 0;
  TASK_TEMPLATES.forEach((tmpl, ti) => {
    const parentId = `${projectId}-t${ti}`;
    const wbsBase = `${ti + 1}`;
    out.push({
      id: parentId,
      projectId,
      parentId: null,
      wbs: wbsBase,
      title: tmpl.title,
      status: ti < 2 ? "DONE" : ti === 2 ? "IN_PROGRESS" : "TODO",
      priority: ti === 2 ? "HIGH" : "MEDIUM",
      assigneeId: `r${(baseIdx + ti) % 12 + 1}`,
      start: `2026-0${(ti % 6) + 2}-01`,
      end: `2026-0${(ti % 6) + 2}-20`,
      duration: 20,
      progress: ti < 2 ? 100 : ti === 2 ? 55 : 0,
      dependencies: ti > 0 ? [`${projectId}-t${ti - 1}`] : [],
    });
    tmpl.sub.forEach((subTitle, si) => {
      counter++;
      out.push({
        id: `${projectId}-t${ti}-s${si}`,
        projectId,
        parentId,
        wbs: `${wbsBase}.${si + 1}`,
        title: subTitle,
        status: ti < 2 ? "DONE" : ti === 2 && si === 0 ? "IN_PROGRESS" : "TODO",
        priority: si === 0 ? "HIGH" : "MEDIUM",
        assigneeId: `r${(baseIdx + counter) % 12 + 1}`,
        start: `2026-0${(ti % 6) + 2}-${String(si * 5 + 1).padStart(2, "0")}`,
        end: `2026-0${(ti % 6) + 2}-${String(si * 5 + 5).padStart(2, "0")}`,
        duration: 5,
        progress: ti < 2 ? 100 : ti === 2 && si === 0 ? 60 : 0,
        dependencies: si > 0 ? [`${projectId}-t${ti}-s${si - 1}`] : [],
      });
    });
  });
  return out;
}

// Build tasks across projects, capped near 50
const _allTasks: Task[] = [];
MOCK_PROJECTS.slice(0, 3).forEach((p, idx) => {
  _allTasks.push(...buildTasksForProject(p.id, idx * 5));
});
// Fill out to ~50 with project p4/p5 summary tasks
MOCK_PROJECTS.slice(3).forEach((p, idx) => {
  for (let i = 0; i < 4; i++) {
    _allTasks.push({
      id: `${p.id}-t${i}`,
      projectId: p.id,
      parentId: null,
      wbs: `${i + 1}`,
      title: TASK_TEMPLATES[i].title,
      status: p.status === "COMPLETED" ? "DONE" : "TODO",
      priority: "MEDIUM",
      assigneeId: `r${(idx + i) % 12 + 1}`,
      start: p.start,
      end: p.end,
      duration: 30,
      progress: p.status === "COMPLETED" ? 100 : 0,
      dependencies: i > 0 ? [`${p.id}-t${i - 1}`] : [],
    });
  }
});

export const MOCK_TASKS: Task[] = _allTasks.slice(0, 50);

export const MOCK_RESOURCES: Resource[] = [
  { id: "r1", name: "Nguyen Van An", role: "Project Manager", region: "Ho Chi Minh", capacityHours: 40, costRate: 850_000 },
  { id: "r2", name: "Tran Thi Bich", role: "Project Manager", region: "Ha Noi", capacityHours: 40, costRate: 850_000 },
  { id: "r3", name: "Le Hoang Phuc", role: "Site Engineer", region: "Da Nang", capacityHours: 40, costRate: 620_000 },
  { id: "r4", name: "Pham Quoc Cuong", role: "Site Engineer", region: "Hai Phong", capacityHours: 40, costRate: 620_000 },
  { id: "r5", name: "Vo Thi Mai", role: "Designer", region: "Can Tho", capacityHours: 40, costRate: 580_000 },
  { id: "r6", name: "Hoang Minh Tu", role: "Designer", region: "Ho Chi Minh", capacityHours: 40, costRate: 580_000 },
  { id: "r7", name: "Dang Thanh Hai", role: "Surveyor", region: "Ha Noi", capacityHours: 40, costRate: 480_000 },
  { id: "r8", name: "Bui Khanh Linh", role: "Surveyor", region: "Da Nang", capacityHours: 40, costRate: 480_000 },
  { id: "r9", name: "Do Tien Dat", role: "Construction Lead", region: "Ho Chi Minh", capacityHours: 40, costRate: 720_000 },
  { id: "r10", name: "Nguyen Thi Lan", role: "Procurement", region: "Ha Noi", capacityHours: 40, costRate: 540_000 },
  { id: "r11", name: "Vu Hong Quan", role: "QA", region: "Hai Phong", capacityHours: 40, costRate: 540_000 },
  { id: "r12", name: "Ly Bao Tram", role: "Marketing", region: "Ho Chi Minh", capacityHours: 40, costRate: 600_000 },
];

const _tsTasks = ["Khao sat mat bang", "Thiet ke noi that", "Xin giay phep", "Thi cong", "Bao cao tien do"];
export const MOCK_TIMESHEET: TimesheetEntry[] = (() => {
  const out: TimesheetEntry[] = [];
  const baseDate = new Date("2026-05-04"); // Mon
  for (let d = 0; d < 7; d++) {
    for (let t = 0; t < 5; t++) {
      const dt = new Date(baseDate);
      dt.setDate(baseDate.getDate() + d);
      out.push({
        id: `ts-${d}-${t}`,
        userId: "r1",
        taskId: `p1-t${t}`,
        taskTitle: _tsTasks[t],
        date: dt.toISOString().slice(0, 10),
        hours: t === 4 ? 1 : 2,
        notes: d === 5 || d === 6 ? "Cuoi tuan" : "",
      });
    }
  }
  return out;
})();

export const MOCK_KPIS: KPI[] = [
  { id: "k1", label: "Du an dang chay", value: "5", delta: 1, trend: [3, 3, 4, 4, 5, 5] },
  { id: "k2", label: "Tien do trung binh", value: "47%", delta: 6, trend: [30, 33, 38, 41, 44, 47] },
  { id: "k3", label: "Ngan sach da chi", value: "4.0 ty VND", delta: -3, trend: [4.5, 4.4, 4.3, 4.2, 4.1, 4.0] },
  { id: "k4", label: "Risk mo", value: "8", delta: -2, trend: [10, 11, 10, 9, 9, 8] },
];

export const MOCK_REPORTS: Report[] = [
  {
    id: "rep1",
    title: "Tong quan danh muc",
    description: "Hieu suat 5 du an dang trien khai theo vung",
    category: "Portfolio",
    kpis: [
      { label: "Hoan thanh", value: "1/5" },
      { label: "Health Green", value: "3" },
      { label: "Health Red", value: "1" },
    ],
  },
  {
    id: "rep2",
    title: "Phan bo nguon luc",
    description: "Utilization theo nhom va theo vung 4 tuan toi",
    category: "Resource",
    kpis: [
      { label: "Util TB", value: "82%" },
      { label: "Over-allocation", value: "2" },
      { label: "Resource avail", value: "12" },
    ],
  },
  {
    id: "rep3",
    title: "Bao cao tai chinh",
    description: "Ngan sach va chi phi thuc te tat ca du an",
    category: "Financial",
    kpis: [
      { label: "Budget", value: "7.7 ty" },
      { label: "Spent", value: "4.0 ty" },
      { label: "Variance", value: "+3.2%" },
    ],
  },
];

export function getProject(id: string): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.id === id);
}

export function getTasksForProject(projectId: string): Task[] {
  return MOCK_TASKS.filter((t) => t.projectId === projectId);
}
