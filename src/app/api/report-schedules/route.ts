/**
 * GET  /api/report-schedules        — list (admin only)
 * POST /api/report-schedules        — create
 *   Body: { name, reportKind, cron, recipients: string[], storeId?, enabled? }
 *
 * Stream 7 P3 — config-only. Email transport + cron runner land in P4.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_KIND = new Set(["WEEKLY_SUMMARY", "COST_VARIANCE", "RISK_DIGEST"]);

function isPriv(role: string) { return ["ADMIN", "AREA_MANAGER"].includes(role); }

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPriv((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const list = await prisma.reportSchedule.findMany({
    include: {
      creator: { select: { id: true, name: true } },
      store:   { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isPriv(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.cron) return NextResponse.json({ error: "name + cron required" }, { status: 400 });
  const reportKind = body.reportKind || "WEEKLY_SUMMARY";
  if (!VALID_KIND.has(reportKind)) return NextResponse.json({ error: "Invalid reportKind" }, { status: 400 });
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  const me = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
  const created = await prisma.reportSchedule.create({
    data: {
      name: String(body.name).slice(0, 120),
      reportKind,
      cron: String(body.cron).slice(0, 60),
      recipients: JSON.stringify(recipients),
      storeId: body.storeId ?? null,
      enabled: body.enabled !== false,
      createdBy: me?.id ?? null,
    },
  });
  return NextResponse.json({ schedule: created }, { status: 201 });
}
