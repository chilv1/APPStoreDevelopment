import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// DELETE /api/baselines/[baselineId] — admin or area manager
export async function DELETE(_request: Request, { params }: { params: Promise<{ baselineId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Chỉ Admin hoặc Quản lý chi nhánh được xóa mốc" }, { status: 403 });
  }

  const { baselineId } = await params;
  const baseline = await prisma.phaseBaseline.findUnique({ where: { id: baselineId } });
  if (!baseline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.phaseBaseline.delete({ where: { id: baselineId } });

  // Activity log
  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true },
  });
  try {
    await prisma.activity.create({
      data: {
        userId:   dbUser?.id ?? null,
        storeId:  baseline.storeId,
        action:   "BASELINE_DELETED",
        entity:   "PhaseBaseline",
        entityId: baselineId,
        details:  `Xóa mốc kế hoạch "${baseline.name}"`,
      },
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true });
}
