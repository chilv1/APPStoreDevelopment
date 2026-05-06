/**
 * GET /api/stores/[id]/cost/trend
 *
 * Stream 6 P3 — EVM time series.
 *
 * For every working week between project start and projectFinish (or today,
 * whichever is later), compute:
 *   BCWS(t) = Σ phase.totalCost × scheduledFractionAt(t)
 *   BCWP(t) = Σ phase.totalCost × progressAt(t) — rough: 100% if phase.plannedEnd ≤ t else 0
 *   ACWP(t) = Σ approvedTimeEntries up to t × resource.standardRate + fixedCost accrued
 *
 * Returns { points: [{ date, bcws, bcwp, acwp }, ...] }.
 * Smoothed weekly to keep payload manageable.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MS_PER_DAY = 86_400_000;
const WEEK_MS = 7 * MS_PER_DAY;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const phases = await prisma.phase.findMany({
    where: { storeId: id },
    select: {
      id: true, plannedStart: true, plannedEnd: true,
      fixedCost: true, fixedCostAccrual: true, status: true,
      assignments: { select: { workHours: true, cost: true, actualWork: true, resource: { select: { standardRate: true } } } },
    },
  });
  if (phases.length === 0) return NextResponse.json({ points: [] });

  const minStart = phases.reduce<number | null>((acc, p) => p.plannedStart ? (acc === null ? p.plannedStart.getTime() : Math.min(acc, p.plannedStart.getTime())) : acc, null);
  const maxEnd   = phases.reduce<number | null>((acc, p) => p.plannedEnd   ? (acc === null ? p.plannedEnd.getTime()   : Math.max(acc, p.plannedEnd.getTime()))   : acc, null);
  if (minStart === null || maxEnd === null) return NextResponse.json({ points: [] });

  const start = minStart;
  const end = Math.max(maxEnd, Date.now());
  // Get approved time entries for actual cost timeseries.
  const approved = await prisma.timeEntry.findMany({
    where: { phase: { storeId: id }, status: "APPROVED", phaseId: { in: phases.map((p) => p.id) } },
    select: { date: true, hours: true, phaseId: true, userId: true },
    orderBy: { date: "asc" },
  });

  // Index resource rate by user (best-effort: pick first matching resource).
  const userIds = [...new Set(approved.map((e) => e.userId))];
  const resourcesByUser = await prisma.resource.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, standardRate: true },
  });
  const rateByUser = new Map(resourcesByUser.map((r) => [r.userId!, r.standardRate]));

  const points: { date: string; bcws: number; bcwp: number; acwp: number }[] = [];
  for (let t = start; t <= end; t += WEEK_MS) {
    let bcws = 0, bcwp = 0, acwp = 0;
    for (const p of phases) {
      const total = p.fixedCost + p.assignments.reduce((s, a) => s + a.cost, 0);
      const ps = p.plannedStart?.getTime() ?? null;
      const pe = p.plannedEnd?.getTime() ?? null;
      if (ps === null || pe === null) continue;

      // Scheduled fraction at time t.
      let frac = 0;
      if (t >= pe) frac = 1;
      else if (t > ps) {
        const span = pe - ps;
        if (span > 0) frac = (t - ps) / span;
      }
      bcws += total * frac;

      // Earned: simple — 100% if past plannedEnd OR phase complete, else 0.
      // (Refined version would use phase.progressPct at time t — but we
      // don't store progress over time yet. For v1 we treat the schedule's
      // own dates as the proxy.)
      if (t >= pe || p.status === "COMPLETED") bcwp += total;

      // Fixed cost accrual.
      const fixedAccrued =
        p.fixedCostAccrual === "START"   ? (frac > 0 ? p.fixedCost : 0) :
        p.fixedCostAccrual === "END"     ? (frac >= 1 ? p.fixedCost : 0) :
                                            p.fixedCost * frac;
      acwp += fixedAccrued;
    }

    // Sum approved time × rate up to t.
    for (const e of approved) {
      if (e.date.getTime() <= t) {
        const rate = rateByUser.get(e.userId) ?? 0;
        acwp += e.hours * rate;
      }
    }

    points.push({ date: new Date(t).toISOString().slice(0, 10), bcws, bcwp, acwp });
  }

  return NextResponse.json({ points });
}
