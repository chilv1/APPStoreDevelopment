/**
 * GET /api/planning/resources?storeId=...
 *
 * Returns the resource sheet for a single store: one row per User who is
 * the PM of the store OR is currently assigned to any task on its phases.
 *
 * Each row carries:
 *   - basic profile (name, email, role, region, branch)
 *   - assignmentsTotal / assignmentsActive / assignmentsDone (Task counts)
 *   - utilization (% of currently-active assignments out of total active capacity
 *     across the store) — coarse v1 metric, refined in P3
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const store = await prisma.storeProject.findUnique({
    where: { id: storeId },
    select: {
      id: true, code: true, name: true, pmId: true,
      pm: { select: { id: true, name: true, email: true, role: true, region: true } },
    },
  });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  // All tasks under this store's phases.
  const tasks = await prisma.task.findMany({
    where: { phase: { storeId } },
    select: {
      id: true, status: true, dueDate: true, priority: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, email: true, role: true, region: true } },
      phase: { select: { id: true, name: true, phaseNumber: true } },
    },
  });

  const byUser = new Map<string, { user: any; total: number; active: number; done: number; tasks: typeof tasks }>();

  // Seed PM as a row even if they don't have direct task assignments.
  if (store.pm) {
    byUser.set(store.pm.id, { user: { ...store.pm, role: store.pm.role + " (PM)" }, total: 0, active: 0, done: 0, tasks: [] });
  }

  for (const t of tasks) {
    if (!t.assigneeId || !t.assignee) continue;
    let row = byUser.get(t.assigneeId);
    if (!row) {
      row = { user: t.assignee, total: 0, active: 0, done: 0, tasks: [] };
      byUser.set(t.assigneeId, row);
    }
    row.total++;
    if (t.status === "DONE") row.done++;
    else if (t.status === "IN_PROGRESS" || t.status === "TODO" || t.status === "BLOCKED") row.active++;
    row.tasks.push(t);
  }

  const totalActive = [...byUser.values()].reduce((s, r) => s + r.active, 0);
  const rows = [...byUser.values()].map((r) => ({
    user: r.user,
    total: r.total,
    active: r.active,
    done: r.done,
    utilization: totalActive > 0 ? Math.round((r.active / totalActive) * 100) : 0,
    tasks: r.tasks.slice(0, 10),
  })).sort((a, b) => b.active - a.active);

  return NextResponse.json({
    store: { id: store.id, code: store.code, name: store.name },
    rows,
    totalActive,
    totalAssignments: tasks.filter((t) => t.assigneeId).length,
  });
}
