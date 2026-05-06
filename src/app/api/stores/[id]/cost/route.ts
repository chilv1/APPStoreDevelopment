/**
 * GET /api/stores/[id]/cost
 *
 * Returns per-phase cost breakdown and store-level rollup:
 *   - fixedCost (Phase.fixedCost)
 *   - workCost = Σ ResourceAssignment.cost
 *   - totalCost = fixedCost + workCost
 *   - actualCost (placeholder = 0 until timesheet × rate cost is wired in P2)
 *
 * Aggregate: totals + EVM hooks (BCWS = totalCost · scheduledFraction;
 * BCWP = totalCost · progressPct; ACWP = actualCost). CPI/SPI computed
 * naively when both bases are non-zero.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MS_PER_DAY = 86_400_000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const phases = await prisma.phase.findMany({
    where: { storeId: id },
    orderBy: { order: "asc" },
    include: {
      assignments: { include: { resource: { select: { name: true, kind: true, standardRate: true } } } },
      tasks: { select: { status: true } },
    },
  });

  const today = Date.now();
  let totalFixed = 0, totalWork = 0, totalCost = 0, totalActual = 0;
  let bcws = 0, bcwp = 0, acwp = 0;

  const rows = phases.map((p) => {
    const fixed = p.fixedCost;
    const work  = p.assignments.reduce((s, a) => s + a.cost, 0);
    const total = fixed + work;
    const taskTotal = p.tasks.length;
    const taskDone  = p.tasks.filter((t) => t.status === "DONE").length;
    const progress  = p.status === "COMPLETED" ? 100
      : taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100)
      : (p as any).progressPct ?? 0;

    let scheduledFraction = 0;
    if (p.plannedStart && p.plannedEnd) {
      const span = p.plannedEnd.getTime() - p.plannedStart.getTime();
      if (span > 0) {
        const elapsed = Math.min(Math.max(today - p.plannedStart.getTime(), 0), span);
        scheduledFraction = elapsed / span;
      } else if (today >= p.plannedEnd.getTime()) scheduledFraction = 1;
    }

    const phBCWS = total * scheduledFraction;
    const phBCWP = total * (progress / 100);
    const actualWork = p.assignments.reduce((s, a) => s + (a.actualWork * (a.resource?.standardRate ?? 0)), 0);
    const phACWP = actualWork; // fixedCost not yet accrued here; refined in Stream 6 P2

    totalFixed += fixed; totalWork += work; totalCost += total; totalActual += phACWP;
    bcws += phBCWS; bcwp += phBCWP; acwp += phACWP;

    return {
      id: p.id, phaseNumber: p.phaseNumber, name: p.name, status: p.status, progressPct: progress,
      fixedCost: fixed, workCost: work, totalCost: total, actualCost: phACWP,
      bcws: phBCWS, bcwp: phBCWP, acwp: phACWP,
      assignments: p.assignments.map((a) => ({
        id: a.id, resourceName: a.resource?.name ?? "—", units: a.units, workHours: a.workHours, cost: a.cost,
      })),
    };
  });

  const cpi = acwp > 0  ? bcwp / acwp : null;
  const spi = bcws > 0  ? bcwp / bcws : null;

  return NextResponse.json({
    rows,
    totals: {
      fixedCost: totalFixed,
      workCost:  totalWork,
      totalCost,
      actualCost: totalActual,
      bcws, bcwp, acwp,
      cpi, spi,
    },
  });
}
