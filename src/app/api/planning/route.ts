import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildStoresWhere } from "@/lib/queries/stores";

// Returns stores + phases for the MS-Project planning view.
// Role-scoped (same rules as /api/stores).
// Default: IN_PROGRESS stores; accepts ?status=all|planning|completed|on_hold
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "active";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "60"), 200);

  const user = session.user as any;
  const roleWhere = buildStoresWhere(user);

  let statusWhere: any = {};
  if (statusFilter === "active") statusWhere = { status: { in: ["IN_PROGRESS", "PLANNING"] } };
  else if (statusFilter === "completed") statusWhere = { status: "COMPLETED" };
  else if (statusFilter === "on_hold") statusWhere = { status: "ON_HOLD" };
  // "all" → no filter

  const stores = await prisma.storeProject.findMany({
    where: { ...roleWhere, ...statusWhere },
    include: {
      pm: { select: { id: true, name: true } },
      bc: { include: { branch: { select: { name: true, code: true } } } },
      phases: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { tasks: true } },
          tasks: { select: { status: true }, take: 100 },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  // Compute phase-level pct from tasks
  const data = stores.map((store) => ({
    id: store.id,
    code: store.code,
    name: store.name,
    status: store.status,
    progress: store.progress,
    targetOpenDate: store.targetOpenDate,
    region: store.region,
    pm: store.pm ? { id: store.pm.id, name: store.pm.name } : null,
    branch: store.bc?.branch?.name ?? null,
    phases: store.phases.map((ph) => {
      const total = ph.tasks.length;
      const done  = ph.tasks.filter((t) => t.status === "DONE").length;
      // Task-based progress takes priority when tasks exist; fall back to stored progressPct
      const pct = ph.status === "COMPLETED" ? 100
        : total > 0 ? Math.round((done / total) * 100)
        : (ph as any).progressPct > 0 ? (ph as any).progressPct
        : ph.status === "IN_PROGRESS" ? 30
        : 0;
      return {
        id: ph.id,
        order: ph.order,
        phaseNumber: ph.phaseNumber,
        name: ph.name,
        status: ph.status,
        plannedStart: ph.plannedStart,
        plannedEnd: ph.plannedEnd,
        actualStart: ph.actualStart,
        actualEnd: ph.actualEnd,
        dependencyType: ph.dependencyType,
        dependsOnId: ph.dependsOnId,
        lagDays: ph.lagDays,
        pct,
        progressPct: (ph as any).progressPct ?? 0,
        taskCount: total,
      };
    }),
  }));

  return NextResponse.json(data);
}
