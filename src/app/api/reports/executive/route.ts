// GET /api/reports/executive
// Aggregated metrics for the Reports → Executive tab (HQ-level overview).
// Permission: ADMIN only. Other roles get 403.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getStoresForUser,
  riskScore,
  statusCounts,
  totalCapex,
  avgProgress,
  storesOpeningThisMonth,
  overdueStores,
  storesClosestToOpening,
  groupByBranch,
  bucketByMonth,
} from "@/lib/queries/reports";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Executive view requires Admin role" }, { status: 403 });
  }

  // Admins see all stores. getStoresForUser({role:"ADMIN"}) returns no filter.
  const stores = await getStoresForUser(user);
  const totalBranches = await prisma.branch.count();
  const totalBCs = await prisma.businessCenter.count();

  // Issue counts (open) — needed for risk score
  const openIssuesByStore: Record<string, number> = {};
  const openIssues = await prisma.issue.groupBy({
    by: ["storeId"],
    where: { status: { not: "CLOSED" } },
    _count: { _all: true },
  });
  for (const r of openIssues) openIssuesByStore[r.storeId] = r._count._all;

  // Top 5 risks: rank by riskScore
  const ranked = stores
    .map((s: any) => {
      const blocked = (s.phases || []).filter((p: any) => p.status === "BLOCKED").length;
      return { store: s, score: riskScore(s, openIssuesByStore[s.id] ?? 0, blocked) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Top 5 closest to opening (next 30 days)
  const closest = storesClosestToOpening(stores as any, 30, 5);

  // Top branches by avg progress
  const byBranch = groupByBranch(stores as any);
  const branchStats = Object.entries(byBranch).map(([id, list]) => {
    const branch = (list[0] as any).bc?.branch;
    return {
      branchId: id,
      name: branch?.name || "Sin sucursal",
      code: branch?.code || "—",
      total: list.length,
      avgProgress: Math.round(list.reduce((s, p) => s + p.progress, 0) / list.length),
    };
  })
    .filter((b) => b.branchId !== "_no_branch")
    .sort((a, b) => b.avgProgress - a.avgProgress)
    .slice(0, 8);

  // Openings per month (last 12 months) — uses ACTUAL open date for completed stores
  const openings = bucketByMonth(stores as any, 12, (s) => s.actualOpenDate);

  // Cumulative openings curve (for line chart "trend over time")
  let cum = 0;
  const cumulative = openings.map((o) => ({ ...o, cum: (cum += o.count) }));

  return NextResponse.json({
    kpis: {
      totalStores: stores.length,
      inProgress: statusCounts(stores as any).IN_PROGRESS || 0,
      completed: statusCounts(stores as any).COMPLETED || 0,
      onHold: statusCounts(stores as any).ON_HOLD || 0,
      overdue: overdueStores(stores as any).length,
      openingThisMonth: storesOpeningThisMonth(stores as any).length,
      totalCapex: totalCapex(stores as any),
      avgProgress: avgProgress(stores as any),
      totalBranches,
      totalBCs,
    },
    statusBreakdown: statusCounts(stores as any),
    branchStats,
    openings,           // monthly buckets
    cumulative,         // running total for line chart
    topRisk: ranked.map((r) => ({
      id: r.store.id,
      name: r.store.name,
      code: r.store.code,
      branch: (r.store as any).bc?.branch?.name || "—",
      score: r.score,
      overdueDays: r.store.targetOpenDate && r.store.status !== "COMPLETED"
        ? Math.max(0, Math.floor((Date.now() - new Date(r.store.targetOpenDate).getTime()) / 86_400_000))
        : 0,
      openIssues: openIssuesByStore[r.store.id] ?? 0,
    })),
    closestOpening: closest.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      branch: s.bc?.branch?.name || "—",
      targetOpenDate: s.targetOpenDate,
      progress: s.progress,
      daysToOpen: s.targetOpenDate
        ? Math.ceil((new Date(s.targetOpenDate).getTime() - Date.now()) / 86_400_000)
        : null,
    })),
  }, {
    // Cache for 60s — exec dashboard updated periodically, no need for instant refresh
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}
