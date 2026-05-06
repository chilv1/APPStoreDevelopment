/**
 * GET  /api/stores/[id]/schedule  — run scheduler in dry-run mode (no DB writes)
 * POST /api/stores/[id]/schedule  — run scheduler AND persist new dates back
 *
 * The new TaskDependency-aware engine. Returns critical path, slack, warnings,
 * errors, and elapsed time. Frontend Gantt + WBS use this to refresh after
 * any dependency or duration edit.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyScheduleToStore, scheduleStore } from "@/lib/scheduler/db-bridge";

async function userCanReadStore(user: any, storeId: string): Promise<boolean> {
  if (["ADMIN", "AREA_MANAGER"].includes(user.role)) return true;
  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true },
  });
  if (!dbUser) return false;
  if (user.role === "PM") {
    const store = await prisma.storeProject.findUnique({ where: { id: storeId }, select: { pmId: true } });
    return store?.pmId === dbUser.id;
  }
  return false;
}

async function userCanEditStore(user: any, storeId: string): Promise<boolean> {
  if (["ADMIN", "AREA_MANAGER"].includes(user.role)) return true;
  if (user.role === "PM") {
    const dbUser = await prisma.user.findFirst({
      where: { OR: [{ email: user.email }, { id: user.id }] },
      select: { id: true },
    });
    if (!dbUser) return false;
    const store = await prisma.storeProject.findUnique({ where: { id: storeId }, select: { pmId: true } });
    return store?.pmId === dbUser.id;
  }
  return false;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;
  if (!(await userCanReadStore(user, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await scheduleStore(prisma, id);
  return NextResponse.json(result);
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;
  if (!(await userCanEditStore(user, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await scheduleStore(prisma, id);
  if (result.errors.length > 0) {
    return NextResponse.json({ error: "Scheduler refused to apply", details: result }, { status: 400 });
  }
  const updated = await applyScheduleToStore(prisma, id, result);
  return NextResponse.json({ updated, ...result });
}
