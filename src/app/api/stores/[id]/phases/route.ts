import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cascadeDependents } from "@/lib/phase-scheduler";

const DAY_MS = 1000 * 60 * 60 * 24;

// POST /api/stores/[id]/phases — Add a new phase to ONE specific store
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER", "PM"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: storeId } = await params;
  const body = await request.json();
  const { name, durationDays, dependsOnId, dependencyType, lagDays, insertAfterOrder } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Tên giai đoạn là bắt buộc" }, { status: 400 });

  const store = await prisma.storeProject.findUnique({ where: { id: storeId } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  // Determine insertion order
  const existingPhases = await prisma.phase.findMany({
    where: { storeId },
    orderBy: { order: "asc" },
  });
  const maxOrder = existingPhases.length > 0 ? Math.max(...existingPhases.map(p => p.order)) : 0;
  const newOrder = typeof insertAfterOrder === "number" ? insertAfterOrder + 1 : maxOrder + 1;

  // Shift later phases up
  const toShift = existingPhases.filter(p => p.order >= newOrder).sort((a, b) => b.order - a.order);
  for (const p of toShift) {
    await prisma.phase.update({ where: { id: p.id }, data: { order: p.order + 1, phaseNumber: p.phaseNumber + 1 } });
  }

  // Compute dates from predecessor
  let plannedStart: Date | null = null;
  let plannedEnd:   Date | null = null;
  const dur = Math.max(1, Math.round(Number(durationDays) || 7));

  const predecessor = dependsOnId
    ? await prisma.phase.findUnique({ where: { id: dependsOnId }, select: { plannedStart: true, plannedEnd: true } })
    : existingPhases.find(p => p.order === newOrder - 1);

  if (predecessor) {
    const lagMs = (Number(lagDays) || 0) * DAY_MS;
    if (dependencyType === "SS" && predecessor.plannedStart) {
      plannedStart = new Date(new Date(predecessor.plannedStart).getTime() + lagMs);
    } else if (predecessor.plannedEnd) {
      plannedStart = new Date(new Date(predecessor.plannedEnd).getTime() + lagMs);
    }
    if (plannedStart) plannedEnd = new Date(plannedStart.getTime() + dur * DAY_MS);
  }

  const newPhase = await prisma.phase.create({
    data: {
      phaseNumber: newOrder,
      order: newOrder,
      name: name.trim(),
      description: "",
      status: "NOT_STARTED",
      plannedStart,
      plannedEnd,
      dependencyType: dependencyType ?? "FS",
      dependsOnId: dependsOnId ?? null,
      lagDays: Number(lagDays) || 0,
      storeId,
    },
  });

  // Update next phase to depend on new phase (link the chain)
  const nextPhase = await prisma.phase.findFirst({ where: { storeId, order: newOrder + 1 } });
  if (nextPhase) {
    await prisma.phase.update({ where: { id: nextPhase.id }, data: { dependsOnId: newPhase.id } });
  }

  // Cascade dates from new phase to subsequent
  if (newPhase.plannedEnd) {
    await cascadeDependents(newPhase.id, prisma as any);
  }

  // Update store targetOpenDate
  const lastPhase = await prisma.phase.findFirst({ where: { storeId }, orderBy: { order: "desc" } });
  if (lastPhase?.plannedEnd) {
    await prisma.storeProject.update({ where: { id: storeId }, data: { targetOpenDate: lastPhase.plannedEnd } });
  }

  const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
  try {
    await prisma.activity.create({
      data: { userId: dbUser?.id, storeId, action: "PHASE_CREATED", entity: "Phase", entityId: newPhase.id, details: `Thêm giai đoạn mới: "${newPhase.name}"` },
    });
  } catch { /* non-critical */ }

  return NextResponse.json(newPhase, { status: 201 });
}
