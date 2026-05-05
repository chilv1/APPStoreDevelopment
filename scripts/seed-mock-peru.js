// Seed dummy data for stability/UI testing.
//
// Creates 25 mock branches matching Peru's 24 departamentos + Callao,
// realistic BCs, stores (with phases + tasks + issues), and branch staff.
// Every record gets a "PE_" / "mock_" prefix so cleanup-mock-peru.js can
// remove ONLY this seed without touching real data.
//
// Works with the new dynamic-phase schema:
//   - PhaseTemplate keyed by `order` (not phaseNumber @id)
//   - Phase has dependencyType, dependsOnId, lagDays
//
// Usage:
//   Local:  DATABASE_URL="file:./dev.db"        node scripts/seed-mock-peru.js
//   VPS:    DATABASE_URL="file:./data/prod.db"  node scripts/seed-mock-peru.js
//
// Idempotent: branches/users upserted; stores skipped if branch already has 10.
// Run cleanup-mock-peru.js first for a completely fresh seed.

const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

// ── Reference data ──────────────────────────────────────────────────────────

const PERU_ZONES = [
  { code: "AMA", name: "Amazonas",       city: "Chachapoyas",      lat: -6.23,  lng: -77.86 },
  { code: "ANC", name: "Áncash",         city: "Huaraz",           lat: -9.52,  lng: -77.53 },
  { code: "APU", name: "Apurímac",       city: "Abancay",          lat: -13.63, lng: -72.88 },
  { code: "ARE", name: "Arequipa",       city: "Arequipa",         lat: -16.40, lng: -71.55 },
  { code: "AYA", name: "Ayacucho",       city: "Ayacucho",         lat: -13.16, lng: -74.22 },
  { code: "CAJ", name: "Cajamarca",      city: "Cajamarca",        lat: -7.16,  lng: -78.51 },
  { code: "CAL", name: "Callao",         city: "Callao",           lat: -12.06, lng: -77.13 },
  { code: "CUS", name: "Cusco",          city: "Cusco",            lat: -13.53, lng: -71.97 },
  { code: "HVC", name: "Huancavelica",   city: "Huancavelica",     lat: -12.79, lng: -74.97 },
  { code: "HUC", name: "Huánuco",        city: "Huánuco",          lat: -9.93,  lng: -76.24 },
  { code: "ICA", name: "Ica",            city: "Ica",              lat: -14.07, lng: -75.73 },
  { code: "JUN", name: "Junín",          city: "Huancayo",         lat: -12.07, lng: -75.21 },
  { code: "LAL", name: "La Libertad",    city: "Trujillo",         lat: -8.11,  lng: -79.03 },
  { code: "LAM", name: "Lambayeque",     city: "Chiclayo",         lat: -6.77,  lng: -79.84 },
  { code: "LIM", name: "Lima",           city: "Lima",             lat: -12.04, lng: -77.03 },
  { code: "LOR", name: "Loreto",         city: "Iquitos",          lat: -3.75,  lng: -73.25 },
  { code: "MDD", name: "Madre de Dios",  city: "Puerto Maldonado", lat: -12.59, lng: -69.18 },
  { code: "MOQ", name: "Moquegua",       city: "Moquegua",         lat: -17.20, lng: -70.93 },
  { code: "PAS", name: "Pasco",          city: "Cerro de Pasco",   lat: -10.68, lng: -76.26 },
  { code: "PIU", name: "Piura",          city: "Piura",            lat: -5.19,  lng: -80.63 },
  { code: "PUN", name: "Puno",           city: "Puno",             lat: -15.84, lng: -70.02 },
  { code: "SMA", name: "San Martín",     city: "Moyobamba",        lat: -6.03,  lng: -76.97 },
  { code: "TAC", name: "Tacna",          city: "Tacna",            lat: -18.01, lng: -70.25 },
  { code: "TUM", name: "Tumbes",         city: "Tumbes",           lat: -3.57,  lng: -80.46 },
  { code: "UCA", name: "Ucayali",        city: "Pucallpa",         lat: -8.38,  lng: -74.55 },
];

const TTKD_POOL = [
  "TTKD Centro", "TTKD Norte", "TTKD Sur", "TTKD Este", "TTKD Oeste",
  "TTKD Plaza Mayor", "TTKD Mall Premium", "TTKD Express", "TTKD Lite", "TTKD Comercial",
];

const STREET_POOL = [
  "Av. Larco", "Jr. de la Unión", "Av. Arequipa", "Av. Brasil", "Av. Salaverry",
  "Av. La Marina", "Av. Javier Prado", "Av. Petit Thouars", "Av. Aviación",
  "Av. Tacna", "Av. Garcilaso", "Av. El Sol", "Av. España", "Av. América",
  "Av. Bolognesi", "Av. Grau", "Av. Sucre", "Av. Bolívar",
];

