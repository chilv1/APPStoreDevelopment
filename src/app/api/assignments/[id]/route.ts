import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER", "PM"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.units      !== undefined) data.units      = Math.max(1, Math.min(500, Number(body.units) || 100));
  if (body.workHours  !== undefined) data.workHours  = Math.max(0, Number(body.workHours));
  if (body.actualWork !== undefined) data.actualWork = Math.max(0, Number(body.actualWork));
  if (body.cost       !== undefined) data.cost       = Math.max(0, Number(body.cost));
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const updated = await prisma.resourceAssignment.update({ where: { id }, data });
  return NextResponse.json({ assignment: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER", "PM"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.resourceAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
