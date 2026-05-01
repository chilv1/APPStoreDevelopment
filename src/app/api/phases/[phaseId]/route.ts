import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DAY_MS = 1000 * 60 * 60 * 24;

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

  // For cascade: capture original dates before update
  const cascade = !!body.cascade;
  let originalPhase: any = null;
  if (cascade) {
    originalPhase = await prisma.phase.findUnique({
      where: { id: phaseId },
      select: { storeId: true, phaseNumber: true, plannedStart: true, plannedEnd: true },
    });
  }

  try {
    const phase = await prisma.phase.update({
      where: { id: phaseId },
      data,
      include: { tasks: true, store: { select: { id: true } } },
    });

    let cascadedCount = 0;
    let cascadeDays = 0;
    // If cascade requested, shift subsequent phases by the same delta
    if (cascade && originalPhase && data.plannedEnd) {
      const originalEnd = originalPhase.plannedEnd ? new Date(originalPhase.plannedEnd).getTime() : 0;
      const newEnd = new Date(data.plannedEnd).getTime();
      const deltaMs = newEnd - originalEnd;
      cascadeDays = Math.round(deltaMs / DAY_MS);

      if (deltaMs !== 0) {
        const subsequentPhases = await prisma.phase.findMany({
          where: { storeId: originalPhase.storeId, phaseNumber: { gt: originalPhase.phaseNumber } },
          orderBy: { phaseNumber: "asc" },
        });

        await prisma.$transaction(
          subsequentPhases.map((p) => {
            const updates: any = {};
            if (p.plannedStart) updates.plannedStart = new Date(new Date(p.plannedStart).getTime() + deltaMs);
            if (p.plannedEnd)   updates.plannedEnd   = new Date(new Date(p.plannedEnd).getTime() + deltaMs);
            return prisma.phase.update({ where: { id: p.id }, data: updates });
          })
        );
        cascadedCount = subsequentPhases.length;
      }
    }

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
          details:  cascade && cascadedCount > 0
            ? `Cập nhật GĐ ${phase.phaseNumber} - ${phase.name} (đẩy ${cascadedCount} giai đoạn sau ${cascadeDays > 0 ? "+" : ""}${cascadeDays} ngày)`
            : `Cập nhật giai đoạn ${phase.phaseNumber} - ${phase.name}`,
        },
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ ...phase, cascadedCount, cascadeDays });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi cập nhật" }, { status: 500 });
  }
}