const ISSUE_TITLES = [
  "Atraso en permisos municipales",
  "Problemas con proveedor de equipamiento",
  "Falta de personal capacitado",
  "Demora en aprobación de diseño",
  "Conflicto con propietario sobre cláusulas del contrato",
  "Retraso en obras de construcción por lluvias",
  "Falla en sistema POS antes de inauguración",
  "Marketing no entregó signage a tiempo",
  "Necesidad de reubicar entrada por normativa de bomberos",
  "Costo de reforma supera presupuesto",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function statusDistribution() {
  // 3 PLANNING, 4 IN_PROGRESS, 2 COMPLETED, 1 ON_HOLD
  return [
    "PLANNING", "PLANNING", "PLANNING",
    "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS",
    "COMPLETED", "COMPLETED",
    "ON_HOLD",
  ];
}

function projectStartFor(status) {
  const today = new Date();
  if (status === "PLANNING")    return addDays(today,  rand(0, 60));
  if (status === "IN_PROGRESS") return addDays(today, -rand(60, 180));
  if (status === "COMPLETED")   return addDays(today, -rand(200, 360));
  if (status === "ON_HOLD")     return addDays(today, -rand(90, 150));
  return today;
}

/**
 * Compute planned dates for each phase using FS/SS dependency types.
 * Mirrors src/lib/phase-scheduler.ts computePhaseSchedule.
 */
function computeSchedule(templates, projectStart) {
  const schedMap = new Map(); // order → { start, end }
  const sorted = [...templates].sort((a, b) => a.order - b.order);

  for (const tpl of sorted) {
    let startMs = new Date(projectStart).getTime();

    if (tpl.order > 1) {
      const predOrder = tpl.order - 1;
      const pred = schedMap.get(predOrder);
      if (pred) {
        const lag = (tpl.defaultLagDays || 0) * DAY_MS;
        if ((tpl.defaultDepType || "FS") === "SS") {
          startMs = pred.start.getTime() + lag;
        } else {
          startMs = pred.end.getTime() + lag;
        }
      }
    }

    const end = new Date(startMs + tpl.durationDays * DAY_MS);
    schedMap.set(tpl.order, { start: new Date(startMs), end });
  }

  return sorted.map((tpl) => schedMap.get(tpl.order) || { start: new Date(projectStart), end: new Date(projectStart) });
}

/**
 * Given a status + progress, decide each phase's status + actual dates.
 * Works with any number of phases (N).
 */
function buildPhaseTimelines(storeStatus, progress, plannedDates, N) {
  const out = [];
  if (storeStatus === "COMPLETED") {
    for (let i = 0; i < N; i++) {
      out.push({
        status: "COMPLETED",
        actualStart: addDays(plannedDates[i].start, rand(-3, 3)),
        actualEnd:   addDays(plannedDates[i].end,   rand(-3, 5)),
      });
    }
    return out;
  }
  if (storeStatus === "PLANNING") {
    for (let i = 0; i < N; i++) {
      out.push({ status: "NOT_STARTED", actualStart: null, actualEnd: null });
    }
    return out;
  }
  // IN_PROGRESS / ON_HOLD: K phases completed, K+1 active/blocked, rest not started
  const K = Math.max(0, Math.min(N - 1, Math.floor((progress / 100) * N)));
  for (let i = 0; i < N; i++) {
    if (i < K) {
      out.push({
        status: "COMPLETED",
        actualStart: addDays(plannedDates[i].start, rand(-3, 3)),
        actualEnd:   addDays(plannedDates[i].end,   rand(-3, 5)),
      });
    } else if (i === K) {
      out.push({
        status: storeStatus === "ON_HOLD" ? "BLOCKED" : "IN_PROGRESS",
        actualStart: addDays(plannedDates[i].start, rand(-2, 2)),
        actualEnd: null,
      });
    } else {
      out.push({ status: "NOT_STARTED", actualStart: null, actualEnd: null });
    }
  }
  return out;
}

function taskStatusesForPhase(phaseStatus, count) {
  if (phaseStatus === "COMPLETED") return Array(count).fill("DONE");
  if (phaseStatus === "NOT_STARTED") return Array(count).fill("TODO");
  if (phaseStatus === "BLOCKED") {
    return Array.from({ length: count }, () => pick(["TODO", "IN_PROGRESS", "BLOCKED"]));
  }
  return Array.from({ length: count }, () => {
    const r = Math.random();
    if (r < 0.5) return "DONE";
    if (r < 0.8) return "IN_PROGRESS";
    return "TODO";
  });
}

// ── Main seed routine ───────────────────────────────────────────────────────

async function main() {
  console.log(`▶ Mock seed starting · DB=${dbUrl}`);
  const startTime = Date.now();

  // Load PhaseTemplates (dynamic count, ordered by `order`)
  const templates = await prisma.phaseTemplate.findMany({ orderBy: { order: "asc" } });
  if (templates.length === 0) {
    throw new Error("No PhaseTemplate records found. Initialize templates first via GET /api/phase-templates.");
  }
  const N = templates.length;
  console.log(`  · ${N} phase templates loaded (${templates.map(t => t.name.split("/")[0].trim()).join(", ")})`);

  const templatesParsed = templates.map((t) => ({
    ...t,
    defaultLagDays: 0, // lag stored per-phase, template default is 0
    taskTitlesParsed: (() => { try { return JSON.parse(t.taskTitles); } catch { return []; } })(),
  }));

  const mockPasswordHash = await bcrypt.hash("Mock123!", 10);
  let bcCounter = 1;
  let totalCounts = { branches: 0, bcs: 0, users: 0, stores: 0, phases: 0, tasks: 0, issues: 0 };

  for (const zone of PERU_ZONES) {
    const branchCode = `PE_${zone.code}`;
    console.log(`  · ${branchCode} ${zone.name} (${zone.city})...`);

    // 1. Upsert Branch
    const branch = await prisma.branch.upsert({
      where: { code: branchCode },
      update: { name: `Sucursal ${zone.name}` },
      create: {
        code: branchCode,
        name: `Sucursal ${zone.name}`,
        description: `Departamento de ${zone.name}, Perú`,
      },
    });
    totalCounts.branches++;

    const existingCount = await prisma.storeProject.count({
      where: { code: { startsWith: `PE_S_${zone.code}_` } },
    });
    if (existingCount >= 10) {
      console.log(`    ↳ already has ${existingCount} stores — skipping`);
      continue;
    }

    // 2. Create BCs
    const bcCount = rand(1, 5);
    const bcs = [];
    for (let i = 0; i < bcCount; i++) {
      const code = `PE_BC_${String(bcCounter++).padStart(4, "0")}`;
      const bc = await prisma.businessCenter.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: `${pick(TTKD_POOL)} ${zone.name}`,
          description: `Centro de negocios en ${zone.city}`,
          address: `${pick(STREET_POOL)} ${rand(100, 999)}, ${zone.city}`,
          branchId: branch.id,
        },
      });
      bcs.push(bc);
    }
    totalCounts.bcs += bcCount;

    // 3. Create users
    const users = [];
    const userSpecs = [
      { role: "AREA_MANAGER", emailSuffix: `manager_${zone.code}`,   namePrefix: "Manager" },
      { role: "PM",           emailSuffix: `pm_${zone.code}_01`,     namePrefix: "PM" },
      { role: "PM",           emailSuffix: `pm_${zone.code}_02`,     namePrefix: "PM" },
      { role: "SURVEY_STAFF", emailSuffix: `survey_${zone.code}_01`, namePrefix: "Survey" },
      { role: "SURVEY_STAFF", emailSuffix: `survey_${zone.code}_02`, namePrefix: "Survey" },
    ];
    for (const spec of userSpecs) {
      const email = `mock_${spec.emailSuffix}@bitel.pe`;
      const u = await prisma.user.upsert({
        where: { email },
        update: { branchId: branch.id, role: spec.role, region: zone.name },
        create: {
          email,
          name: `${spec.namePrefix} ${zone.name}`,
          password: mockPasswordHash,
          role: spec.role,
          region: zone.name,
          branchId: branch.id,
        },
      });
      users.push(u);
    }
    totalCounts.users += userSpecs.length;

    const pms = users.filter((u) => u.role === "PM");
    const allWorkers = users.filter((u) => u.role === "PM" || u.role === "SURVEY_STAFF");

    // 4. Create 10 stores per branch
    const statusList = statusDistribution();
    for (let storeIdx = 0; storeIdx < 10; storeIdx++) {
      const status = statusList[storeIdx];
      const progress = status === "COMPLETED" ? 100
        : status === "PLANNING" ? 0
        : status === "ON_HOLD" ? rand(30, 70)
        : rand(10, 90);

      const projectStart = projectStartFor(status);

      // Compute scheduled dates using FS/SS logic from templates
      const plannedDates = computeSchedule(templatesParsed, projectStart);
      const targetOpenDate = plannedDates[plannedDates.length - 1].end;
      const actualOpenDate = status === "COMPLETED"
        ? addDays(targetOpenDate, rand(-7, 14))
        : null;

      const phaseTimelines = buildPhaseTimelines(status, progress, plannedDates, N);

      const storeCode = `PE_S_${zone.code}_${String(storeIdx + 1).padStart(2, "0")}`;
      const storeName = `Tienda ${pick(TTKD_POOL).replace("TTKD ", "")} ${pick(STREET_POOL).replace("Av. ", "").replace("Jr. ", "")}`;

      // Build phase payload (without dependsOnId — will wire after creation)
      const phasesPayload = templatesParsed.map((tpl, i) => ({
        phaseNumber:    tpl.order,
        name:           tpl.name,
        description:    tpl.description ?? "",
        order:          tpl.order,
        dependencyType: tpl.defaultDepType || "FS",
        lagDays:        0,
        plannedStart:   plannedDates[i].start,
        plannedEnd:     plannedDates[i].end,
        actualStart:    phaseTimelines[i].actualStart,
        actualEnd:      phaseTimelines[i].actualEnd,
        status:         phaseTimelines[i].status,
        tasks: {
          create: tpl.taskTitlesParsed.map((title, ti) => {
            const taskStatuses = taskStatusesForPhase(phaseTimelines[i].status, tpl.taskTitlesParsed.length);
            const taskStatus = taskStatuses[ti];
            return {
              title,
              status:      taskStatus,
              priority:    ti < 2 ? "HIGH" : pick(["MEDIUM", "MEDIUM", "LOW"]),
              dueDate:     plannedDates[i].end,
              completedAt: taskStatus === "DONE" ? plannedDates[i].end : null,
              assigneeId:  allWorkers.length > 0 ? pick(allWorkers).id : null,
            };
          }),
        },
      }));

      const store = await prisma.storeProject.create({
        data: {
          code: storeCode,
          name: storeName,
          address: `${pick(STREET_POOL)} ${rand(100, 999)}, ${zone.city}, ${zone.name}, Perú`,
          region: zone.name,
          targetOpenDate,
          actualOpenDate,
          status,
          progress,
          budget: rand(50_000, 500_000),
          notes: `Tienda piloto en ${zone.city} (mock data)`,
          latitude:  zone.lat + (Math.random() - 0.5) * 0.2,
          longitude: zone.lng + (Math.random() - 0.5) * 0.2,
          pmId: pms.length > 0 ? pick(pms).id : null,
          businessCenterId: pick(bcs).id,
          phases: { create: phasesPayload },
        },
        include: { phases: { orderBy: { order: "asc" } } },
      });

      // Wire dependsOnId: each phase points to its predecessor in same store
      const sortedPhases = store.phases.sort((a, b) => a.order - b.order);
      if (sortedPhases.length > 1) {
        for (let pi = 1; pi < sortedPhases.length; pi++) {
          await prisma.phase.update({
            where: { id: sortedPhases[pi].id },
            data: { dependsOnId: sortedPhases[pi - 1].id },
          });
        }
      }

      totalCounts.stores++;
      totalCounts.phases += N;
      totalCounts.tasks += templatesParsed.reduce((s, t) => s + t.taskTitlesParsed.length, 0);

      // 5. Random issues (0-3 per store)
      const r = Math.random();
      const issueCount = r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.95 ? 2 : 3;
      if (issueCount > 0 && allWorkers.length > 0) {
        for (let ii = 0; ii < issueCount; ii++) {
          await prisma.issue.create({
            data: {
              storeId:     store.id,
              reporterId:  pick(allWorkers).id,
              title:       pick(ISSUE_TITLES),
              description: "Issue generado automáticamente para pruebas de UI.",
              type:        pick(["ISSUE", "ISSUE", "RISK", "BLOCKER"]),
              severity:    pick(["LOW", "MEDIUM", "MEDIUM", "HIGH", "CRITICAL"]),
              status:      pick(["OPEN", "OPEN", "OPEN", "IN_PROGRESS", "RESOLVED"]),
            },
          });
          totalCounts.issues++;
        }
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Mock seed complete in ${elapsed}s`);
  console.log("Summary:");
  console.log(`  Branches: ${totalCounts.branches}`);
  console.log(`  BCs:      ${totalCounts.bcs}`);
  console.log(`  Users:    ${totalCounts.users}`);
  console.log(`  Stores:   ${totalCounts.stores}`);
  console.log(`  Phases:   ${totalCounts.phases}  (${N} phases/store)`);
  console.log(`  Tasks:    ${totalCounts.tasks}`);
  console.log(`  Issues:   ${totalCounts.issues}`);
  console.log("\nMock-user login: any 'mock_*@bitel.pe' / password 'Mock123!'");
}

main()
  .catch((e) => { console.error("✗ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
