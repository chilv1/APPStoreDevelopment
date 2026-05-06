/**
 * POST /api/dependencies
 *
 * Create a new TaskDependency edge between two phases (multi-predecessor).
 *
 * Body:
 *   {
 *     predecessorId: string,
 *     successorId:   string,
 *     type?:        "FS" | "SS" | "FF" | "SF"   (default "FS")
 *     lagDays?:     number                       (default 0; negative = lead)
 *     lagPercent?:  number                       (overrides lagDays when set)
 *     hard?:        boolean                      (default true; soft = warning only)
 *     notes?:       string
 *   }
 *
 * Returns the created edge or 409 if it already exists, 400 on cycle/self-loop,
 * 403 if caller can't edit either side, 404 if either id is unknown.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wouldFormCycle } from "@/lib/scheduler/db-bridge";

const VALID_TYPES = new Set(["FS", "SS", "FF", "SF"]);

async function userCanEditStore(user: any, storeId: string): Promise<boolean> {
  if (["ADMIN", "AREA_MANAGER"].includes(user.role)) return true;
  if (user.role === "PM") {
    const dbUser = await prisma.user.findFirst({
      where: { OR: [{ email: user.email }, { id: user.id }] },
      select: { id: true },
    });
    if (!dbUser) return false;
    const store = await prisma.storeProject.findUnique({ where: { id: storeId }, select: { pmId: true } });
    return store?.pmId === dbUser.id;
  }
  return false;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { predecessorId, successorId, type = "FS", lagDays = 0, lagPercent, hard = true, notes } = body;
  if (!predecessorId || !successorId) {
    return NextResponse.json({ error: "predecessorId and successorId required" }, { status: 400 });
  }
  if (predecessorId === successorId) {
    return NextResponse.json({ error: "Self-loop not allowed" }, { status: 400 });
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: `Invalid type ${type}; expected FS/SS/FF/SF` }, { status: 400 });
  }
  if (typeof lagDays !== "number" || !Number.isFinite(lagDays)) {
    return NextResponse.json({ error: "lagDays must be a finite number" }, { status: 400 });
  }
  if (lagPercent != null && (typeof lagPercent !== "number" || lagPercent < -1000 || lagPercent > 1000)) {
    return NextResponse.json({ error: "lagPercent must be a number between -1000 and 1000" }, { status: 400 });
  }

  // Both phases must exist and belong to the same store; caller must own that store.
  const [pred, succ] = await Promise.all([
    prisma.phase.findUnique({ where: { id: predecessorId }, select: { id: true, storeId: true } }),
    prisma.phase.findUnique({ where: { id: successorId }, select: { id: true, storeId: true } }),
  ]);
  if (!pred || !succ) return NextResponse.json({ error: "Phase not found" }, { status: 404 });
  // Cross-store deps are allowed only within the same Business Center (Stream 1 P3).
  if (pred.storeId !== succ.storeId) {
    const [predStore, succStore] = await Promise.all([
      prisma.storeProject.findUnique({ where: { id: pred.storeId }, select: { businessCenterId: true } }),
      prisma.storeProject.findUnique({ where: { id: succ.storeId }, select: { businessCenterId: true } }),
    ]);
    if (!predStore?.businessCenterId || predStore.businessCenterId !== succStore?.businessCenterId) {
      return NextResponse.json({ error: "Cross-store dependencies are allowed only within the same Business Center" }, { status: 400 });
    }
  }
  if (!(await userCanEditStore(user, pred.storeId)) || !(await userCanEditStore(user, succ.storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cycle check (uses both legacy + new edges).
  const cycle = await wouldFormCycle(prisma, predecessorId, successorId);
  if (cycle) {
    return NextResponse.json({ error: "Would create a cycle", cycle }, { status: 400 });
  }

  // Resolve creator.id (best-effort).
  const me = await prisma.user.findFirst({
    where: { OR: [{ email: user.email }, { id: user.id }] },
    select: { id: true },
  });

  try {
    const created = await prisma.taskDependency.create({
      data: {
        predecessorId,
        successorId,
        type,
        lagDays,
        lagPercent: lagPercent ?? null,
        hard,
        notes: notes ?? null,
        createdBy: me?.id ?? null,
      },
    });
    // Audit log (Stream 1 P3).
    await prisma.activity.create({
      data: {
        action:   "DEP_CREATED",
        entity:   "TaskDependency",
        entityId: created.id,
        details:  `${type}${lagDays ? ` lag ${lagDays}d` : ""}${hard ? "" : " (soft)"} : ${pred.id} → ${succ.id}`,
        userId:   me?.id ?? null,
        storeId:  succ.storeId,
      },
    });
    return NextResponse.json({ dependency: created }, { status: 201 });
  } catch (e: any) {
    // Unique constraint violation → already exists
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Dependency already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
