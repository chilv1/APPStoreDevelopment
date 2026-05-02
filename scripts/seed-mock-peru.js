// Seed dummy data for stability/UI testing.
//
// Creates 25 mock branches matching Peru's 24 departamentos + Callao constitutional
// province, plus realistic BCs, stores (with phases + tasks + issues), and branch
// staff. Every record gets a "PE_" / "mock_" prefix so cleanup-mock-peru.js can
// remove ONLY this seed without touching real data.
//
// Usage:
//   Local:  DATABASE_URL="file:./dev.db"        node scripts/seed-mock-peru.js
//   VPS:    DATABASE_URL="file:./data/prod.db"  node scripts/seed-mock-peru.js
//
// Idempotent: re-running upserts branches/users; stores/BCs/phases/tasks/issues
// are skipped if the branch already has its 10 stores. (Cleanup first if you want
// fresh randomization.)
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

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Distribute 10 stores per branch across statuses for visual diversity.
function statusDistribution() {
  // 3 PLANNING, 4 IN_PROGRESS, 2 COMPLETED, 1 ON_HOLD
  return [
    "PLANNING", "PLANNING", "PLANNING",
    "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS",
    "COMPLETED", "COMPLETED",
    "ON_HOLD",
  ];
}

// Compute project start date based on store status (so dates feel realistic).
function projectStartFor(status) {
  const today = new Date();
  if (status === "PLANNING")    return addDays(today,  rand(0, 60));     // future
  if (status === "IN_PROGRESS") return addDays(today, -rand(60, 180));   // recent past
  if (status === "COMPLETED")   return addDays(today, -rand(200, 360));  // far past
  if (status === "ON_HOLD")     return addDays(today, -rand(90, 150));
  return today;
}

// Given a status + progress, decide each phase's status + actual dates.
// Returns array of { status, actualStart, actualEnd } indexed 0..10 (phase 1..11).
function buildPhaseTimelines(storeStatus, progress, plannedDates) {
  const out = [];
  if (storeStatus === "COMPLETED") {
    // All 11 phases COMPLETED with ±5d variance on actuals
    for (let i = 0; i < 11; i++) {
      out.push({
        status: "COMPLETED",
        actualStart: addDays(plannedDates[i].plannedStart, rand(-3, 3)),
        actualEnd:   addDays(plannedDates[i].plannedEnd,   rand(-3, 5)),
      });
    }
    return out;
  }
  if (storeStatus === "PLANNING") {
    for (let i = 0; i < 11; i++) {
      out.push({ status: "NOT_STARTED", actualStart: null, actualEnd: null });
    }
    return out;
  }
  // IN_PROGRESS or ON_HOLD: phases 1..K completed, K+1 in-progress (or BLOCKED for ON_HOLD), rest not started
  // K = floor(progress / 10), bounded 0..10
  const K = Math.max(0, Math.min(10, Math.floor(progress / 10)));
  for (let i = 0; i < 11; i++) {
    if (i < K) {
      out.push({
        status: "COMPLETED",
        actualStart: addDays(plannedDates[i].plannedStart, rand(-3, 3)),
        actualEnd:   addDays(plannedDates[i].plannedEnd,   rand(-3, 5)),
      });
    } else if (i === K) {
      out.push({
        status: storeStatus === "ON_HOLD" ? "BLOCKED" : "IN_PROGRESS",
        actualStart: addDays(plannedDates[i].plannedStart, rand(-2, 2)),
        actualEnd: null,
      });
    } else {
      out.push({ status: "NOT_STARTED", actualStart: null, actualEnd: null });
    }
  }
  return out;
}

