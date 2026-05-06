/**
 * GET  /api/stores/[id]/snapshots          — list snapshots (most recent first)
 * POST /api/stores/[id]/snapshots          — capture current scheduler output
 *
 * Each snapshot freezes the engine output (criticalPath, per-task dates+float).
 * Used by the Critical-Path panel to diff "what changed since last week".
 */
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scheduleStore } from "@/lib/scheduler/db-bridge";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const list = await prisma.scheduleSnapshot.findMany({
    where: { storeId: id },
    select: { id: true, takenAt: true, reason: true, checksum: true, taker: { select: { id: true, name: true } } },
    orderBy: { takenAt: "desc" },
    take: 50,
  });
  return NextResponse.json(list);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const result = await scheduleStore(prisma, id);
  // Reduce payload to the diffable parts only.
  const slim = {
    criticalPath: result.criticalPath,
    projectStart:  result.projectStart,
    projectFinish: result.projectFinish,
    durationDays:  result.durationDays,
    tasks: result.tasks.map((t) => ({
      id: t.id, name: t.name, type: t.type,
      start:       t.start, finish: t.finish,
      totalFloat:  t.totalFloat,
      critical:    t.critical,
    })),
  };
  const payload = JSON.stringify(slim);
  const checksum = createHash("sha256").update(payload).digest("hex");

  const me = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
  const created = await prisma.scheduleSnapshot.create({
    data: { storeId: id, payload, checksum, reason: (body.reason ?? "").slice(0, 200), takenBy: me?.id ?? null },
    select: { id: true, takenAt: true, checksum: true, reason: true },
  });
  return NextResponse.json({ snapshot: created, criticalPath: result.criticalPath, durationDays: result.durationDays });
}
