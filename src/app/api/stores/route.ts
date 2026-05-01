import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrInitPhaseTemplates } from "@/lib/phase-templates";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  
  const where = user.role === "PM"
    ? { pm: { email: user.email } }
    : user.role === "AREA_MANAGER"
    ? user.branchId
      ? { bc: { branchId: user.branchId } }
      : { region: user.region }
    : {};

  const stores = await prisma.storeProject.findMany({
    where,
    include: {
      pm: { select: { id: true, name: true, email: true, role: true } },
      bc: { include: { branch: { select: { id: true, name: true, code: true } } } },
      phases: { orderBy: { phaseNumber: "asc" } },
      _count: { select: { issues: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(stores);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.name?.trim()) return NextResponse.json({ error: "Tên cửa hàng là bắt buộc" }, { status: 400 });
  if (!body.code?.trim()) return NextResponse.json({ error: "Mã dự án là bắt buộc" }, { status: 400 });
  if (!body.address?.trim()) return NextResponse.json({ error: "Địa chỉ là bắt buộc" }, { status: 400 });

  // Resolve region from BC's branch (region column is NOT NULL in DB)
  let region = body.region || "";
  if (body.businessCenterId && !region) {
    const bc = await prisma.businessCenter.findUnique({
      where: { id: body.businessCenterId },
      include: { branch: { select: { name: true } } },
    });
    if (bc?.branch?.name) region = bc.branch.name;
  }

  // === Pull phase templates from DB (admin-configurable) ===
  const templates = await getOrInitPhaseTemplates(); // 11 records, sorted by phaseNumber
  const tplByNumber = new Map(templates.map(t => [t.phaseNumber, t]));

  // Compute planned dates: start from body.projectStartDate (or today), accumulate durationDays
  // Parse YYYY-MM-DD as LOCAL (not UTC) to avoid timezone shifts that desync FE preview from BE storage.
  const parseLocalDate = (s: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  const projectStart = (body.projectStartDate && parseLocalDate(body.projectStartDate)) || new Date();
  projectStart.setHours(0, 0, 0, 0);
  let cursor = new Date(projectStart);
  const plannedDates = templates.map((t) => {
    const plannedStart = new Date(cursor);
    const plannedEnd = new Date(cursor);
    plannedEnd.setDate(plannedEnd.getDate() + t.durationDays);
    cursor = new Date(plannedEnd);
    return { plannedStart, plannedEnd };
  });

  // Server-authoritative targetOpenDate: end of last phase (= projectStart + total durations)
  const computedTargetOpenDate = plannedDates.length > 0
    ? plannedDates[plannedDates.length - 1].plannedEnd
    : null;

  try { const store = await prisma.storeProject.create({
    data: {
      name:             body.name,
      code:             body.code,
      address:          body.address,
      region:           region || "—",
      businessCenterId: body.businessCenterId || null,
      targetOpenDate:   computedTargetOpenDate ?? (body.targetOpenDate ? new Date(body.targetOpenDate) : null),
      budget:           body.budget != null ? Number(body.budget) : null,
      latitude:         body.latitude  != null && body.latitude  !== "" ? Number(body.latitude)  : null,
      longitude:        body.longitude != null && body.longitude !== "" ? Number(body.longitude) : null,
      notes:            body.notes,
      pmId:             body.pmId || null,
      status: "PLANNING",
      progress: 0,
      phases: {
        create: templates.map((tpl, idx) => {
          const taskTitles: string[] = (() => {
            try { return JSON.parse(tpl.taskTitles); } catch { return []; }
          })();
          return {
            phaseNumber: tpl.phaseNumber,
            name:        tpl.name,
            description: tpl.description ?? "",
            status:      "NOT_STARTED",
            order:       tpl.phaseNumber,
            plannedStart: plannedDates[idx].plannedStart,
            plannedEnd:   plannedDates[idx].plannedEnd,
            tasks: {
              create: taskTitles.filter(Boolean).map((title, i) => ({
                title,
                status: "TODO",
                priority: i < 2 ? "HIGH" : "MEDIUM",
              })),
            },
          };
        }),
      },
    },
    include: { phases: true, pm: true },
  });

  // Verify user exists in DB (session might have stale ID after re-seed)
  const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
  try { await prisma.activity.create({
    data: {
      storeId: store.id,
      userId: dbUser ? user.id : null,
      action: "STORE_CREATED",
      entity: "StoreProject",
      entityId: store.id,
      details: `Tạo dự án cửa hàng mới: ${store.name}`,
    },
  }); } catch { /* activity log là non-critical */ }

  return NextResponse.json(store, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Lỗi tạo cửa hàng";
    const isDuplicate = msg.includes("Unique constraint") || e?.code === "P2002";
    return NextResponse.json(
      { error: isDuplicate ? `Mã dự án "${body.code}" đã tồn tại` : msg },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
