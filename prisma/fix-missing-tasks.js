#!/usr/bin/env node
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbFile = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("file:", "")
  : path.join(__dirname, "../dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFile}` });
const prisma = new PrismaClient({ adapter });

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
  console.log("🔍 Tìm các giai đoạn chưa có task...");

  const phases = await prisma.phase.findMany({
    include: { tasks: { select: { id: true } } },
  });

  const emptyPhases = phases.filter((p) => p.tasks.length === 0);
  console.log(`📋 Tìm thấy ${emptyPhases.length} giai đoạn chưa có task (trên tổng ${phases.length})`);

  let totalCreated = 0;
  for (const phase of emptyPhases) {
    const taskTitles = TASKS_BY_PHASE[phase.phaseNumber];
    if (!taskTitles || taskTitles.length === 0) {
      console.log(`  ⚠️  Phase ${phase.phaseNumber} (${phase.name}) — không có template task`);
      continue;
    }

    await prisma.task.createMany({
      data: taskTitles.map((title, i) => ({
        title,
        status: "TODO",
        priority: i < 2 ? "HIGH" : "MEDIUM",
        phaseId: phase.id,
      })),
    });
    totalCreated += taskTitles.length;
    console.log(`  ✅ Phase ${phase.phaseNumber} (${phase.name}) — thêm ${taskTitles.length} tasks`);
  }

  console.log(`\n✅ Hoàn thành! Đã thêm ${totalCreated} tasks vào ${emptyPhases.length} giai đoạn.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
