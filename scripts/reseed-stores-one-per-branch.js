// Wipe StoreProject (cascades Phase/Task/Issue/PhaseNote/Baseline) and
// reseed exactly 1 store per Peru branch at the regional capital coords.
//
// Branches, BCs, users are left untouched.
//
// Usage:
//   Local:  DATABASE_URL="file:./dev.db"        node scripts/reseed-stores-one-per-branch.js
//   VPS:    DATABASE_URL="file:./data/prod.db"  node scripts/reseed-stores-one-per-branch.js

const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

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

const DAY_MS = 1000 * 60 * 60 * 24;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function statusForIndex(i) {
  // Spread statuses across the 25 branches: ~10 IN_PROGRESS, ~7 PLANNING, ~5 COMPLETED, ~3 ON_HOLD
  const cycle = ["IN_PROGRESS", "PLANNING", "IN_PROGRESS", "COMPLETED", "PLANNING",
                 "IN_PROGRESS", "ON_HOLD", "IN_PROGRESS", "COMPLETED", "PLANNING"];
  return cycle[i % cycle.length];
}

function projectStartFor(status) {
  const today = new Date();
  if (status === "PLANNING")    return addDays(today,  rand(0, 60));
  if (status === "IN_PROGRESS") return addDays(today, -rand(60, 180));
  if (status === "COMPLETED")   return addDays(today, -rand(200, 360));
  if (status === "ON_HOLD")     return addDays(today, -rand(90, 150));
  return today;
}

function computeSchedule(templates, projectStart) {
  const schedMap = new Map();
  const sorted = [...templates].sort((a, b) => a.order - b.order);
  for (const tpl of sorted) {
    let startMs = new Date(projectStart).getTime();
    if (tpl.order > 1) {
      const pred = schedMap.get(tpl.order - 1);
      if (pred) {
        const lag = (tpl.defaultLagDays || 0) * DAY_MS;
        startMs = (tpl.defaultDepType === "SS" ? pred.start.getTime() : pred.end.getTime()) + lag;
      }
    }
    const end = new Date(startMs + tpl.durationDays * DAY_MS);
    schedMap.set(tpl.order, { start: new Date(startMs), end });
  }
  return sorted.map((tpl) => schedMap.get(tpl.order));
}

function buildPhaseTimelines(storeStatus, progress, plannedDates, N) {
  const out = [];
  if (storeStatus === "COMPLETED") {
    for (let i = 0; i < N; i++) {
      out.push({ status: "COMPLETED",
        actualStart: addDays(plannedDates[i].start, rand(-3, 3)),
        actualEnd:   addDays(plannedDates[i].end,   rand(-3, 5)) });
    }
    return out;
  }
  if (storeStatus === "PLANNING") {
    for (let i = 0; i < N; i++) out.push({ status: "NOT_STARTED", actualStart: null, actualEnd: null });
    return out;
  }
  const K = Math.max(0, Math.min(N - 1, Math.floor((progress / 100) * N)));
  for (let i = 0; i < N; i++) {
    if (i < K) {
      out.push({ status: "COMPLETED",
        actualStart: addDays(plannedDates[i].start, rand(-3, 3)),
        actualEnd:   addDays(plannedDates[i].end,   rand(-3, 5)) });
    } else if (i === K) {
      out.push({ status: storeStatus === "ON_HOLD" ? "BLOCKED" : "IN_PROGRESS",
        actualStart: addDays(plannedDates[i].start, rand(-2, 2)), actualEnd: null });
    } else {
      out.push({ status: "NOT_STARTED", actualStart: null, actualEnd: null });
    }
  }
  return out;
}

