// Default phase templates — used to seed PhaseTemplate table on first read.
// Admin can edit values via /phase-templates page; new stores will use the
// edited values. This file is the LAST-RESORT fallback when DB is empty.
//
// Content is in SPANISH (Peru) — primary language of the app.

export const DEFAULT_PHASE_TEMPLATES: {
  order: number;
  defaultDepType: string;
  name: string;
  description: string;
  durationDays: number;
  taskTitles: string[];
}[] = [
  {
    order: 1, defaultDepType: "FS", name: "Búsqueda de Local", durationDays: 30,
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
    order: 2, defaultDepType: "FS", name: "Evaluación del Local", durationDays: 14,
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
    order: 3, defaultDepType: "FS", name: "Negociación", durationDays: 21,
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
    order: 4, defaultDepType: "FS", name: "Firma del Contrato", durationDays: 14,
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
    order: 5, defaultDepType: "FS", name: "Diseño de la Tienda", durationDays: 21,
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
    order: 6, defaultDepType: "FS", name: "Construcción y Remodelación", durationDays: 60,
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
    order: 7, defaultDepType: "FS", name: "Equipamiento y Mobiliario", durationDays: 21,
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
    order: 8, defaultDepType: "FS", name: "Reclutamiento de Personal", durationDays: 21,
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
    order: 9, defaultDepType: "FS", name: "Capacitación", durationDays: 14,
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
    order: 10, defaultDepType: "FS", name: "Preparación para Apertura", durationDays: 14,
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
    order: 11, defaultDepType: "FS", name: "Inauguración y Operación", durationDays: 30,
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

// Lazy-init helper: ensures default rows exist, then returns them sorted by order.
export async function getOrInitPhaseTemplates() {
  const existing = await prisma.phaseTemplate.findMany({ orderBy: { order: "asc" } });
  if (existing.length > 0) return existing;

  // Seed defaults when DB is empty
  await prisma.phaseTemplate.createMany({
    data: DEFAULT_PHASE_TEMPLATES.map((t) => ({
      order: t.order,
      defaultDepType: t.defaultDepType,
      name: t.name,
      description: t.description,
      durationDays: t.durationDays,
      taskTitles: JSON.stringify(t.taskTitles),
    })),
  });

  return prisma.phaseTemplate.findMany({ orderBy: { order: "asc" } });
}

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Add a new phase (from a newly created template) to ALL existing stores.
 * Inserts the phase at `templateOrder`, shifts later phases up.
 */
export async function addTemplateToAllStores(
  templateOrder: number,
  templateId: string,
  templateName: string,
  templateDescription: string | null,
  durationDays: number,
  taskTitles: string[],
  defaultDepType: string,
  defaultPredOrder: number | null = null,
  defaultLagDays: number = 0,
): Promise<number> {
  const allStores = await prisma.storeProject.findMany({ select: { id: true } });
  if (allStores.length === 0) return 0;

  let affectedStores = 0;

  for (const store of allStores) {
    const phases = await prisma.phase.findMany({
      where: { storeId: store.id },
      orderBy: { order: "asc" },
    });

    // Shift phases at order >= templateOrder upward (high-to-low to avoid conflicts)
    const toShift = phases.filter((p) => p.order >= templateOrder).sort((a, b) => b.order - a.order);
    for (const p of toShift) {
      await prisma.phase.update({
        where: { id: p.id },
        data: { order: p.order + 1, phaseNumber: p.phaseNumber + 1 },
      });
    }

    // Resolve predecessor: explicit defaultPredOrder, or auto = templateOrder - 1
    const predOrder = defaultPredOrder ?? templateOrder - 1;
    const predecessor = phases.find((p) => p.order === predOrder);

    // Compute dates for the new phase based on dep type + lag
    let plannedStart: Date | null = null;
    let plannedEnd:   Date | null = null;
    let dependsOnId:  string | null = null;
    const lagMs = defaultLagDays * DAY_MS;
    const durMs = durationDays * DAY_MS;

    if (predecessor?.plannedEnd && predecessor?.plannedStart) {
      const ps = new Date(predecessor.plannedStart).getTime();
      const pe = new Date(predecessor.plannedEnd).getTime();
      let startMs: number;
      if      (defaultDepType === "SS") startMs = ps + lagMs;
      else if (defaultDepType === "FF") startMs = pe + lagMs - durMs;
      else if (defaultDepType === "SF") startMs = ps + lagMs - durMs;
      else                              startMs = pe + lagMs; // FS
      plannedStart = new Date(startMs);
      plannedEnd   = new Date(startMs + durMs);
      dependsOnId  = predecessor.id;
    }

    const newPhase = await prisma.phase.create({
      data: {
        phaseNumber: templateOrder,
        order: templateOrder,
        name: templateName,
        description: templateDescription ?? "",
        status: "NOT_STARTED",
        dependencyType: defaultDepType,
        dependsOnId,
        lagDays: defaultLagDays,
        plannedStart,
        plannedEnd,
        storeId: store.id,
        tasks: {
          create: taskTitles.filter(Boolean).map((title, i) => ({
            title,
            status: "TODO",
            priority: i < 2 ? "HIGH" : "MEDIUM",
          })),
        },
      },
    });

    // Update the phase that was previously at templateOrder (now templateOrder+1)
    // so its dependsOnId points to the new phase instead of the predecessor
    const nextPhase = await prisma.phase.findFirst({
      where: { storeId: store.id, order: templateOrder + 1 },
    });
    if (nextPhase) {
      await prisma.phase.update({
        where: { id: nextPhase.id },
        data: { dependsOnId: newPhase.id },
      });
    }

    // Update store's targetOpenDate = end of last phase
    const lastPhase = await prisma.phase.findFirst({
      where: { storeId: store.id },
      orderBy: { order: "desc" },
    });
    if (lastPhase?.plannedEnd) {
      await prisma.storeProject.update({
        where: { id: store.id },
        data: { targetOpenDate: lastPhase.plannedEnd },
      });
    }

    affectedStores++;
  }

  return affectedStores;
}

/**
 * Remove a phase at `templateOrder` from ALL existing stores.
 * Shifts later phases down and re-links dependencies.
 * Returns { storesAffected, phasesDeleted, tasksDeleted }.
 */
export async function removeTemplateFromAllStores(templateOrder: number): Promise<{
  storesAffected: number;
  phasesDeleted: number;
}> {
  const allStores = await prisma.storeProject.findMany({ select: { id: true } });
  let phasesDeleted = 0;

  for (const store of allStores) {
    const phases = await prisma.phase.findMany({
      where: { storeId: store.id },
      orderBy: { order: "asc" },
    });

    const target = phases.find((p) => p.order === templateOrder);
    if (!target) continue;

    // Re-link phases that depended on the target to skip over it
    const dependents = phases.filter((p) => p.dependsOnId === target.id);
    for (const dep of dependents) {
      await prisma.phase.update({
        where: { id: dep.id },
        data: { dependsOnId: target.dependsOnId ?? null },
      });
    }

    // Delete the target phase (cascade: tasks, notes)
    await prisma.phase.delete({ where: { id: target.id } });
    phasesDeleted++;

    // Shift later phases down (low-to-high to avoid conflicts)
    const toShift = phases
      .filter((p) => p.order > templateOrder && p.id !== target.id)
      .sort((a, b) => a.order - b.order);

    for (const p of toShift) {
      await prisma.phase.update({
        where: { id: p.id },
        data: { order: p.order - 1, phaseNumber: p.phaseNumber - 1 },
      });
    }

    // Update store targetOpenDate
    const lastPhase = await prisma.phase.findFirst({
      where: { storeId: store.id },
      orderBy: { order: "desc" },
    });
    if (lastPhase?.plannedEnd) {
      await prisma.storeProject.update({
        where: { id: store.id },
        data: { targetOpenDate: lastPhase.plannedEnd },
      });
    }
  }

  return { storesAffected: allStores.length, phasesDeleted };
}

/**
 * Apply a name/description change from a template to all existing stores.
 */
export async function applyNameChangeToAllStores(
  templateOrder: number,
  name: string,
  description: string | null
): Promise<number> {
  const result = await prisma.phase.updateMany({
    where: { order: templateOrder },
    data: { name, description: description ?? "" },
  });
  return result.count;
}

/**
 * Apply a dependency CONFIG (type + predecessor + lag) change from a template to all existing stores.
 * For each store: find phase at templateOrder, set its dependsOnId to phase at predOrder
 * (or order-1 if predOrder is null), then cascade dates downstream.
 */
export async function applyDepConfigToAllStores(
  templateOrder: number,
  dependencyType: string,
  defaultPredOrder: number | null,
  lagDays: number,
): Promise<number> {
  const { cascadeDependents } = await import("@/lib/phase-scheduler");
  const stores = await prisma.storeProject.findMany({ select: { id: true } });
  let touched = 0;

  for (const store of stores) {
    const target = await prisma.phase.findFirst({
      where: { storeId: store.id, order: templateOrder },
      select: { id: true },
    });
    if (!target) continue;

    // Resolve predecessor by order (auto = templateOrder - 1)
    const predOrder = defaultPredOrder ?? templateOrder - 1;
    let dependsOnId: string | null = null;
    if (predOrder >= 1) {
      const pred = await prisma.phase.findFirst({
        where: { storeId: store.id, order: predOrder },
        select: { id: true },
      });
      dependsOnId = pred?.id ?? null;
    }

    await prisma.phase.update({
      where: { id: target.id },
      data: { dependencyType, dependsOnId, lagDays },
    });

    // Recompute target phase's own dates from its predecessor (if any)
    if (dependsOnId) {
      const updated = await prisma.phase.findUnique({
        where: { id: target.id },
        select: { plannedStart: true, plannedEnd: true },
      });
      const pred = await prisma.phase.findUnique({
        where: { id: dependsOnId },
        select: { plannedStart: true, plannedEnd: true },
      });
      if (pred?.plannedStart && pred?.plannedEnd && updated?.plannedStart && updated?.plannedEnd) {
        const lagMs = lagDays * DAY_MS;
        const durMs = new Date(updated.plannedEnd).getTime() - new Date(updated.plannedStart).getTime();
        let startMs: number;
        if      (dependencyType === "SS") startMs = new Date(pred.plannedStart).getTime() + lagMs;
        else if (dependencyType === "FF") startMs = new Date(pred.plannedEnd).getTime()   + lagMs - durMs;
        else if (dependencyType === "SF") startMs = new Date(pred.plannedStart).getTime() + lagMs - durMs;
        else                              startMs = new Date(pred.plannedEnd).getTime()   + lagMs;
        await prisma.phase.update({
          where: { id: target.id },
          data: { plannedStart: new Date(startMs), plannedEnd: new Date(startMs + durMs) },
        });
      }
    }

    // Cascade downstream phases
    await cascadeDependents(target.id, prisma as any);
    touched++;
  }
  return touched;
}
