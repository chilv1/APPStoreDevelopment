import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/phases/[phaseId]/notes — list notes for a phase
export async function GET(_request: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phaseId } = await params;
  const notes = await prisma.phaseNote.findMany({
    where: { phaseId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

// POST /api/phases/[phaseId]/notes — create a note
export async function POST(request: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phaseId } = await params;
  const body = await request.json();
  const content = (body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Nội dung không được để trống" }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "Nội dung tối đa 1000 ký tự" }, { status: 400 });

  // Resolve author by email (stable across re-seeds)
  const user = session.user as any;
  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true },
  });

  // Verify phase exists
  const phase = await prisma.phase.findUnique({ where: { id: phaseId }, select: { id: true, storeId: true, name: true, phaseNumber: true } });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const note = await prisma.phaseNote.create({
    data: { phaseId, content, authorId: dbUser?.id ?? null },
    include: { author: { select: { id: true, name: true } } },
  });

  // Activity log (non-critical)
  try {
    await prisma.activity.create({
      data: {
        userId:   dbUser?.id ?? null,
        storeId:  phase.storeId,
        action:   "PHASE_NOTE_ADDED",
        entity:   "PhaseNote",
        entityId: note.id,
        details:  `Thêm ghi chú vào GĐ ${phase.phaseNumber} - ${phase.name}: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
      },
    });
  } catch { /* non-critical */ }

  return NextResponse.json(note, { status: 201 });
}
