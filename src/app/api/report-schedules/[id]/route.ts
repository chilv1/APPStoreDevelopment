import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function isPriv(role: string) { return ["ADMIN", "AREA_MANAGER"].includes(role); }

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPriv((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.name       !== undefined) data.name       = String(body.name).slice(0, 120);
  if (body.cron       !== undefined) data.cron       = String(body.cron).slice(0, 60);
  if (body.recipients !== undefined) data.recipients = JSON.stringify(body.recipients);
  if (body.storeId    !== undefined) data.storeId    = body.storeId;
  if (body.enabled    !== undefined) data.enabled    = !!body.enabled;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const updated = await prisma.reportSchedule.update({ where: { id }, data });
  return NextResponse.json({ schedule: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPriv((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.reportSchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
