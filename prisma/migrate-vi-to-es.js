#!/usr/bin/env node
/**
 * One-time migration: translate existing Vietnamese DB content to Spanish (Peru).
 *
 * Affects:
 *   - PhaseTemplate (11 master rows)  — name, description, taskTitles (JSON)
 *   - Phase (per-store, one per phaseNumber) — name, description (only if matches old VN template)
 *   - Task (per-phase) — title (only if matches old VN taskTitles[i])
 *
 * Idempotent: safe to run multiple times. Uses VN→ES mapping; if a row's content
 * doesn't match the old VN exactly, it's left as-is (admin/user customization preserved).
 *
 * Usage:
 *   node prisma/migrate-vi-to-es.js
 */
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbFile = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("file:", "")
  : path.join(__dirname, "../dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFile}` });
const prisma = new PrismaClient({ adapter });

// VN → ES mapping by phaseNumber. Source = old DEFAULT_PHASE_TEMPLATES (Vietnamese)
const VI_BY_NUMBER = {
  1: {
    name: "Tìm Kiếm Mặt Bằng",
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
  2: {
    name: "Thẩm Định Mặt Bằng",
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
  3: {
    name: "Đàm Phán",
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
  4: {
    name: "Ký Kết Hợp Đồng",
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
  5: {
    name: "Thiết Kế Cửa Hàng",
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
  6: {
    name: "Xây Dựng & Cải Tạo",
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
  7: {
    name: "Trang Thiết Bị & CCDC",
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
  8: {
    name: "Tuyển Dụng Nhân Sự",
    description: "Đăng tuyển, phỏng vấn, ký HĐ, onboarding",
    taskTitles: [
      "Xác định cơ cấu nhân sự (Store Manager, GDV, bảo vệ)",
      "Đăng tuyển dụng (website nội bộ, TopCV, Facebook)",
      "Phỏng vấn và lựa chọn ứng viên",
      "Ký hợp đồng lao động",
      "Làm thủ tục onboarding (nhân sự, đồng phục, thẻ)",
    ],
  },
  9: {
    name: "Đào Tạo",
    description: "Product training, quy trình, phần mềm",
    taskTitles: [
      "Đào tạo sản phẩm và dịch vụ (product training)",
      "Đào tạo quy trình bán hàng và CSKH",
      "Đào tạo phần mềm hệ thống (POS, CRM)",
      "Đào tạo kỹ năng mềm (giao tiếp, xử lý khiếu nại)",
      "Kiểm tra và đánh giá năng lực (test/assessment)",
    ],
  },
  10: {
    name: "Chuẩn Bị Khai Trương",
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
  11: {
    name: "Khai Trương & Vận Hành",
    description: "Grand Opening, KPI, báo cáo",
    taskTitles: [
      "Tổ chức lễ khai trương chính thức (Grand Opening)",
      "Theo dõi KPI tuần đầu tiên",
      "Báo cáo kết quả khai trương",
      "Rà soát và khắc phục sự cố sau khai trương",
      "Chuyển sang giai đoạn vận hành thường xuyên",
    ],
  },
};

const ES_BY_NUMBER = {
  1: {
    name: "Búsqueda de Local",
    description: "Inspección, anuncios, coordinación con brokers e inmobiliarias",
    taskTitles: [
      "Definir criterios del local (área, ubicación, densidad poblacional)",
      "Inspección directa de la zona objetivo",
      "Publicar anuncios de búsqueda (Facebook Ads, Google Ads, redes locales)",
      "Contactar y coordinar con brokers inmobiliarios",
      "Vincular con empresas inmobiliarias (CBRE, Colliers, agentes locales)",
      "Recopilar lista de locales potenciales",
      "Evaluar y rankear ubicaciones (matriz de scoring)",
      "Seleccionar top 3 ubicaciones para evaluación",
    ],
  },
  2: {
    name: "Evaluación del Local",
    description: "Verificación legal, técnica y comercial",
    taskTitles: [
      "Verificación legal (título de propiedad, licencias)",
      "Inspección técnica (electricidad, agua, estructura, internet)",
      "Evaluación comercial (flujo de clientes, competencia cercana)",
      "Elaborar informe de evaluación detallado",
      "Presentación interna y aprobación",
      "Selección oficial del local",
    ],
  },
  3: {
    name: "Negociación",
    description: "Negociar precio de alquiler, términos y anexos del contrato",
    taskTitles: [
      "Propuesta inicial de alquiler al propietario",
      "Negociar términos: plazo, depósito",
      "Negociar período de gracia durante construcción",
      "Negociar anexos: letreros, modificaciones",
      "Aprobación interna (workflow de aprobación)",
      "Recibir aprobación oficial",
    ],
  },
  4: {
    name: "Firma del Contrato",
    description: "Redacción, revisión legal, notarización",
    taskTitles: [
      "Redacción del contrato de alquiler",
      "Revisión legal del contrato",
      "Firma del contrato (notarización si es necesario)",
      "Pago del depósito y primer mes",
      "Recepción del local del propietario",
      "Archivo del expediente del contrato",
    ],
  },
  5: {
    name: "Diseño de la Tienda",
    description: "Brief de diseño, selección de empresa, aprobación de planos",
    taskTitles: [
      "Elaborar brief de diseño (brand guideline, área, concepto)",
      "Seleccionar empresa de diseño",
      "Aprobar plano de diseño preliminar (concepto)",
      "Aprobar plano técnico detallado",
      "Completar expediente de construcción",
      "Presupuesto de construcción",
    ],
  },
  6: {
    name: "Construcción y Remodelación",
    description: "Licitación, inicio de obra, supervisión, recepción",
    taskTitles: [
      "Licitación / asignación de constructor",
      "Firma de contrato con la constructora",
      "Inicio de obra",
      "Supervisión semanal del avance",
      "Recepción por partidas (electricidad, agua, pisos, techos, paredes)",
      "Recepción general y entrega",
      "Liquidación del contrato de construcción",
    ],
  },
  7: {
    name: "Equipamiento y Mobiliario",
    description: "Compra de equipos, instalación TI, letreros",
    taskTitles: [
      "Listar equipos a comprar (POS, computadoras, cámaras, mobiliario)",
      "Comprar o coordinar entrega desde almacén central",
      "Instalar equipos TI y realizar pruebas",
      "Conectar sistemas de venta (CRM, billing)",
      "Configurar red interna (LAN, WiFi, VPN)",
      "Instalar letreros, banners, posters (branding)",
      "Verificar funcionamiento de todos los equipos",
    ],
  },
  8: {
    name: "Reclutamiento de Personal",
    description: "Convocatoria, entrevistas, contratos, onboarding",
    taskTitles: [
      "Definir estructura de personal (Store Manager, vendedores, seguridad)",
      "Publicar convocatorias (web interna, LinkedIn, Bumeran, Computrabajo)",
      "Entrevistar y seleccionar candidatos",
      "Firmar contratos laborales",
      "Trámites de onboarding (RRHH, uniformes, fotochecks)",
    ],
  },
  9: {
    name: "Capacitación",
    description: "Capacitación de productos, procesos, sistemas",
    taskTitles: [
      "Capacitación de productos y servicios",
      "Capacitación de procesos de venta y atención al cliente",
      "Capacitación de sistemas (POS, CRM)",
      "Capacitación de habilidades blandas (comunicación, manejo de quejas)",
      "Evaluación y test de competencias",
    ],
  },
  10: {
    name: "Preparación para Apertura",
    description: "Recepción de mercadería, exhibición, dry run, marketing",
    taskTitles: [
      "Recepción inicial de mercadería (SIM, equipos, accesorios)",
      "Inventario e ingreso al sistema",
      "Setup de exhibición según planograma",
      "Operación de prueba (dry run / soft open)",
      "Verificación completa del sistema TI y transacciones",
      "Plan del evento de inauguración",
      "Preparación de marketing de apertura (flyers, redes sociales, SMS)",
    ],
  },
  11: {
    name: "Inauguración y Operación",
    description: "Grand Opening, monitoreo de KPI, reportes",
    taskTitles: [
      "Organizar la ceremonia oficial de apertura (Grand Opening)",
      "Monitorear KPI de la primera semana",
      "Reporte de resultados de inauguración",
      "Revisar y resolver incidencias post-apertura",
      "Transición a operación regular",
    ],
  },
};

async function main() {
  console.log("🌐 Migración VI → ES iniciando...\n");

  // 1) PhaseTemplate — upsert (creates if missing, updates if exists)
  console.log("📋 Actualizando PhaseTemplate (11 plantillas)...");
  let templatesUpdated = 0;
  for (const [num, es] of Object.entries(ES_BY_NUMBER)) {
    const phaseNumber = Number(num);
    await prisma.phaseTemplate.upsert({
      where: { phaseNumber },
      update: {
        name: es.name,
        description: es.description,
        taskTitles: JSON.stringify(es.taskTitles),
      },
      create: {
        phaseNumber,
        name: es.name,
        description: es.description,
        durationDays: 14, // sensible default; admin can edit
        taskTitles: JSON.stringify(es.taskTitles),
      },
    });
    templatesUpdated++;
  }
  console.log(`  ✅ ${templatesUpdated} plantillas actualizadas\n`);

  // 2) Phase rows (per-store) — only update if name matches old VN exactly (untouched)
  console.log("🏬 Actualizando Phase de tiendas existentes...");
  const phases = await prisma.phase.findMany();
  let phasesUpdated = 0, phasesSkipped = 0;
  for (const p of phases) {
    const vi = VI_BY_NUMBER[p.phaseNumber];
    const es = ES_BY_NUMBER[p.phaseNumber];
    if (!vi || !es) continue;
    const data = {};
    // Only translate if the field was never customized (matches the old VN default)
    if (p.name === vi.name) data.name = es.name;
    if (p.description === vi.description || !p.description) data.description = es.description;
    if (Object.keys(data).length > 0) {
      await prisma.phase.update({ where: { id: p.id }, data });
      phasesUpdated++;
    } else {
      phasesSkipped++;
    }
  }
  console.log(`  ✅ ${phasesUpdated} Phase actualizadas  ⏭️  ${phasesSkipped} Phase personalizadas (preservadas)\n`);

  // 3) Task rows — translate by matching old VN title to find new ES title
  console.log("✅ Actualizando Task de fases existentes...");
  const tasks = await prisma.task.findMany({
    include: { phase: { select: { phaseNumber: true } } },
  });
  let tasksUpdated = 0, tasksSkipped = 0;
  for (const t of tasks) {
    const phaseNum = t.phase?.phaseNumber;
    if (!phaseNum) continue;
    const vi = VI_BY_NUMBER[phaseNum];
    const es = ES_BY_NUMBER[phaseNum];
    if (!vi || !es) continue;
    const idx = vi.taskTitles.indexOf(t.title);
    if (idx >= 0 && es.taskTitles[idx]) {
      await prisma.task.update({ where: { id: t.id }, data: { title: es.taskTitles[idx] } });
      tasksUpdated++;
    } else {
      tasksSkipped++;
    }
  }
  console.log(`  ✅ ${tasksUpdated} Task actualizadas  ⏭️  ${tasksSkipped} Task personalizadas (preservadas)\n`);

  console.log("✨ Migración completada exitosamente!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
