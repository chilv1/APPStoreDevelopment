// GET /api/reports/bc/[id]
// Detail view for a single BC: KPIs + per-store cards data + phase status matrix.
// Permission: any authenticated user, but ONLY their accessible stores show.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  statusCounts,
  avgProgress,
} from "@/lib/queries/reports";

// Permission filter — same logic as getStoresForUser but returns Prisma where-clause
// fragment. Inlined here because BC detail view also needs phase.tasks (heavier
// include than the shared helper provides).
function buildScopeFilter(user: any) {
  if (user.role === "PM" && user.email) return { pm: { email: user.email } };
  if (user.role === "AREA_MANAGER") {
    if (user.branchId) return { bc: { branchId: user.branchId as string } };
    if (user.region)   return { region: user.region as string };
  }
  return {};
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const bc = await prisma.businessCenter.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, code: true, name: true } },
    },
  });
  if (!bc) return NextResponse.json({ error: "BC not found" }, { status: 404 });

  // Filter to stores in this BC AND visible to the user. Custom query because we
  // need phase.tasks here (BC detail shows task counts per store) which the shared
  // getStoresForUser helper deliberately omits to keep the dashboard list response light.
  const stores = await prisma.storeProject.findMany({
    where: {
      AND: [
        { businessCenterId: id },
        buildScopeFilter(user),
      ],
    },
    include: {
      phases: {
        include: { tasks: { select: { status: true } } },
        orderBy: { phaseNumber: "asc" },
      },
      _count: { select: { issues: true } },
    },
    orderBy: { name: "asc" },
  });

  // Build phase matrix data: rows = stores, cols = 11 phases.
  // For each cell, return phase status. Empty if store has no phase with that number.
  const phaseMatrix = (stores as any[]).map((s) => {
    const cells: { phaseNumber: number; status: string; name: string }[] = [];
    for (let n = 1; n <= 11; n++) {
      const ph = s.phases?.find((p: any) => p.phaseNumber === n);
      if (ph) cells.push({ phaseNumber: n, status: ph.status, name: ph.name });
      else    cells.push({ phaseNumber: n, status: "NOT_STARTED", name: "" });
    }
    return {
      storeId: s.id,
      storeCode: s.code,
      storeName: s.name,
      progress: s.progress,
      cells,
    };
  });

  // Per-store summary cards
  const storeCards = (stores as any[]).map((s) => {
    const totalTasks = (s.phases || []).reduce((sum: number, p: any) => sum + (p.tasks?.length || 0), 0);
    const doneTasks = (s.phases || []).reduce(
      (sum: number, p: any) => sum + (p.tasks?.filter((t: any) => t.status === "DONE").length || 0),
      0
    );
    const daysToOpen = s.targetOpenDate
      ? Math.ceil((new Date(s.targetOpenDate).getTime() - Date.now()) / 86_400_000)
      : null;
    const activePhase = s.phases?.find((p: any) => p.status === "IN_PROGRESS")
      ?? s.phases?.find((p: any) => p.status === "NOT_STARTED")
      ?? null;
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      status: s.status,
      progress: s.progress,
      totalTasks,
      doneTasks,
      issueCount: s._count?.issues || 0,
      daysToOpen,
      activePhase: activePhase ? { number: activePhase.phaseNumber, name: activePhase.name } : null,
    };
  });

  return NextResponse.json({
    bc: { id: bc.id, code: bc.code, name: bc.name, address: bc.address, branch: bc.branch },
    kpis: {
      storeCount: stores.length,
      avgProgress: avgProgress(stores as any),
    },
    statusBreakdown: statusCounts(stores as any),
    phaseMatrix,
    storeCards,
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}
