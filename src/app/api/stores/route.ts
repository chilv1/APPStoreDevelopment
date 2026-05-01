import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const PHASES = [
    { phaseNumber: 1, name: "Tìm Kiếm Mặt Bằng", description: "Khảo sát, đăng ads, phối hợp broker, công ty BĐS" },
    { phaseNumber: 2, name: "Thẩm Định Mặt Bằng", description: "Kiểm tra pháp lý, kỹ thuật, thương mại" },
    { phaseNumber: 3, name: "Đàm Phán", description: "Đàm phán giá thuê, điều khoản, phụ lục" },
    { phaseNumber: 4, name: "Ký Kết Hợp Đồng", description: "Soạn thảo, legal review, công chứng" },
    { phaseNumber: 5, name: "Thiết Kế Cửa Hàng", description: "Brief thiết kế, chọn đơn vị, duyệt bản vẽ" },
    { phaseNumber: 6, name: "Xây Dựng & Cải Tạo", description: "Đấu thầu, khởi công, giám sát, nghiệm thu" },
    { phaseNumber: 7, name: "Trang Thiết Bị & CCDC", description: "Mua sắm thiết bị, lắp đặt IT, biển hiệu" },
    { phaseNumber: 8, name: "Tuyển Dụng Nhân Sự", description: "Đăng tuyển, phỏng vấn, ký HĐ, onboarding" },
    { phaseNumber: 9, name: "Đào Tạo", description: "Product training, quy trình, phần mềm" },
    { phaseNumber: 10, name: "Chuẩn Bị Khai Trương", description: "Nhập hàng, trưng bày, dry run, marketing" },
    { phaseNumber: 11, name: "Khai Trương & Vận Hành", description: "Grand Opening, KPI, báo cáo" },
  ];

  try { const store = await prisma.storeProject.create({
    data: {
      name:             body.name,
      code:             body.code,
      address:          body.address,
      region:           region || "—",
      businessCenterId: body.businessCenterId || null,
      targetOpenDate:   body.targetOpenDate ? new Date(body.targetOpenDate) : null,
      budget:           body.budget != null ? Number(body.budget) : null,
      latitude:         body.latitude  != null && body.latitude  !== "" ? Number(body.latitude)  : null,
      longitude:        body.longitude != null && body.longitude !== "" ? Number(body.longitude) : null,
      notes:            body.notes,
      pmId:             body.pmId || null,
      status: "PLANNING",
      progress: 0,
      phases: {
        create: PHASES.map((p) => ({
          phaseNumber: p.phaseNumber,
          name: p.name,
          description: p.description,
          status: "NOT_STARTED",
          order: p.phaseNumber,
        })),
      },
    },
    include: { phases: true, pm: true },
  });

  await prisma.activity.create({
    data: {
      storeId: store.id,
      userId: user.id,
      action: "STORE_CREATED",
      entity: "StoreProject",
      entityId: store.id,
      details: `Tạo dự án cửa hàng mới: ${store.name}`,
    },
  });

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
