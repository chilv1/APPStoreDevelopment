import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cascadeDependents } from "@/lib/phase-scheduler";

// Trigger dependency-graph cascade from a specific phase
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phaseId, deltaDays } = await request.json();
  if (!phaseId || typeof deltaDays !== "number" || deltaDays === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const sourcePhase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { storeId: true, order: true, name: true, plannedStart: true, plannedEnd: true },
  });
  if (!sourcePhase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  // Shift source phase dates by deltaDays first
  const DAY_MS = 1000 * 60 * 60 * 24;
  const deltaMs = deltaDays * DAY_MS;
  await prisma.phase.update({
    where: { id: phaseId },
    data: {
      ...(sourcePhase.plannedStart && {
        plannedStart: new Date(new Date(sourcePhase.plannedStart).getTime() + deltaMs),
      }),
      ...(sourcePhase.plannedEnd && {
        plannedEnd: new Date(new Date(sourcePhase.plannedEnd).getTime() + deltaMs),
      }),
    },
  });

  // Cascade to all dependents via dependency graph
  const cascadedCount = await cascadeDependents(phaseId, prisma as any);

  // Activity log
  const user = session.user as any;
  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true },
  });
  try {
    await prisma.activity.create({
      data: {
        userId: dbUser?.id ?? null,
        storeId: sourcePhase.storeId,
        action: "PHASE_CASCADE",
        entity: "Phase",
        entityId: phaseId,
        details: `Dịch GĐ ${sourcePhase.order} "${sourcePhase.name}" ${deltaDays > 0 ? "+" : ""}${deltaDays} ngày → cascade ${cascadedCount} GĐ phụ thuộc`,
      },
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true, count: cascadedCount, deltaDays });
}