// Choose task statuses for a phase based on phase status.
function taskStatusesForPhase(phaseStatus, count) {
  if (phaseStatus === "COMPLETED") return Array(count).fill("DONE");
  if (phaseStatus === "NOT_STARTED") return Array(count).fill("TODO");
  if (phaseStatus === "BLOCKED") {
    return Array.from({ length: count }, () => pick(["TODO", "IN_PROGRESS", "BLOCKED"]));
  }
  // IN_PROGRESS — 50% DONE, 30% IN_PROGRESS, 20% TODO
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

  // Load PhaseTemplate (11 records). Required — fail fast if missing.
  const templates = await prisma.phaseTemplate.findMany({ orderBy: { phaseNumber: "asc" } });
  if (templates.length !== 11) {
    throw new Error(`Expected 11 PhaseTemplate records, found ${templates.length}. Initialize templates first.`);
  }
  // Pre-parse taskTitles JSON
  const templatesParsed = templates.map((t) => ({
    ...t,
    taskTitlesParsed: (() => { try { return JSON.parse(t.taskTitles); } catch { return []; } })(),
  }));

  // Hash mock-user password once
  const mockPasswordHash = await bcrypt.hash("Mock123!", 10);

  // BC counter (global) so codes don't collide across branches
  let bcCounter = 1;

  let totalCounts = { branches: 0, bcs: 0, users: 0, stores: 0, phases: 0, tasks: 0, issues: 0 };

  for (const zone of PERU_ZONES) {
    const branchCode = `PE_${zone.code}`;

    console.log(`  · ${branchCode} ${zone.name} (${zone.city})...`);

    // ─── 1. Upsert Branch ──────────────────────────────────────
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

    // Skip if this branch already has 10 stores (idempotent re-run)
    const existingStoreCount = await prisma.storeProject.count({
      where: { code: { startsWith: `PE_S_${zone.code}_` } },
    });
    if (existingStoreCount >= 10) {
      console.log(`    ↳ already has ${existingStoreCount} stores — skipping`);
      continue;
    }

    // ─── 2. Create BCs (1-5, random) ───────────────────────────
    const bcCount = rand(1, 5);
    const bcs = [];
    for (let i = 0; i < bcCount; i++) {
      const ttkdName = pickN(TTKD_POOL, 1)[0];
      const code = `PE_BC_${String(bcCounter++).padStart(4, "0")}`;
      const bc = await prisma.businessCenter.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: `${ttkdName} ${zone.name}`,
          description: `Centro de negocios en ${zone.city}`,
          address: `${pick(STREET_POOL)} ${rand(100, 999)}, ${zone.city}`,
          branchId: branch.id,
        },
      });
      bcs.push(bc);
    }
    totalCounts.bcs += bcCount;

    // ─── 3. Create users (1 manager + 2 PMs + 2 surveys) ───────
    const users = [];
    const userSpecs = [
      { role: "AREA_MANAGER", emailSuffix: `manager_${zone.code}`,    namePrefix: "Manager" },
      { role: "PM",           emailSuffix: `pm_${zone.code}_01`,      namePrefix: "PM" },
      { role: "PM",           emailSuffix: `pm_${zone.code}_02`,      namePrefix: "PM" },
      { role: "SURVEY_STAFF", emailSuffix: `survey_${zone.code}_01`,  namePrefix: "Survey" },
      { role: "SURVEY_STAFF", emailSuffix: `survey_${zone.code}_02`,  namePrefix: "Survey" },
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

    // ─── 4. Create 10 stores with phases + tasks + issues ──────
    const statusList = statusDistribution();
    for (let storeIdx = 0; storeIdx < 10; storeIdx++) {
      const status = statusList[storeIdx];
      const progress = status === "COMPLETED" ? 100
        : status === "PLANNING" ? 0
        : status === "ON_HOLD" ? rand(30, 70)
        : rand(10, 90); // IN_PROGRESS

      const projectStart = projectStartFor(status);
      // Compute planned dates per phase from template durations
      let cursor = new Date(projectStart);
      const plannedDates = templatesParsed.map((tpl) => {
        const ps = new Date(cursor);
        const pe = new Date(cursor);
        pe.setDate(pe.getDate() + tpl.durationDays);
        cursor = new Date(pe);
        return { plannedStart: ps, plannedEnd: pe };
      });
      const targetOpenDate = plannedDates[plannedDates.length - 1].plannedEnd;
      const actualOpenDate = status === "COMPLETED"
        ? addDays(targetOpenDate, rand(-7, 14))
        : null;

      const phaseTimelines = buildPhaseTimelines(status, progress, plannedDates);

      const storeCode = `PE_S_${zone.code}_${String(storeIdx + 1).padStart(2, "0")}`;
      const storeBC = pick(bcs);
      const storeName = `Tienda ${pick(TTKD_POOL).replace("TTKD ", "")} ${pick(STREET_POOL).replace("Av. ", "").replace("Jr. ", "")}`;

      // Build phase + task nested-create payload
      const phasesPayload = templatesParsed.map((tpl, i) => ({
        phaseNumber:  tpl.phaseNumber,
        name:         tpl.name,
        description:  tpl.description ?? "",
        order:        tpl.phaseNumber,
        plannedStart: plannedDates[i].plannedStart,
        plannedEnd:   plannedDates[i].plannedEnd,
        actualStart:  phaseTimelines[i].actualStart,
        actualEnd:    phaseTimelines[i].actualEnd,
        status:       phaseTimelines[i].status,
        tasks: {
          create: tpl.taskTitlesParsed.map((title, ti) => {
            const taskStatuses = taskStatusesForPhase(phaseTimelines[i].status, tpl.taskTitlesParsed.length);
            const taskStatus = taskStatuses[ti];
            return {
              title,
              status:    taskStatus,
              priority:  ti < 2 ? "HIGH" : pick(["MEDIUM", "MEDIUM", "LOW"]),
              dueDate:   plannedDates[i].plannedEnd,
              completedAt: taskStatus === "DONE" ? plannedDates[i].plannedEnd : null,
              assigneeId: allWorkers.length > 0 ? pick(allWorkers).id : null,
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
          businessCenterId: storeBC.id,
          phases: { create: phasesPayload },
        },
      });
      totalCounts.stores++;
      totalCounts.phases += 11;
      totalCounts.tasks += templatesParsed.reduce((s, t) => s + t.taskTitlesParsed.length, 0);

      // ─── 5. Random 0-3 issues per store ──────────────────────
      // Skewed: 50%→0, 30%→1, 15%→2, 5%→3
      const r = Math.random();
      const issueCount = r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.95 ? 2 : 3;
      if (issueCount > 0 && allWorkers.length > 0) {
        for (let ii = 0; ii < issueCount; ii++) {
          await prisma.issue.create({
            data: {
              storeId: store.id,
              reporterId: pick(allWorkers).id,
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
  console.log("\n✓ Mock seed complete in " + elapsed + "s");
  console.log("Summary:");
  console.log(`  Branches: ${totalCounts.branches}`);
  console.log(`  BCs:      ${totalCounts.bcs}`);
  console.log(`  Users:    ${totalCounts.users}`);
  console.log(`  Stores:   ${totalCounts.stores}`);
  console.log(`  Phases:   ${totalCounts.phases}`);
  console.log(`  Tasks:    ${totalCounts.tasks}`);
  console.log(`  Issues:   ${totalCounts.issues}`);
  console.log("\nMock-user login: any 'mock_*@bitel.pe' with password 'Mock123!'");
}

main()
  .catch((e) => { console.error("✗ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
