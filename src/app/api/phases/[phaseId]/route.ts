import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cascadeDependents } from "@/lib/phase-scheduler";

export async function PATCH(request: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phaseId } = await params;
  const body = await request.json();

  const data: any = {};
  const parseDate = (v: any) => (v === null || v === "" ? null : new Date(v));

  if (body.plannedStart    !== undefined) data.plannedStart    = parseDate(body.plannedStart);
  if (body.plannedEnd      !== undefined) data.plannedEnd      = parseDate(body.plannedEnd);
  if (body.actualStart     !== undefined) data.actualStart     = parseDate(body.actualStart);
  if (body.actualEnd       !== undefined) data.actualEnd       = parseDate(body.actualEnd);
  if (body.status          !== undefined) data.status          = body.status;
  if (body.dependencyType  !== undefined) data.dependencyType  = body.dependencyType;
  if (body.dependsOnId     !== undefined) data.dependsOnId     = body.dependsOnId ?? null;
  if (body.lagDays         !== undefined) data.lagDays         = Number(body.lagDays) || 0;
  if (body.name            !== undefined) data.name            = body.name;

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

    // Recalculate store progress if status changed
    if (body.status !== undefined) {
      const allPhases = await prisma.phase.findMany({
        where: { storeId: phase.store.id },
        include: { tasks: { select: { status: true } } },
      });
      const totalTasks = allPhases.reduce((s, p) => s + p.tasks.length, 0);
      const doneTasks  = allPhases.reduce((s, p) => s + p.tasks.filter(t => t.status === "DONE").length, 0);
      const progress   = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      await prisma.storeProject.update({ where: { id: phase.store.id }, data: { progress } });
    }

    let cascadedCount = 0;
    const datesChanged = data.plannedStart !== undefined || data.plannedEnd !== undefined;
    if (datesChanged) {
      cascadedCount = await cascadeDependents(phaseId, prisma as any);
    }

    const user = session.user as any;
    const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
    try {
      await prisma.activity.create({
        data: {
          userId:  dbUser?.id ?? null,
          storeId: phase.store.id,
          action:  "PHASE_UPDATED",
          entity:  "Phase",
          entityId: phaseId,
          details: cascadedCount > 0
            ? `Cập nhật GĐ ${phase.order} - ${phase.name} (cascade ${cascadedCount} GĐ)`
            : `Cập nhật giai đoạn ${phase.order} - ${phase.name}`,
        },
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ ...phase, cascadedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi cập nhật" }, { status: 500 });
  }
}

// Delete a single phase — re-links its dependents to its predecessor, then deletes
export async function DELETE(_req: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER", "PM"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phaseId } = await params;
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { id: true, storeId: true, order: true, dependsOnId: true, name: true },
  });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  // Re-link: phases that depended on this one → point to this phase's predecessor
  await prisma.phase.updateMany({
    where: { storeId: phase.storeId, dependsOnId: phaseId },
    data: { dependsOnId: phase.dependsOnId ?? null },
  });

  // Delete phase (cascade: tasks, notes)
  await prisma.phase.delete({ where: { id: phaseId } });

  // Re-sequence remaining phases (order gap fill)
  const remaining = await prisma.phase.findMany({
    where: { storeId: phase.storeId, order: { gt: phase.order } },
    orderBy: { order: "asc" },
  });
  for (const p of remaining) {
    await prisma.phase.update({ where: { id: p.id }, data: { order: p.order - 1, phaseNumber: p.phaseNumber - 1 } });
  }

  // Update store targetOpenDate
  const lastPhase = await prisma.phase.findFirst({ where: { storeId: phase.storeId }, orderBy: { order: "desc" } });
  if (lastPhase?.plannedEnd) {
    await prisma.storeProject.update({ where: { id: phase.storeId }, data: { targetOpenDate: lastPhase.plannedEnd } });
  }

  const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
  try {
    await prisma.activity.create({
      data: { userId: dbUser?.id ?? null, storeId: phase.storeId, action: "PHASE_DELETED", entity: "Phase", entityId: phaseId, details: `Xóa giai đoạn "${phase.name}"` },
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true });
}
