#!/usr/bin/env node
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbFile = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace("file:", "") : path.join(__dirname, "../dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFile}` });
const prisma = new PrismaClient({ adapter });

const PHASES = [
  { phaseNumber: 1, name: "Tìm Kiếm Mặt Bằng", description: "Khảo sát, đăng ads, phối hợp broker, công ty BĐS" },
  { phaseNumber: 2, name: "Thẩm Định Mặt Bằng", description: "Kiểm tra pháp lý, kỹ thuật, thương mại, trình duyệt nội bộ" },
  { phaseNumber: 3, name: "Đàm Phán", description: "Đàm phán giá thuê, điều khoản, phụ lục hợp đồng" },
  { phaseNumber: 4, name: "Ký Kết Hợp Đồng", description: "Soạn thảo, legal review, công chứng, thanh toán đặt cọc" },
  { phaseNumber: 5, name: "Thiết Kế Cửa Hàng", description: "Brief thiết kế, chọn đơn vị, duyệt bản vẽ kỹ thuật" },
  { phaseNumber: 6, name: "Xây Dựng & Cải Tạo", description: "Đấu thầu, khởi công, giám sát, nghiệm thu, bàn giao" },
  { phaseNumber: 7, name: "Trang Thiết Bị & CCDC", description: "Mua sắm thiết bị, lắp đặt IT, hệ thống mạng, biển hiệu" },
  { phaseNumber: 8, name: "Tuyển Dụng Nhân Sự", description: "Đăng tuyển, phỏng vấn, ký HĐ lao động, onboarding" },
  { phaseNumber: 9, name: "Đào Tạo", description: "Product training, quy trình bán hàng, phần mềm, kỹ năng mềm" },
  { phaseNumber: 10, name: "Chuẩn Bị Khai Trương", description: "Nhập hàng, trưng bày, dry run, kế hoạch marketing khai trương" },
  { phaseNumber: 11, name: "Khai Trương & Vận Hành", description: "Grand Opening, theo dõi KPI tuần đầu, báo cáo khai trương" },
];

const TASKS_BY_PHASE = {
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

async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu...");

  await prisma.activity.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.task.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.storeProject.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.create({
    data: { name: "Nguyễn Admin", email: "admin@telecom.vn", password: hashedPassword, role: "ADMIN", region: "Toàn quốc" },
  });
  const areaManager = await prisma.user.create({
    data: { name: "Trần Quản Lý Vùng", email: "manager@telecom.vn", password: hashedPassword, role: "AREA_MANAGER", region: "Hồ Chí Minh" },
  });
  const pm1 = await prisma.user.create({
    data: { name: "Lê Văn PM", email: "pm@telecom.vn", password: hashedPassword, role: "PM", region: "Hồ Chí Minh" },
  });
  const pm2 = await prisma.user.create({
    data: { name: "Phạm Thị PM2", email: "pm2@telecom.vn", password: hashedPassword, role: "PM", region: "Hà Nội" },
  });
  const surveyor = await prisma.user.create({
    data: { name: "Hoàng Khảo Sát", email: "survey@telecom.vn", password: hashedPassword, role: "SURVEY_STAFF", region: "Hồ Chí Minh" },
  });

  console.log("✅ Tạo xong 5 users");

  const storesData = [
    { name: "Cửa Hàng Quận 1 - Nguyễn Huệ",    code: "HCM-Q1-001", address: "125 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM",                 region: "Hồ Chí Minh", status: "IN_PROGRESS", pmId: pm1.id, targetOpenDate: new Date("2025-09-01"), budget: 850000000, latitude: 10.7740,  longitude: 106.7031, activePhase: 6 },
    { name: "Cửa Hàng Quận 1 - Đồng Khởi",     code: "HCM-Q1-002", address: "8 Đồng Khởi, Bến Nghé, Quận 1, TP.HCM",                    region: "Hồ Chí Minh", status: "PLANNING",    pmId: pm1.id, targetOpenDate: new Date("2025-11-01"), budget: 780000000, latitude: 10.7732,  longitude: 106.7034, activePhase: 2 },
    { name: "Cửa Hàng Bình Thạnh - Xô Viết",   code: "HCM-BT-002", address: "302 Xô Viết Nghệ Tĩnh, Phường 25, Bình Thạnh, TP.HCM",     region: "Hồ Chí Minh", status: "IN_PROGRESS", pmId: pm1.id, targetOpenDate: new Date("2025-10-15"), budget: 650000000, latitude: 10.8012,  longitude: 106.7140, activePhase: 3 },
    { name: "Cửa Hàng Hoàn Kiếm - Hàng Bài",   code: "HN-HK-001",  address: "56 Hàng Bài, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",           region: "Hà Nội",       status: "PLANNING",    pmId: pm2.id, targetOpenDate: new Date("2025-12-01"), budget: 920000000, latitude: 21.0245,  longitude: 105.8412, activePhase: 1 },
    { name: "Cửa Hàng Đà Nẵng - Hùng Vương",   code: "DN-HV-001",  address: "72 Hùng Vương, Thạch Thang, Hải Châu, Đà Nẵng",           region: "Đà Nẵng",      status: "PLANNING",    pmId: pm2.id, targetOpenDate: new Date("2026-02-01"), budget: 720000000, latitude: 16.0671,  longitude: 108.2110, activePhase: 1 },
  ];

  for (const storeData of storesData) {
    const { activePhase, ...storeFields } = storeData;
    const store = await prisma.storeProject.create({ data: storeFields });

    for (const phaseTemplate of PHASES) {
      const phaseStatus = phaseTemplate.phaseNumber < activePhase ? "COMPLETED" : phaseTemplate.phaseNumber === activePhase ? "IN_PROGRESS" : "NOT_STARTED";
      const now = new Date();
      const plannedStart = new Date(now);
      plannedStart.setDate(plannedStart.getDate() + (phaseTemplate.phaseNumber - 1) * 14);
      const plannedEnd = new Date(plannedStart);
      plannedEnd.setDate(plannedEnd.getDate() + 14);

      const phase = await prisma.phase.create({
        data: {
          storeId: store.id,
          phaseNumber: phaseTemplate.phaseNumber,
          name: phaseTemplate.name,
          description: phaseTemplate.description,
          status: phaseStatus,
          order: phaseTemplate.phaseNumber,
          plannedStart,
          plannedEnd,
          actualStart: phaseStatus !== "NOT_STARTED" ? plannedStart : null,
          actualEnd: phaseStatus === "COMPLETED" ? plannedEnd : null,
        },
      });

      const taskTitles = TASKS_BY_PHASE[phaseTemplate.phaseNumber] || [];
      for (let i = 0; i < taskTitles.length; i++) {
        const taskStatus = phaseStatus === "COMPLETED" ? "DONE"
          : phaseStatus === "IN_PROGRESS" && i < Math.floor(taskTitles.length / 2) ? "DONE"
          : phaseStatus === "IN_PROGRESS" && i === Math.floor(taskTitles.length / 2) ? "IN_PROGRESS"
          : "TODO";

        const dueDate = new Date(plannedStart);
        dueDate.setDate(dueDate.getDate() + i * 2);

        await prisma.task.create({
          data: {
            phaseId: phase.id,
            title: taskTitles[i],
            status: taskStatus,
            priority: i === 0 ? "HIGH" : i === 1 ? "HIGH" : "MEDIUM",
            dueDate,
            completedAt: taskStatus === "DONE" ? dueDate : null,
            assigneeId: phaseTemplate.phaseNumber <= 2 ? surveyor.id : store.pmId,
          },
        });
      }
    }

    const completedPhases = activePhase - 1;
    const progress = Math.round((completedPhases / 11) * 100);
    await prisma.storeProject.update({ where: { id: store.id }, data: { progress } });

    if (storeData.activePhase >= 3) {
      await prisma.issue.create({
        data: {
          storeId: store.id,
          title: "Chủ nhà yêu cầu tăng giá thuê",
          description: "Chủ nhà đột ngột yêu cầu tăng giá thuê 15% so với thỏa thuận ban đầu",
          type: "RISK", severity: "HIGH",
          status: storeData.activePhase > 4 ? "RESOLVED" : "OPEN",
          reporterId: pm1.id,
          resolution: storeData.activePhase > 4 ? "Đã đàm phán thành công, đồng ý tăng 5% với điều kiện kéo dài hợp đồng thêm 1 năm" : null,
        },
      });
    }

    await prisma.activity.create({
      data: {
        storeId: store.id, userId: pm1.id,
        action: "PHASE_UPDATED", entity: "Phase", entityId: store.id,
        details: `Cập nhật giai đoạn ${activePhase} sang Đang thực hiện`,
      },
    });
    await prisma.activity.create({
      data: {
        storeId: store.id, userId: admin.id,
        action: "STORE_CREATED", entity: "StoreProject", entityId: store.id,
        details: `Tạo dự án cửa hàng mới: ${storeFields.name}`,
      },
    });
  }

  // Recalculate phase and store statuses from actual task data
  const allPhases = await prisma.phase.findMany({ include: { tasks: true } });
  for (const phase of allPhases) {
    if (phase.status === "BLOCKED") continue;
    const allDone = phase.tasks.length > 0 && phase.tasks.every(t => t.status === "DONE");
    const anyStarted = phase.tasks.some(t => t.status === "DONE" || t.status === "IN_PROGRESS");
    const newStatus = allDone ? "COMPLETED" : anyStarted ? "IN_PROGRESS" : "NOT_STARTED";
    if (newStatus !== phase.status) await prisma.phase.update({ where: { id: phase.id }, data: { status: newStatus } });
  }
  const allStores = await prisma.storeProject.findMany({ include: { phases: { include: { tasks: true } } } });
  for (const store of allStores) {
    const total = store.phases.reduce((s, p) => s + p.tasks.length, 0);
    const done  = store.phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "DONE").length, 0);
    const progress  = total > 0 ? Math.round(done / total * 100) : 0;
    const newStatus = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "PLANNING";
    await prisma.storeProject.update({ where: { id: store.id }, data: { status: newStatus, progress } });
  }

  console.log("✅ Tạo xong 3 cửa hàng với đầy đủ dữ liệu");
  console.log("\n📋 THÔNG TIN ĐĂNG NHẬP:");
  console.log("Admin:        admin@telecom.vn    / 123456");
  console.log("Area Manager: manager@telecom.vn  / 123456");
  console.log("PM:           pm@telecom.vn       / 123456");
  console.log("Survey Staff: survey@telecom.vn   / 123456");
}

main().catch(console.error).finally(() => prisma.$disconnect());
