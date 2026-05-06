/**
 * GET /api/timesheets/pending
 *
 * Stream 5 P3 — admin approval queue. Returns all SUBMITTED entries
 * across the portfolio, scoped to the caller's role (ADMIN sees all,
 * AREA_MANAGER sees their region, PM sees their stores' entries).
 *
 * Sorted oldest-submitted first to nudge timely approvals.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildStoresWhere } from "@/lib/queries/stores";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER", "PM"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const storeWhere = buildStoresWhere(user);
  const stores = await prisma.storeProject.findMany({ where: storeWhere, select: { id: true } });
  const storeIds = stores.map((s) => s.id);

  const entries = await prisma.timeEntry.findMany({
    where: { status: "SUBMITTED", phase: { storeId: { in: storeIds } } },
    include: {
      user:  { select: { id: true, name: true, role: true, region: true } },
      phase: { select: { id: true, name: true, phaseNumber: true, store: { select: { id: true, code: true, name: true } } } },
    },
    orderBy: { submittedAt: "asc" },
    take: 200,
  });

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const byUser = new Map<string, { name: string; count: number; hours: number }>();
  for (const e of entries) {
    if (!byUser.has(e.userId)) byUser.set(e.userId, { name: e.user.name, count: 0, hours: 0 });
    const r = byUser.get(e.userId)!;
    r.count++; r.hours += e.hours;
  }

  return NextResponse.json({
    entries,
    summary: {
      totalEntries: entries.length,
      totalHours,
      uniqueUsers: byUser.size,
      byUser: [...byUser.entries()].map(([id, v]) => ({ id, ...v })),
    },
  });
}
