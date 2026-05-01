// Default phase templates — used to seed PhaseTemplate table on first read.
// Admin can edit values via /phase-templates page; new stores will use the
// edited values. This file is the LAST-RESORT fallback when DB is empty.
//
// Content is in SPANISH (Peru) — primary language of the app.

export const DEFAULT_PHASE_TEMPLATES: {
  phaseNumber: number;
  name: string;
  description: string;
  durationDays: number;
  taskTitles: string[];
}[] = [
  {
    phaseNumber: 1, name: "Búsqueda de Local", durationDays: 30,
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
  {
    phaseNumber: 2, name: "Evaluación del Local", durationDays: 14,
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
  {
    phaseNumber: 3, name: "Negociación", durationDays: 21,
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
  {
    phaseNumber: 4, name: "Firma del Contrato", durationDays: 14,
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
  {
    phaseNumber: 5, name: "Diseño de la Tienda", durationDays: 21,
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
  {
    phaseNumber: 6, name: "Construcción y Remodelación", durationDays: 60,
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
  {
    phaseNumber: 7, name: "Equipamiento y Mobiliario", durationDays: 21,
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
  {
    phaseNumber: 8, name: "Reclutamiento de Personal", durationDays: 21,
    description: "Convocatoria, entrevistas, contratos, onboarding",
    taskTitles: [
      "Definir estructura de personal (Store Manager, vendedores, seguridad)",
      "Publicar convocatorias (web interna, LinkedIn, Bumeran, Computrabajo)",
      "Entrevistar y seleccionar candidatos",
      "Firmar contratos laborales",
      "Trámites de onboarding (RRHH, uniformes, fotochecks)",
    ],
  },
  {
    phaseNumber: 9, name: "Capacitación", durationDays: 14,
    description: "Capacitación de productos, procesos, sistemas",
    taskTitles: [
      "Capacitación de productos y servicios",
      "Capacitación de procesos de venta y atención al cliente",
      "Capacitación de sistemas (POS, CRM)",
      "Capacitación de habilidades blandas (comunicación, manejo de quejas)",
      "Evaluación y test de competencias",
    ],
  },
  {
    phaseNumber: 10, name: "Preparación para Apertura", durationDays: 14,
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
  {
    phaseNumber: 11, name: "Inauguración y Operación", durationDays: 30,
    description: "Grand Opening, monitoreo de KPI, reportes",
    taskTitles: [
      "Organizar la ceremonia oficial de apertura (Grand Opening)",
      "Monitorear KPI de la primera semana",
      "Reporte de resultados de inauguración",
      "Revisar y resolver incidencias post-apertura",
      "Transición a operación regular",
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
