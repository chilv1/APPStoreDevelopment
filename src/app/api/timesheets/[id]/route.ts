import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function resolveSelf(user: any) {
  return prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true, role: true } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await resolveSelf(session.user as any);
  if (!me) return NextResponse.json({ error: "User missing" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id }, select: { id: true, userId: true, status: true } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const isAdminOrAM = ["ADMIN", "AREA_MANAGER"].includes(me.role);
  const isOwner = entry.userId === me.id;

  // Approval transitions: SUBMITTED → APPROVED/REJECTED only by admin/AM.
  if (body.action === "submit" && isOwner && entry.status === "DRAFT") {
    const updated = await prisma.timeEntry.update({ where: { id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
    return NextResponse.json({ entry: updated });
  }
  if ((body.action === "approve" || body.action === "reject") && isAdminOrAM && entry.status === "SUBMITTED") {
    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: body.action === "approve" ? "APPROVED" : "REJECTED",
        approvedAt: new Date(),
        approverId: me.id,
      },
    });
    return NextResponse.json({ entry: updated });
  }

  // Editing fields — only when entry is DRAFT and owner.
  if (entry.status !== "DRAFT" && !isAdminOrAM) {
    return NextResponse.json({ error: "Cannot edit entry after submission" }, { status: 400 });
  }
  if (!isOwner && !isAdminOrAM) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data: any = {};
  if (body.hours    !== undefined) data.hours    = Math.max(0, Math.min(24, Number(body.hours)));
  if (body.billable !== undefined) data.billable = !!body.billable;
  if (body.notes    !== undefined) data.notes    = body.notes;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const updated = await prisma.timeEntry.update({ where: { id }, data });
  return NextResponse.json({ entry: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await resolveSelf(session.user as any);
  if (!me) return NextResponse.json({ error: "User missing" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id }, select: { userId: true, status: true } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdminOrAM = ["ADMIN", "AREA_MANAGER"].includes(me.role);
  if (entry.userId !== me.id && !isAdminOrAM) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (entry.status !== "DRAFT" && !isAdminOrAM) return NextResponse.json({ error: "Cannot delete after submission" }, { status: 400 });
  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
