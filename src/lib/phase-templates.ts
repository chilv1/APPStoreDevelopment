// Default phase templates — used to seed PhaseTemplate table on first read.
// Admin can edit values via /phase-templates page; new stores will use the
// edited values. This file is the LAST-RESORT fallback when DB is empty.

export const DEFAULT_PHASE_TEMPLATES: {
  phaseNumber: number;
  name: string;
  description: string;
  durationDays: number;
  taskTitles: string[];
}[] = [
  {
    phaseNumber: 1, name: "Tìm Kiếm Mặt Bằng", durationDays: 30,
    description: "Khảo sát, đăng ads, phối hợp broker, công ty BĐS",
    taskTitles: [
      "Xác định tiêu chí mặt bằng (diện tích, vị trí, mật độ dân số)",
      "Khảo sát trực tiếp khu vực mục tiêu",
      "Đăng quảng cáo tìm mặt bằng (Facebook Ads, Google Ads, Zalo)",
      "Liên hệ và phối hợp với Broker bất động sản",
      "Liên kết công ty BĐS (CBRE, Savills, local agents)",
      "Thu thập danh sách mặt bằng tiềm năng",
      "Chấm điểm và xếp hạng vị trí (scoring matrix)",
      "Chọn top 3 vị trí để thẩm định",
    ],
  },
  {
    phaseNumber: 2, name: "Thẩm Định Mặt Bằng", durationDays: 14,
    description: "Kiểm tra pháp lý, kỹ thuật, thương mại",
    taskTitles: [
      "Kiểm tra pháp lý (sổ đỏ, giấy phép kinh doanh)",
      "Khảo sát kỹ thuật (điện, nước, kết cấu, internet)",
      "Đánh giá thương mại (lưu lượng khách, đối thủ xung quanh)",
      "Lập báo cáo thẩm định chi tiết",
      "Trình duyệt nội bộ và nhận phê duyệt",
      "Chọn mặt bằng chính thức",
    ],
  },
  {
    phaseNumber: 3, name: "Đàm Phán", durationDays: 21,
    description: "Đàm phán giá thuê, điều khoản, phụ lục",
    taskTitles: [
      "Đề xuất giá thuê ban đầu với chủ nhà",
      "Đàm phán điều khoản: thời hạn, tiền đặt cọc",
      "Đàm phán miễn phí thuê thời gian xây dựng (rent free period)",
      "Đàm phán điều khoản phụ lục: biển hiệu, sửa chữa",
      "Trình phê duyệt nội bộ (approval workflow)",
      "Nhận phê duyệt chính thức",
    ],
  },
  {
    phaseNumber: 4, name: "Ký Kết Hợp Đồng", durationDays: 14,
    description: "Soạn thảo, legal review, công chứng",
    taskTitles: [
      "Soạn thảo hợp đồng thuê mặt bằng",
      "Legal review hợp đồng",
      "Ký hợp đồng (công chứng nếu cần)",
      "Thanh toán tiền đặt cọc và tháng đầu",
      "Nhận bàn giao mặt bằng từ chủ nhà",
      "Lưu trữ hồ sơ hợp đồng",
    ],
  },
  {
    phaseNumber: 5, name: "Thiết Kế Cửa Hàng", durationDays: 21,
    description: "Brief thiết kế, chọn đơn vị, duyệt bản vẽ",
    taskTitles: [
      "Lập brief thiết kế (brand guideline, diện tích, concept)",
      "Chọn đơn vị thiết kế",
      "Phê duyệt bản vẽ thiết kế sơ bộ (concept)",
      "Phê duyệt bản vẽ kỹ thuật chi tiết",
      "Hoàn thiện hồ sơ thi công",
      "Dự toán chi phí xây dựng",
    ],
  },
  {
    phaseNumber: 6, name: "Xây Dựng & Cải Tạo", durationDays: 60,
    description: "Đấu thầu, khởi công, giám sát, nghiệm thu",
    taskTitles: [
      "Đấu thầu / chỉ định thầu thi công",
      "Ký hợp đồng với đơn vị thi công",
      "Khởi công thi công",
      "Giám sát tiến độ thi công hàng tuần",
      "Nghiệm thu từng hạng mục (điện, nước, sàn, trần, vách)",
      "Nghiệm thu tổng thể và bàn giao",
      "Thanh lý hợp đồng thi công",
    ],
  },
  {
    phaseNumber: 7, name: "Trang Thiết Bị & CCDC", durationDays: 21,
    description: "Mua sắm thiết bị, lắp đặt IT, biển hiệu",
    taskTitles: [
      "Lập danh sách thiết bị cần mua (POS, máy tính, camera, bàn ghế)",
      "Đặt mua hoặc phối hợp cấp phát từ kho trung tâm",
      "Lắp đặt thiết bị IT và kiểm thử",
      "Kết nối hệ thống phần mềm bán hàng (CRM, billing)",
      "Setup mạng nội bộ (LAN, WiFi, VPN)",
      "Lắp đặt biển hiệu, banner, poster (branding)",
      "Kiểm tra toàn bộ thiết bị hoạt động ổn định",
    ],
  },
  {
    phaseNumber: 8, name: "Tuyển Dụng Nhân Sự", durationDays: 21,
    description: "Đăng tuyển, phỏng vấn, ký HĐ, onboarding",
    taskTitles: [
      "Xác định cơ cấu nhân sự (Store Manager, GDV, bảo vệ)",
      "Đăng tuyển dụng (website nội bộ, TopCV, Facebook)",
      "Phỏng vấn và lựa chọn ứng viên",
      "Ký hợp đồng lao động",
      "Làm thủ tục onboarding (nhân sự, đồng phục, thẻ)",
    ],
  },
  {
    phaseNumber: 9, name: "Đào Tạo", durationDays: 14,
    description: "Product training, quy trình, phần mềm",
    taskTitles: [
      "Đào tạo sản phẩm và dịch vụ (product training)",
      "Đào tạo quy trình bán hàng và CSKH",
      "Đào tạo phần mềm hệ thống (POS, CRM)",
      "Đào tạo kỹ năng mềm (giao tiếp, xử lý khiếu nại)",
      "Kiểm tra và đánh giá năng lực (test/assessment)",
    ],
  },
  {
    phaseNumber: 10, name: "Chuẩn Bị Khai Trương", durationDays: 14,
    description: "Nhập hàng, trưng bày, dry run, marketing",
    taskTitles: [
      "Nhập hàng hóa ban đầu (SIM, thiết bị, phụ kiện)",
      "Kiểm kê và nhập kho hàng hóa",
      "Setup trưng bày sản phẩm theo planogram",
      "Vận hành thử (dry run / soft open)",
      "Kiểm tra toàn bộ hệ thống IT và giao dịch",
      "Lập kế hoạch sự kiện khai trương",
      "Chuẩn bị marketing khai trương (flyer, social media, SMS)",
    ],
  },
  {
    phaseNumber: 11, name: "Khai Trương & Vận Hành", durationDays: 30,
    description: "Grand Opening, KPI, báo cáo",
    taskTitles: [
      "Tổ chức lễ khai trương chính thức (Grand Opening)",
      "Theo dõi KPI tuần đầu tiên",
      "Báo cáo kết quả khai trương",
      "Rà soát và khắc phục sự cố sau khai trương",
      "Chuyển sang giai đoạn vận hành thường xuyên",
    ],
  },
];

import { prisma } from "@/lib/db";

// Lazy-init helper: ensures the 11 default rows exist, then returns them sorted.
export async function getOrInitPhaseTemplates() {
  const existing = await prisma.phaseTemplate.findMany({ orderBy: { phaseNumber: "asc" } });
  if (existing.length === 11) return existing;

  // Upsert any missing rows from defaults (preserves any admin edits that exist)
  const existingNumbers = new Set(existing.map(t => t.phaseNumber));
  const missing = DEFAULT_PHASE_TEMPLATES.filter(t => !existingNumbers.has(t.phaseNumber));
  if (missing.length > 0) {
    await prisma.phaseTemplate.createMany({
      data: missing.map(t => ({
        phaseNumber: t.phaseNumber,
        name: t.name,
        description: t.description,
        durationDays: t.durationDays,
        taskTitles: JSON.stringify(t.taskTitles),
      })),
    });
  }
  return prisma.phaseTemplate.findMany({ orderBy: { phaseNumber: "asc" } });
}
