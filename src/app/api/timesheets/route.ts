/**
 * GET  /api/timesheets?weekStart=YYYY-MM-DD&userId=...   — list entries for week
 *   ADMIN/AREA_MANAGER can pass any userId; others see their own week only.
 *
 * POST /api/timesheets   — create entry
 *   Body: { phaseId, taskId?, date (YYYY-MM-DD), hours, billable?, notes? }
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MS_PER_DAY = 86_400_000;

function utcMidnight(d: Date | string): Date {
  const dd = new Date(d);
  return new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate()));
}

async function resolveSelf(user: any) {
  return prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true, role: true },
  });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const me = await resolveSelf(user);
  if (!me) return NextResponse.json({ error: "User missing" }, { status: 401 });

  const url = new URL(req.url);
  const weekStartParam = url.searchParams.get("weekStart");
  const requestedUserId = url.searchParams.get("userId");
  const targetUserId = requestedUserId && ["ADMIN", "AREA_MANAGER"].includes(me.role) ? requestedUserId : me.id;

  const weekStart = weekStartParam ? utcMidnight(weekStartParam) : utcMidnight(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * MS_PER_DAY);

  const entries = await prisma.timeEntry.findMany({
    where: { userId: targetUserId, date: { gte: weekStart, lt: weekEnd } },
    include: {
      phase: { select: { id: true, name: true, phaseNumber: true, store: { select: { id: true, code: true, name: true } } } },
      task:  { select: { id: true, title: true } },
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ weekStart: weekStart.toISOString(), userId: targetUserId, entries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const me = await resolveSelf(user);
  if (!me) return NextResponse.json({ error: "User missing" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.phaseId || !body?.date) return NextResponse.json({ error: "phaseId + date required" }, { status: 400 });
  const hours = Math.max(0, Math.min(24, Number(body.hours) || 0));
  if (hours <= 0) return NextResponse.json({ error: "hours must be > 0" }, { status: 400 });
  const created = await prisma.timeEntry.create({
    data: {
      userId:   body.userId && ["ADMIN", "AREA_MANAGER"].includes(me.role) ? body.userId : me.id,
      phaseId:  body.phaseId,
      taskId:   body.taskId ?? null,
      date:     utcMidnight(body.date),
      hours,
      billable: body.billable ?? true,
      notes:    body.notes ?? null,
      status:   "DRAFT",
    },
  });
  return NextResponse.json({ entry: created }, { status: 201 });
}
