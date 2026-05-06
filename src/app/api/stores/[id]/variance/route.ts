/**
 * GET /api/stores/[id]/variance?baselineId=...
 *
 * Returns per-phase planned-vs-baseline variance:
 *   - startDelta  (days): currentPlannedStart - baselineStart
 *   - finishDelta (days): currentPlannedEnd   - baselineEnd
 *   - status (ON_TRACK | EARLY | LATE | UNKNOWN)
 *
 * Aggregate roll-up: avgFinishDelta, maxLate, maxEarly, lateCount, earlyCount.
 *
 * If baselineId omitted, picks the most recent baseline. 404 if none exist.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MS_PER_DAY = 86_400_000;

function diffDays(a: Date | null | undefined, b: Date | null | undefined): number | null {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const requestedId = url.searchParams.get("baselineId");

  const baselines = await prisma.phaseBaseline.findMany({
    where: { storeId: id },
    orderBy: { createdAt: "desc" },
    include: { snapshots: true, creator: { select: { id: true, name: true } } },
  });
  if (baselines.length === 0) {
    return NextResponse.json({ baseline: null, rows: [], summary: null }, { status: 200 });
  }
  const baseline = requestedId ? (baselines.find((b) => b.id === requestedId) ?? baselines[0]) : baselines[0];

  const phases = await prisma.phase.findMany({
    where: { storeId: id },
    orderBy: { order: "asc" },
    select: { id: true, phaseNumber: true, name: true, status: true, plannedStart: true, plannedEnd: true, actualStart: true, actualEnd: true },
  });

  const baselineByPhase = new Map(baseline.snapshots.map((s) => [s.phaseNumber, s]));
  let lateCount = 0, earlyCount = 0, onTrackCount = 0, unknownCount = 0;
  let maxLate = 0, maxEarly = 0, sumFinishDelta = 0, deltaSamples = 0;
  const rows = phases.map((p) => {
    const base = baselineByPhase.get(p.phaseNumber);
    const startDelta  = diffDays(base?.plannedStart ?? null, p.plannedStart ?? null);
    const finishDelta = diffDays(base?.plannedEnd   ?? null, p.plannedEnd   ?? null);
    let status: "ON_TRACK" | "EARLY" | "LATE" | "UNKNOWN" = "UNKNOWN";
    if (finishDelta === null) status = "UNKNOWN";
    else if (finishDelta === 0) status = "ON_TRACK";
    else if (finishDelta > 0)  status = "LATE";
    else                       status = "EARLY";

    if (status === "LATE")     { lateCount++;  if (finishDelta && finishDelta > maxLate)  maxLate = finishDelta; }
    if (status === "EARLY")    { earlyCount++; if (finishDelta && finishDelta < maxEarly) maxEarly = finishDelta; }
    if (status === "ON_TRACK") onTrackCount++;
    if (status === "UNKNOWN")  unknownCount++;
    if (typeof finishDelta === "number") { sumFinishDelta += finishDelta; deltaSamples++; }

    return {
      id: p.id, phaseNumber: p.phaseNumber, name: p.name, status: p.status,
      currentStart:  p.plannedStart, currentEnd:  p.plannedEnd,
      baselineStart: base?.plannedStart ?? null, baselineEnd: base?.plannedEnd ?? null,
      actualStart:   p.actualStart, actualEnd:    p.actualEnd,
      startDelta, finishDelta, varianceStatus: status,
    };
  });

  return NextResponse.json({
    baseline: { id: baseline.id, name: baseline.name, createdAt: baseline.createdAt, creator: baseline.creator },
    rows,
    summary: {
      avgFinishDelta: deltaSamples > 0 ? Math.round(sumFinishDelta / deltaSamples) : 0,
      maxLate, maxEarly, lateCount, earlyCount, onTrackCount, unknownCount,
      totalPhases: phases.length,
    },
  });
}
