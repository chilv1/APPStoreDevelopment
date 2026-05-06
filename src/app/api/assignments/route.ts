/**
 * POST /api/assignments — assign resource to phase
 *
 * Body: { resourceId, phaseId, units?, workHours?, cost? }
 *
 * If `workHours` is omitted, computes default = duration_in_days × 8 × units/100.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER", "PM"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.resourceId || !body?.phaseId) return NextResponse.json({ error: "resourceId + phaseId required" }, { status: 400 });

  const phase = await prisma.phase.findUnique({
    where: { id: body.phaseId },
    select: { id: true, plannedStart: true, plannedEnd: true },
  });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const units = Math.max(1, Math.min(500, Number(body.units) || 100));
  let workHours = Number(body.workHours);
  if (!Number.isFinite(workHours) || workHours <= 0) {
    if (phase.plannedStart && phase.plannedEnd) {
      const days = Math.max(1, Math.round((phase.plannedEnd.getTime() - phase.plannedStart.getTime()) / 86_400_000));
      workHours = days * 8 * (units / 100);
    } else workHours = 0;
  }
  const resource = await prisma.resource.findUnique({ where: { id: body.resourceId }, select: { standardRate: true, costPerUse: true } });
  const cost = (resource?.standardRate ?? 0) * workHours + (resource?.costPerUse ?? 0);

  try {
    const created = await prisma.resourceAssignment.create({
      data: {
        resourceId: body.resourceId,
        phaseId:    body.phaseId,
        units, workHours, cost,
      },
    });
    return NextResponse.json({ assignment: created }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Already assigned" }, { status: 409 });
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
