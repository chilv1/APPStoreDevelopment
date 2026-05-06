/**
 * GET /api/portfolio
 *
 * Cross-store dashboard data:
 *   - kpis: totalStores, byStatus counts, openRiskCount, lateStores
 *   - milestones: per-store next-3 phases due (anchor for cross-portfolio Gantt)
 *   - capacity: per-region utilization (active task count)
 *
 * Role-scoped via existing buildStoresWhere.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildStoresWhere } from "@/lib/queries/stores";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const where = buildStoresWhere(user);

  const stores = await prisma.storeProject.findMany({
    where,
    include: {
      pm: { select: { id: true, name: true } },
      bc: { include: { branch: { select: { id: true, name: true, code: true } } } },
      phases: {
        orderBy: { order: "asc" },
        select: {
          id: true, phaseNumber: true, name: true, status: true,
          plannedStart: true, plannedEnd: true, deadline: true,
          tasks: { select: { status: true } },
        },
      },
      _count: { select: { issues: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const today = Date.now();
  const byStatus: Record<string, number> = { PLANNING: 0, IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0, CANCELLED: 0 };
  const byRegion: Record<string, { region: string; total: number; active: number; late: number; risks: number }> = {};
  let lateCount = 0;
  const milestones: any[] = [];

  for (const s of stores) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    const region = s.region ?? "—";
    if (!byRegion[region]) byRegion[region] = { region, total: 0, active: 0, late: 0, risks: 0 };
    byRegion[region].total++;
    if (s.status === "IN_PROGRESS" || s.status === "PLANNING") byRegion[region].active++;
    byRegion[region].risks += s._count.issues;

    const isLate = s.targetOpenDate && s.targetOpenDate.getTime() < today && s.status !== "COMPLETED";
    if (isLate) { lateCount++; byRegion[region].late++; }

    // Pick the next 3 not-yet-completed phases for the milestones lane.
    const upcoming = s.phases
      .filter((p) => p.status !== "COMPLETED" && p.plannedEnd && p.plannedEnd.getTime() > today - 7 * 86_400_000)
      .slice(0, 3);
    for (const p of upcoming) {
      milestones.push({
        storeId: s.id, storeCode: s.code, storeName: s.name, region: s.region,
        phaseId: p.id, phaseNumber: p.phaseNumber, phaseName: p.name, phaseStatus: p.status,
        plannedStart: p.plannedStart, plannedEnd: p.plannedEnd, deadline: p.deadline,
      });
    }
  }
  milestones.sort((a, b) => {
    const ta = a.plannedEnd ? new Date(a.plannedEnd).getTime() : Infinity;
    const tb = b.plannedEnd ? new Date(b.plannedEnd).getTime() : Infinity;
    return ta - tb;
  });

  return NextResponse.json({
    kpis: {
      totalStores: stores.length,
      byStatus,
      lateCount,
      avgProgress: stores.length > 0 ? Math.round(stores.reduce((s, x) => s + x.progress, 0) / stores.length) : 0,
    },
    milestones: milestones.slice(0, 50),
    capacity: Object.values(byRegion).sort((a, b) => b.total - a.total),
    stores: stores.map((s) => ({
      id: s.id, code: s.code, name: s.name, status: s.status, progress: s.progress,
      region: s.region, branch: s.bc?.branch?.name ?? null, pmName: s.pm?.name ?? null,
      targetOpenDate: s.targetOpenDate, openIssues: s._count.issues,
    })),
  });
}
