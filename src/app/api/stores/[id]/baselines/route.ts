import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_BASELINES_PER_STORE = 5;

// GET — list all baselines of a store (with snapshots inline)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const baselines = await prisma.phaseBaseline.findMany({
    where: { storeId: id },
    include: {
      creator:   { select: { id: true, name: true } },
      snapshots: { orderBy: { phaseNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(baselines);
}

// POST — create a baseline by snapshotting current planned dates of all 11 phases
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Chỉ Admin hoặc Quản lý chi nhánh được lưu mốc" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Tên mốc không được để trống" }, { status: 400 });
  if (name.length > 100) return NextResponse.json({ error: "Tên mốc tối đa 100 ký tự" }, { status: 400 });

  // Limit
  const existing = await prisma.phaseBaseline.findMany({ where: { storeId: id }, orderBy: { createdAt: "asc" } });
  if (existing.length >= MAX_BASELINES_PER_STORE) {
    return NextResponse.json({ error: `Tối đa ${MAX_BASELINES_PER_STORE} mốc/cửa hàng. Hãy xóa mốc cũ trước.` }, { status: 400 });
  }

  // Snapshot phases now
  const phases = await prisma.phase.findMany({
    where: { storeId: id },
    orderBy: { phaseNumber: "asc" },
    select: { phaseNumber: true, plannedStart: true, plannedEnd: true },
  });
  if (phases.length === 0) return NextResponse.json({ error: "Cửa hàng không có giai đoạn nào" }, { status: 400 });

  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true },
  });

  const baseline = await prisma.phaseBaseline.create({
    data: {
      storeId: id,
      name,
      createdBy: dbUser?.id ?? null,
      snapshots: {
        create: phases.map(p => ({
          phaseNumber:  p.phaseNumber,
          plannedStart: p.plannedStart,
          plannedEnd:   p.plannedEnd,
        })),
      },
    },
    include: {
      creator:   { select: { id: true, name: true } },
      snapshots: { orderBy: { phaseNumber: "asc" } },
    },
  });

  // Activity log
  try {
    await prisma.activity.create({
      data: {
        userId:   dbUser?.id ?? null,
        storeId:  id,
        action:   "BASELINE_CREATED",
        entity:   "PhaseBaseline",
        entityId: baseline.id,
        details:  `Lưu mốc kế hoạch "${name}" (snapshot ${phases.length} giai đoạn)`,
      },
    });
  } catch { /* non-critical */ }

  return NextResponse.json(baseline, { status: 201 });
}
