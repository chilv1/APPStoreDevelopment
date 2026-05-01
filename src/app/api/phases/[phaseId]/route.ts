import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phaseId } = await params;
  const body = await request.json();

  const data: any = {};
  const parseDate = (v: any) => v === null || v === "" ? null : new Date(v);

  if (body.plannedStart !== undefined) data.plannedStart = parseDate(body.plannedStart);
  if (body.plannedEnd   !== undefined) data.plannedEnd   = parseDate(body.plannedEnd);
  if (body.actualStart  !== undefined) data.actualStart  = parseDate(body.actualStart);
  if (body.actualEnd    !== undefined) data.actualEnd    = parseDate(body.actualEnd);
  if (body.status       !== undefined) data.status       = body.status;

  // Validation: end must be >= start
  if (data.plannedStart && data.plannedEnd && data.plannedEnd < data.plannedStart) {
    return NextResponse.json({ error: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
  }
  if (data.actualStart && data.actualEnd && data.actualEnd < data.actualStart) {
    return NextResponse.json({ error: "Ngày thực tế kết thúc phải sau ngày thực tế bắt đầu" }, { status: 400 });
  }

  try {
    const phase = await prisma.phase.update({
      where: { id: phaseId },
      data,
      include: { tasks: true, store: { select: { id: true } } },
    });

    // Activity log (non-critical)
    const user = session.user as any;
    const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
    try {
      await prisma.activity.create({
        data: {
          userId:   dbUser?.id ?? null,
          storeId:  phase.store.id,
          action:   "PHASE_UPDATED",
          entity:   "Phase",
          entityId: phaseId,
          details:  `Cập nhật giai đoạn ${phase.phaseNumber} - ${phase.name}`,
        },
      });
    } catch { /* non-critical */ }

    return NextResponse.json(phase);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi cập nhật" }, { status: 500 });
  }
}
