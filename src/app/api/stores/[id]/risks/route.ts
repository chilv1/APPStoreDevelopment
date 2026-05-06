/**
 * GET /api/stores/[id]/risks
 *
 * Runs the deterministic risk analyzer over the live scheduler output +
 * the store's phases. Returns sorted risks + a one-paragraph summary.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scheduleStore } from "@/lib/scheduler/db-bridge";
import { analyzeRisks, buildWeeklySummary } from "@/lib/ai/risk-analyzer";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const phases = await prisma.phase.findMany({
    where: { storeId: id },
    orderBy: { order: "asc" },
    select: {
      id: true, phaseNumber: true, name: true, status: true,
      plannedStart: true, plannedEnd: true, actualStart: true, actualEnd: true,
      deadline: true, progressPct: true,
    },
  });
  const result = await scheduleStore(prisma, id);
  const risks = analyzeRisks(result, phases);
  const summary = buildWeeklySummary(result, phases, risks);

  return NextResponse.json({
    summary,
    risks,
    metrics: {
      criticalPathLength: result.criticalPath.length,
      durationDays: result.durationDays,
      projectFinish: result.projectFinish,
      taskCount: result.metrics.taskCount,
      depCount: result.metrics.dependencyCount,
      engineMs: result.metrics.elapsedMs,
    },
  });
}
