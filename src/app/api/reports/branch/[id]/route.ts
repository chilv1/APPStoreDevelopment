// GET /api/reports/branch/[id]
// Detail view for a single branch — KPIs, BCs comparison, store list with phase data.
// Permission: ADMIN sees any; AREA_MANAGER only own branch; others 403.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getStoresForUser,
  statusCounts,
  avgProgress,
  totalCapex,
  groupByBC,
} from "@/lib/queries/reports";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  if (user.role !== "ADMIN" && user.role !== "AREA_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "AREA_MANAGER" && user.branchId !== id) {
    return NextResponse.json({ error: "Forbidden — not your branch" }, { status: 403 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      businessCenters: { orderBy: { code: "asc" } },
      _count: { select: { users: true } },
    },
  });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  // Filter stores down to this branch (also respects user's permission scope)
  const allStores = await getStoresForUser(user);
  const stores = allStores.filter((s: any) => s.bc?.branch?.id === id);

  // BCs comparison: for each BC in this branch, compute avg progress + store count
  const byBC = groupByBC(stores as any);
  const bcStats = branch.businessCenters.map((bc) => {
    const list = byBC[bc.id] || [];
    return {
      id: bc.id,
      code: bc.code,
      name: bc.name,
      storeCount: list.length,
      avgProgress: avgProgress(list as any),
      statusBreakdown: statusCounts(list as any),
    };
  });

  // Phase status across all stores in branch — for stacked bar
  // Counts of each phase number that's currently IN_PROGRESS across stores
  const phasesInProgress: Record<number, number> = {};
  for (const s of stores as any[]) {
    for (const p of s.phases || []) {
      if (p.status === "IN_PROGRESS") {
        phasesInProgress[p.phaseNumber] = (phasesInProgress[p.phaseNumber] || 0) + 1;
      }
    }
  }

  // Active phase per store (for table) = first IN_PROGRESS phase, else lowest NOT_STARTED
  const storeRows = (stores as any[]).map((s) => {
    const active = s.phases?.find((p: any) => p.status === "IN_PROGRESS")
      ?? s.phases?.find((p: any) => p.status === "NOT_STARTED")
      ?? null;
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      pm: s.pm?.name || null,
      bc: s.bc ? { id: s.bc.id, code: s.bc.code, name: s.bc.name } : null,
      status: s.status,
      progress: s.progress,
      targetOpenDate: s.targetOpenDate,
      activePhase: active ? { number: active.phaseNumber, name: active.name, status: active.status } : null,
    };
  });

  return NextResponse.json({
    branch: { id: branch.id, code: branch.code, name: branch.name, description: branch.description, userCount: branch._count.users },
    kpis: {
      totalStores: stores.length,
      avgProgress: avgProgress(stores as any),
      totalCapex: totalCapex(stores as any),
      bcCount: branch.businessCenters.length,
    },
    statusBreakdown: statusCounts(stores as any),
    bcStats,
    phasesInProgress,
    stores: storeRows,
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}
