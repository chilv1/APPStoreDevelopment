import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DAY_MS = 1000 * 60 * 60 * 24;

// Push subsequent phases of a store by N days (without changing the source phase)
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phaseId, deltaDays } = await request.json();
  if (!phaseId || typeof deltaDays !== "number" || deltaDays === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const sourcePhase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { storeId: true, phaseNumber: true, name: true },
  });
  if (!sourcePhase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const subsequent = await prisma.phase.findMany({
    where: { storeId: sourcePhase.storeId, phaseNumber: { gt: sourcePhase.phaseNumber } },
    orderBy: { phaseNumber: "asc" },
  });

  const deltaMs = deltaDays * DAY_MS;
  await prisma.$transaction(
    subsequent.map((p) => {
      const data: any = {};
      if (p.plannedStart) data.plannedStart = new Date(new Date(p.plannedStart).getTime() + deltaMs);
      if (p.plannedEnd)   data.plannedEnd   = new Date(new Date(p.plannedEnd).getTime() + deltaMs);
      return prisma.phase.update({ where: { id: p.id }, data });
    })
  );

  // Activity log
  const user = session.user as any;
  const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
  try {
    await prisma.activity.create({
      data: {
        userId:   dbUser?.id ?? null,
        storeId:  sourcePhase.storeId,
        action:   "PHASE_CASCADE",
        entity:   "Phase",
        entityId: phaseId,
        details:  `Đẩy ${subsequent.length} giai đoạn sau GĐ ${sourcePhase.phaseNumber} ${deltaDays > 0 ? "+" : ""}${deltaDays} ngày`,
      },
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true, count: subsequent.length, deltaDays });
}
