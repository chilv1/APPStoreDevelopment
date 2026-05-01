import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/phase-notes/[noteId] — edit content (author or admin only)
export async function PATCH(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const body = await request.json();
  const content = (body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Nội dung không được để trống" }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "Nội dung tối đa 1000 ký tự" }, { status: 400 });

  const user = session.user as any;
  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true, role: true },
  });

  const existing = await prisma.phaseNote.findUnique({ where: { id: noteId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = existing.authorId && dbUser?.id && existing.authorId === dbUser.id;
  const isAdmin = dbUser?.role === "ADMIN";
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Chỉ tác giả hoặc Admin được sửa" }, { status: 403 });
  }

  const note = await prisma.phaseNote.update({
    where: { id: noteId },
    data: { content },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(note);
}

// DELETE /api/phase-notes/[noteId] — delete (author or admin only)
export async function DELETE(_request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const user = session.user as any;
  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true, role: true },
  });

  const existing = await prisma.phaseNote.findUnique({ where: { id: noteId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = existing.authorId && dbUser?.id && existing.authorId === dbUser.id;
  const isAdmin = dbUser?.role === "ADMIN";
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Chỉ tác giả hoặc Admin được xóa" }, { status: 403 });
  }

  await prisma.phaseNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
