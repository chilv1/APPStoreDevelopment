/**
 * GET  /api/resources?storeId=X      — list resources scoped to a store (incl. global ones)
 * POST /api/resources                — create resource
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_KIND = new Set(["WORK", "MATERIAL", "COST"]);

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  const where: any = storeId ? { OR: [{ storeId }, { storeId: null }] } : {};
  const resources = await prisma.resource.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, role: true, region: true } },
      assignments: {
        include: { phase: { select: { id: true, plannedStart: true, plannedEnd: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Stream 4 P3 — Over-allocation detection.
  // Walk each pair of overlapping assignments; if the sum of `units`
  // across phases that intersect on any single day exceeds maxUnits,
  // mark the resource over-allocated. Heuristic: sweep events.
  const decorated = resources.map((r) => {
    const peakUnits = peakOverlappingUnits(
      r.assignments
        .filter((a) => a.phase.plannedStart && a.phase.plannedEnd)
        .map((a) => ({
          start: a.phase.plannedStart!.getTime(),
          end:   a.phase.plannedEnd!.getTime(),
          units: a.units,
        }))
    );
    const overAllocated = peakUnits > r.maxUnits;
    return {
      ...r,
      assignmentCount: r.assignments.length,
      peakUnits,
      overAllocated,
      // Hide raw assignments to keep payload small.
      assignments: undefined,
      _count: { assignments: r.assignments.length },
    };
  });

  return NextResponse.json(decorated);
}

/**
 * Sweep-line: returns the maximum sum of `units` across any single moment
 * where assignments overlap. O(n log n).
 */
function peakOverlappingUnits(intervals: { start: number; end: number; units: number }[]): number {
  if (intervals.length === 0) return 0;
  type Event = { t: number; delta: number };
  const events: Event[] = [];
  for (const i of intervals) {
    if (i.end <= i.start) continue;
    events.push({ t: i.start, delta: +i.units });
    events.push({ t: i.end,   delta: -i.units });
  }
  events.sort((a, b) => a.t - b.t || a.delta - b.delta); // process ends before starts at same t
  let cur = 0, peak = 0;
  for (const e of events) {
    cur += e.delta;
    if (cur > peak) peak = cur;
  }
  return peak;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER", "PM"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const kind = body.kind || "WORK";
  if (!VALID_KIND.has(kind)) return NextResponse.json({ error: "kind must be WORK/MATERIAL/COST" }, { status: 400 });
  const created = await prisma.resource.create({
    data: {
      name: String(body.name).slice(0, 120),
      kind,
      email: body.email ?? null,
      group: body.group ?? null,
      maxUnits: Math.max(1, Number(body.maxUnits) || 100),
      standardRate: Number(body.standardRate) || 0,
      overtimeRate: Number(body.overtimeRate) || 0,
      costPerUse:   Number(body.costPerUse)   || 0,
      storeId: body.storeId ?? null,
      userId:  body.userId  ?? null,
    },
  });
  return NextResponse.json({ resource: created }, { status: 201 });
}
