/**
 * PATCH/DELETE /api/dependencies/[id]
 *
 * Edit (type, lag, lagPercent, hard, notes) or remove a single edge.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_TYPES = new Set(["FS", "SS", "FF", "SF"]);

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

async function loadDepWithStore(id: string) {
  return prisma.taskDependency.findUnique({
    where: { id },
    include: { successor: { select: { storeId: true } } },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const dep = await loadDepWithStore(id);
  if (!dep) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await userCanEditStore(user, dep.successor.storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const data: any = {};
  if (body.type !== undefined) {
    if (!VALID_TYPES.has(body.type)) {
      return NextResponse.json({ error: `Invalid type ${body.type}` }, { status: 400 });
    }
    data.type = body.type;
  }
  if (body.lagDays !== undefined) {
    if (typeof body.lagDays !== "number" || !Number.isFinite(body.lagDays)) {
      return NextResponse.json({ error: "lagDays must be a finite number" }, { status: 400 });
    }
    data.lagDays = body.lagDays;
  }
  if (body.lagPercent !== undefined) {
    if (body.lagPercent !== null && (typeof body.lagPercent !== "number" || body.lagPercent < -1000 || body.lagPercent > 1000)) {
      return NextResponse.json({ error: "lagPercent must be null or in [-1000, 1000]" }, { status: 400 });
    }
    data.lagPercent = body.lagPercent;
  }
  if (body.hard !== undefined) data.hard = !!body.hard;
  if (body.notes !== undefined) data.notes = body.notes;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.taskDependency.update({ where: { id }, data });
  return NextResponse.json({ dependency: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const dep = await loadDepWithStore(id);
  if (!dep) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await userCanEditStore(user, dep.successor.storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.taskDependency.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
