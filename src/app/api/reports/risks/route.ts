// GET /api/reports/risks
// At-risk stores ranked by risk score + issues breakdown (severity / type counts).
// All authenticated users see this — but only stores within their permission scope.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStoresForUser, riskScore, overdueStores } from "@/lib/queries/reports";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const stores = await getStoresForUser(user);

  // Open issues by store (one query, group by storeId)
  const openIssuesGrouped = await prisma.issue.groupBy({
    by: ["storeId"],
    where: {
      status: { not: "CLOSED" },
      storeId: { in: stores.map((s: any) => s.id) },
    },
    _count: { _all: true },
  });
  const openIssuesByStore: Record<string, number> = {};
  for (const r of openIssuesGrouped) openIssuesByStore[r.storeId] = r._count._all;

  // Risk-rank: filter to score > 0 and sort desc.
  const ranked = stores
    .map((s: any) => {
      const blocked = (s.phases || []).filter((p: any) => p.status === "BLOCKED").length;
      const overdueDays = s.targetOpenDate && s.status !== "COMPLETED"
        ? Math.max(0, Math.floor((Date.now() - new Date(s.targetOpenDate).getTime()) / 86_400_000))
        : 0;
      return {
        store: s,
        score: riskScore(s, openIssuesByStore[s.id] ?? 0, blocked),
        overdueDays,
        openIssues: openIssuesByStore[s.id] ?? 0,
        blockedPhases: blocked,
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  // Issues by severity + type
  const allIssues = await prisma.issue.findMany({
    where: {
      status: { not: "CLOSED" },
      storeId: { in: stores.map((s: any) => s.id) },
    },
    select: { id: true, title: true, severity: true, type: true, storeId: true, createdAt: true },
  });
  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const i of allIssues) {
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    byType[i.type] = (byType[i.type] || 0) + 1;
  }

  // Top 5 most critical issues (by severity rank then date)
  const SEV_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const topIssues = allIssues
    .map((i) => ({ ...i, sevRank: SEV_RANK[i.severity] || 0 }))
    .sort((a, b) => b.sevRank - a.sevRank || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((i) => {
      const s = stores.find((x: any) => x.id === i.storeId) as any;
      return {
        id: i.id,
        title: i.title,
        severity: i.severity,
        type: i.type,
        storeId: i.storeId,
        storeCode: s?.code || "—",
        storeName: s?.name || "—",
      };
    });

  // Counters
  const phasesBlocked = stores.reduce((sum: number, s: any) =>
    sum + (s.phases?.filter((p: any) => p.status === "BLOCKED").length || 0), 0);

  return NextResponse.json({
    summary: {
      totalAtRisk: ranked.length,
      totalOverdue: overdueStores(stores as any).length,
      phasesBlocked,
      openIssuesTotal: allIssues.length,
    },
    bySeverity,
    byType,
    ranked: ranked.slice(0, 30).map((r) => ({
      storeId: r.store.id,
      storeCode: r.store.code,
      storeName: r.store.name,
      branch: (r.store as any).bc?.branch?.name || "—",
      score: r.score,
      overdueDays: r.overdueDays,
      openIssues: r.openIssues,
      blockedPhases: r.blockedPhases,
    })),
    topIssues,
  }, {
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" },
  });
}
