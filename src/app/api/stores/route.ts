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

  const TASKS_BY_PHASE: Record<number, string[]> = {
    1: [
      "Xác định tiêu chí mặt bằng (diện tích, vị trí, mật độ dân số)",
      "Khảo sát trực tiếp khu vực mục tiêu",
      "Đăng quảng cáo tìm mặt bằng (Facebook Ads, Google Ads, Zalo)",
      "Liên hệ và phối hợp với Broker bất động sản",
      "Liên kết công ty BĐS (CBRE, Savills, local agents)",
      "Thu thập danh sách mặt bằng tiềm năng",
      "Chấm điểm và xếp hạng vị trí (scoring matrix)",
      "Chọn top 3 vị trí để thẩm định",
    ],
    2: [
      "Kiểm tra pháp lý (sổ đỏ, giấy phép kinh doanh)",
      "Khảo sát kỹ thuật (điện, nước, kết cấu, internet)",
      "Đánh giá thương mại (lưu lượng khách, đối thủ xung quanh)",
      "Lập báo cáo thẩm định chi tiết",
      "Trình duyệt nội bộ và nhận phê duyệt",
      "Chọn mặt bằng chính thức",
    ],
    3: [
      "Đề xuất giá thuê ban đầu với chủ nhà",
      "Đàm phán điều khoản: thời hạn, tiền đặt cọc",
      "Đàm phán miễn phí thuê thời gian xây dựng (rent free period)",
      "Đàm phán điều khoản phụ lục: biển hiệu, sửa chữa",
      "Trình phê duyệt nội bộ (approval workflow)",
      "Nhận phê duyệt chính thức",
    ],
    4: [
      "Soạn thảo hợp đồng thuê mặt bằng",
      "Legal review hợp đồng",
      "Ký hợp đồng (công chứng nếu cần)",
      "Thanh toán tiền đặt cọc và tháng đầu",
      "Nhận bàn giao mặt bằng từ chủ nhà",
      "Lưu trữ hồ sơ hợp đồng",
    ],
    5: [
      "Lập brief thiết kế (brand guideline, diện tích, concept)",
      "Chọn đơn vị thiết kế",
      "Phê duyệt bản vẽ thiết kế sơ bộ (concept)",
      "Phê duyệt bản vẽ kỹ thuật chi tiết",
      "Hoàn thiện hồ sơ thi công",
      "Dự toán chi phí xây dựng",
    ],
    6: [
      "Đấu thầu / chỉ định thầu thi công",
      "Ký hợp đồng với đơn vị thi công",
      "Khởi công thi công",
      "Giám sát tiến độ thi công hàng tuần",
      "Nghiệm thu từng hạng mục (điện, nước, sàn, trần, vách)",
      "Nghiệm thu tổng thể và bàn giao",
      "Thanh lý hợp đồng thi công",
    ],
    7: [
      "Lập danh sách thiết bị cần mua (POS, máy tính, camera, bàn ghế)",
      "Đặt mua hoặc phối hợp cấp phát từ kho trung tâm",
      "Lắp đặt thiết bị IT và kiểm thử",
      "Kết nối hệ thống phần mềm bán hàng (CRM, billing)",
      "Setup mạng nội bộ (LAN, WiFi, VPN)",
      "Lắp đặt biển hiệu, banner, poster (branding)",
      "Kiểm tra toàn bộ thiết bị hoạt động ổn định",
    ],
    8: [
      "Xác định cơ cấu nhân sự (Store Manager, GDV, bảo vệ)",
      "Đăng tuyển dụng (website nội bộ, TopCV, Facebook)",
      "Phỏng vấn và lựa chọn ứng viên",
      "Ký hợp đồng lao động",
      "Làm thủ tục onboarding (nhân sự, đồng phục, thẻ)",
    ],
    9: [
      "Đào tạo sản phẩm và dịch vụ (product training)",
      "Đào tạo quy trình bán hàng và CSKH",
      "Đào tạo phần mềm hệ thống (POS, CRM)",
      "Đào tạo kỹ năng mềm (giao tiếp, xử lý khiếu nại)",
      "Kiểm tra và đánh giá năng lực (test/assessment)",
    ],
    10: [
      "Nhập hàng hóa ban đầu (SIM, thiết bị, phụ kiện)",
      "Kiểm kê và nhập kho hàng hóa",
      "Setup trưng bày sản phẩm theo planogram",
      "Vận hành thử (dry run / soft open)",
      "Kiểm tra toàn bộ hệ thống IT và giao dịch",
      "Lập kế hoạch sự kiện khai trương",
      "Chuẩn bị marketing khai trương (flyer, social media, SMS)",
    ],
    11: [
      "Tổ chức lễ khai trương chính thức (Grand Opening)",
      "Theo dõi KPI tuần đầu tiên",
      "Báo cáo kết quả khai trương",
      "Rà soát và khắc phục sự cố sau khai trương",
      "Chuyển sang giai đoạn vận hành thường xuyên",
    ],
  };

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
          tasks: {
            create: (TASKS_BY_PHASE[p.phaseNumber] || []).map((title, i) => ({
              title,
              status: "TODO",
              priority: i < 2 ? "HIGH" : "MEDIUM",
            })),
          },
        })),
      },
    },
    include: { phases: true, pm: true },
  });

  // Verify user exists in DB (session might have stale ID after re-seed)
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
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
