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
      _count: { select: { assignments: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(resources);
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
