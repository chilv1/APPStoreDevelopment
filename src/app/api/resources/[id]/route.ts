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
  if (body.name !== undefined)         data.name = String(body.name).slice(0, 120);
  if (body.kind !== undefined)         data.kind = body.kind;
  if (body.email !== undefined)        data.email = body.email;
  if (body.group !== undefined)        data.group = body.group;
  if (body.maxUnits !== undefined)     data.maxUnits = Math.max(1, Number(body.maxUnits) || 100);
  if (body.standardRate !== undefined) data.standardRate = Number(body.standardRate) || 0;
  if (body.overtimeRate !== undefined) data.overtimeRate = Number(body.overtimeRate) || 0;
  if (body.costPerUse !== undefined)   data.costPerUse   = Number(body.costPerUse)   || 0;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const updated = await prisma.resource.update({ where: { id }, data });
  return NextResponse.json({ resource: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