function taskStatusesForPhase(phaseStatus, count) {
  if (phaseStatus === "COMPLETED")   return Array(count).fill("DONE");
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

async function main() {
  console.log(`▶ Reseed (1 store per branch) · DB=${dbUrl}`);
  const t0 = Date.now();

  // 1. Wipe ALL stores (cascades Phase → Task, PhaseNote, Issue, Baselines)
  const wiped = await prisma.storeProject.deleteMany({});
  console.log(`  · wiped ${wiped.count} existing stores`);

  // 2. Load PhaseTemplates (dynamic count)
  const templates = await prisma.phaseTemplate.findMany({ orderBy: { order: "asc" } });
  if (templates.length === 0) throw new Error("No PhaseTemplate found.");
  const N = templates.length;
  const templatesParsed = templates.map((t) => ({
    ...t,
    defaultLagDays: 0,
    taskTitlesParsed: (() => { try { return JSON.parse(t.taskTitles); } catch { return []; } })(),
  }));
  console.log(`  · ${N} phase templates loaded`);

  let created = 0, skipped = 0;

  for (let zi = 0; zi < PERU_ZONES.length; zi++) {
    const zone = PERU_ZONES[zi];
    const branchCode = `PE_${zone.code}`;
    const branch = await prisma.branch.findUnique({
      where: { code: branchCode },
      include: { businessCenters: { orderBy: { code: "asc" }, take: 1 } },
    });
    if (!branch) { console.log(`  ⚠ ${branchCode} not found — skipping`); skipped++; continue; }
    if (branch.businessCenters.length === 0) {
      console.log(`  ⚠ ${branchCode} has no BC — skipping`); skipped++; continue;
    }
    const bc = branch.businessCenters[0];

    const pm = await prisma.user.findFirst({
      where: { branchId: branch.id, role: "PM" },
    });

    const status = statusForIndex(zi);
    const progress = status === "COMPLETED" ? 100
      : status === "PLANNING" ? 0
      : status === "ON_HOLD" ? rand(30, 70)
      : rand(20, 85);

    const projectStart = projectStartFor(status);
    const plannedDates = computeSchedule(templatesParsed, projectStart);
    const targetOpenDate = plannedDates[plannedDates.length - 1].end;
    const actualOpenDate = status === "COMPLETED" ? addDays(targetOpenDate, rand(-7, 14)) : null;
    const phaseTimelines = buildPhaseTimelines(status, progress, plannedDates, N);

    const storeCode = `PE_S_${zone.code}_01`;
    const storeName = `Tienda ${zone.city}`;

    const phasesPayload = templatesParsed.map((tpl, i) => ({
      phaseNumber: tpl.order, name: tpl.name, description: tpl.description ?? "",
      order: tpl.order,
      dependencyType: tpl.defaultDepType || "FS",
      lagDays: 0,
      plannedStart: plannedDates[i].start,
      plannedEnd:   plannedDates[i].end,
      actualStart:  phaseTimelines[i].actualStart,
      actualEnd:    phaseTimelines[i].actualEnd,
      status:       phaseTimelines[i].status,
      tasks: {
        create: tpl.taskTitlesParsed.map((title, ti) => {
          const taskStatuses = taskStatusesForPhase(phaseTimelines[i].status, tpl.taskTitlesParsed.length);
          const taskStatus = taskStatuses[ti];
          return {
            title, status: taskStatus,
            priority: ti < 2 ? "HIGH" : pick(["MEDIUM", "MEDIUM", "LOW"]),
            dueDate: plannedDates[i].end,
            completedAt: taskStatus === "DONE" ? plannedDates[i].end : null,
            assigneeId: pm ? pm.id : null,
          };
        }),
      },
    }));

    const store = await prisma.storeProject.create({
      data: {
        code: storeCode,
        name: storeName,
        address: `Av. Principal s/n, ${zone.city}, ${zone.name}, Perú`,
        region: zone.name,
        targetOpenDate, actualOpenDate, status, progress,
        budget: rand(80_000, 350_000),
        notes: `Tienda piloto en ${zone.city} (1 store / branch demo)`,
        latitude:  zone.lat,
        longitude: zone.lng,
        pmId: pm ? pm.id : null,
        businessCenterId: bc.id,
        phases: { create: phasesPayload },
      },
      include: { phases: { orderBy: { order: "asc" } } },
    });

    // Wire dependsOnId chain
    const sortedPhases = store.phases.sort((a, b) => a.order - b.order);
    for (let pi = 1; pi < sortedPhases.length; pi++) {
      await prisma.phase.update({
        where: { id: sortedPhases[pi].id },
        data: { dependsOnId: sortedPhases[pi - 1].id },
      });
    }

    created++;
    console.log(`  ✓ ${branchCode} → ${storeCode} @ (${zone.lat}, ${zone.lng}) · ${status}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✓ Done in ${elapsed}s · created ${created} stores · skipped ${skipped}`);
}

main()
  .catch((e) => { console.error("✗ Reseed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
