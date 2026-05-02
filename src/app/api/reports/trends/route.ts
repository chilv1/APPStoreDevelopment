// GET /api/reports/trends
// Time-series analysis — openings per month, cumulative trend, phase duration
// (planned vs actual). Permission: ADMIN + AREA_MANAGER. Others 403.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStoresForUser, bucketByMonth } from "@/lib/queries/reports";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "AREA_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stores = await getStoresForUser(user);

  // Openings per month (last 12 months)
  const openings = bucketByMonth(stores as any, 12, (s: any) => s.actualOpenDate);

  // Cumulative
  let cum = 0;
  const cumulative = openings.map((o) => ({ ...o, cum: (cum += o.count) }));

  // Phase duration analysis — for each of 11 phases, compute avg planned days vs avg actual days
  // (only across phases that have both plannedStart/plannedEnd AND actualStart/actualEnd)
  const phaseDuration: { phase: number; avgPlanned: number; avgActual: number; n: number }[] = [];
  for (let n = 1; n <= 11; n++) {
    const samples: { planned: number; actual: number | null }[] = [];
    for (const s of stores as any[]) {
      const ph = s.phases?.find((p: any) => p.phaseNumber === n);
      if (!ph?.plannedStart || !ph?.plannedEnd) continue;
      const planned = (new Date(ph.plannedEnd).getTime() - new Date(ph.plannedStart).getTime()) / 86_400_000;
      let actual: number | null = null;
      if (ph.actualStart && ph.actualEnd) {
        actual = (new Date(ph.actualEnd).getTime() - new Date(ph.actualStart).getTime()) / 86_400_000;
      }
      samples.push({ planned, actual });
    }
    const validPlanned = samples.filter((x) => x.planned > 0);
    const validActual = samples.filter((x) => x.actual !== null && x.actual > 0);
    phaseDuration.push({
      phase: n,
      avgPlanned: validPlanned.length ? Math.round(validPlanned.reduce((s, x) => s + x.planned, 0) / validPlanned.length) : 0,
      avgActual: validActual.length ? Math.round(validActual.reduce((s, x) => s + (x.actual || 0), 0) / validActual.length) : 0,
      n: validPlanned.length,
    });
  }

  // Time to open by branch — average months from project createdAt to actualOpenDate (only completed)
  const completed = stores.filter((s: any) => s.status === "COMPLETED" && s.actualOpenDate);
  const timeToOpenByBranch: Record<string, { branchName: string; avgMonths: number; sampleSize: number }> = {};
  for (const s of completed as any[]) {
    const branchName = s.bc?.branch?.name || "Sin sucursal";
    const months = (new Date(s.actualOpenDate).getTime() - new Date(s.createdAt).getTime()) / (86_400_000 * 30.44);
    if (!timeToOpenByBranch[branchName]) {
      timeToOpenByBranch[branchName] = { branchName, avgMonths: 0, sampleSize: 0 };
    }
    timeToOpenByBranch[branchName].avgMonths += months;
    timeToOpenByBranch[branchName].sampleSize += 1;
  }
  const timeToOpen = Object.values(timeToOpenByBranch).map((b) => ({
    ...b,
    avgMonths: b.sampleSize > 0 ? Number((b.avgMonths / b.sampleSize).toFixed(1)) : 0,
  }));

  return NextResponse.json({
    openings,
    cumulative,
    phaseDuration,
    timeToOpen,
  }, {
    headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=600" },
  });
}
