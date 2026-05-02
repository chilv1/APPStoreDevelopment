// Aggregation helpers for the Reports module. Centralizes the math so each tab's
// API endpoint stays small (just glue prisma → these helpers → JSON response).
//
// All functions accept the raw "stores" array (already permission-filtered upstream
// via getStoresForUser). Aggregations happen in-memory because:
//   1. Dataset is small (Bitel Peru has dozens of stores, not thousands).
//   2. SQLite + Prisma 7 has limited groupBy aggregation power.
//   3. Keeps queries in one place (getStoresForUser) so caching is easier later.
import type { StoreSessionUser } from "./stores";
import { getStoresForUser } from "./stores";

type StoreLike = {
  id: string;
  name: string;
  code: string;
  status: string;
  progress: number;
  budget: number | null;
  targetOpenDate: Date | null;
  actualOpenDate: Date | null;
  createdAt: Date;
  bc?: {
    id: string;
    name: string;
    code: string;
    branch?: { id: string; name: string; code: string };
  } | null;
  phases?: { id: string; phaseNumber: number; status: string; name: string; plannedStart: Date | null; plannedEnd: Date | null; actualStart: Date | null; actualEnd: Date | null }[];
  _count?: { issues: number };
};

// Risk score: emphasizes overdue + critical issues + blocked phases.
// Higher = more attention needed. Used for "Top 5 at risk" tables and risks tab.
export function riskScore(s: StoreLike, openIssuesCount = 0, blockedPhases = 0): number {
  let score = 0;
  if (s.targetOpenDate && s.status !== "COMPLETED") {
    const days = Math.floor((Date.now() - new Date(s.targetOpenDate).getTime()) / 86_400_000);
    if (days > 0) score += days; // 1 point per overdue day
  }
  score += openIssuesCount * 5; // open issues weighted heavily
  score += blockedPhases * 3;
  return score;
}

// Bucket stores by month (YYYY-MM) using a date getter (actualOpenDate or targetOpenDate).
// Returns last `months` months including current → array of { label, count }.
export function bucketByMonth(
  stores: StoreLike[],
  months: number,
  getDate: (s: StoreLike) => Date | null
): { label: string; ymKey: string; count: number }[] {
  const now = new Date();
  const buckets: Record<string, number> = {};
  const labels: { label: string; ymKey: string }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ymKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-PE", { month: "short", year: "2-digit" });
    labels.push({ label, ymKey });
    buckets[ymKey] = 0;
  }

  for (const s of stores) {
    const d = getDate(s);
    if (!d) continue;
    const dt = new Date(d);
    const ymKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets[ymKey] !== undefined) buckets[ymKey] += 1;
  }

  return labels.map((l) => ({ label: l.label, ymKey: l.ymKey, count: buckets[l.ymKey] }));
}

// Status breakdown — counts per StoreProject.status.
export function statusCounts(stores: StoreLike[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of stores) counts[s.status] = (counts[s.status] || 0) + 1;
  return counts;
}

// Total CAPEX across stores (excludes CANCELLED to be conservative — those budgets won't be spent).
export function totalCapex(stores: StoreLike[]): number {
  return stores.reduce((sum, s) => {
    if (s.status === "CANCELLED") return sum;
    return sum + (s.budget || 0);
  }, 0);
}

// Average progress across stores (0-100).
export function avgProgress(stores: StoreLike[]): number {
  if (stores.length === 0) return 0;
  return Math.round(stores.reduce((s, p) => s + p.progress, 0) / stores.length);
}

// Stores opening this month — uses targetOpenDate (planned), counts active stores
// (excludes COMPLETED stores already opened earlier in the month).
export function storesOpeningThisMonth(stores: StoreLike[]): StoreLike[] {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return stores.filter((s) => {
    if (!s.targetOpenDate) return false;
    if (s.status === "COMPLETED" || s.status === "CANCELLED") return false;
    const d = new Date(s.targetOpenDate);
    return d >= startMonth && d <= endMonth;
  });
}

// Stores overdue: targetOpenDate in past AND status != COMPLETED/CANCELLED.
export function overdueStores(stores: StoreLike[]): StoreLike[] {
  const now = new Date();
  return stores.filter((s) => {
    if (!s.targetOpenDate) return false;
    if (s.status === "COMPLETED" || s.status === "CANCELLED") return false;
    return new Date(s.targetOpenDate).getTime() < now.getTime();
  });
}

// Top N stores closest to opening (within next N days).
export function storesClosestToOpening(stores: StoreLike[], days = 30, top = 5): StoreLike[] {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86_400_000);
  return stores
    .filter((s) => {
      if (!s.targetOpenDate) return false;
      if (s.status === "COMPLETED" || s.status === "CANCELLED") return false;
      const d = new Date(s.targetOpenDate);
      return d >= now && d <= horizon;
    })
    .sort((a, b) => new Date(a.targetOpenDate!).getTime() - new Date(b.targetOpenDate!).getTime())
    .slice(0, top);
}

// Group stores by branch ({branchId: stores[]})
export function groupByBranch(stores: StoreLike[]): Record<string, StoreLike[]> {
  const map: Record<string, StoreLike[]> = {};
  for (const s of stores) {
    const key = s.bc?.branch?.id || "_no_branch";
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return map;
}

// Group stores by BC
export function groupByBC(stores: StoreLike[]): Record<string, StoreLike[]> {
  const map: Record<string, StoreLike[]> = {};
  for (const s of stores) {
    const key = s.bc?.id || "_no_bc";
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return map;
}

export { getStoresForUser };
export type { StoreSessionUser };
