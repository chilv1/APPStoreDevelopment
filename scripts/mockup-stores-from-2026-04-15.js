// Wipe StoreProject (cascades Phase/Task/Issue/PhaseNote/Baseline) and
// reseed 1 store per Peru branch with all phase + task dates strictly
// greater than 2026-04-15. Branches, BCs, users are left untouched.
//
// Usage:
//   Local: DATABASE_URL="file:./dev.db"        node scripts/mockup-stores-from-2026-04-15.js
//   VPS:   DATABASE_URL="file:/opt/newstores/data/prod.db" node scripts/mockup-stores-from-2026-04-15.js
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

// Cutoff: every task/phase date must be strictly greater than this.
const CUTOFF = new Date("2026-04-15T00:00:00Z");
const CUTOFF_MS = CUTOFF.getTime();
const DAY_MS = 86_400_000;

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

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function clampAfterCutoff(date) {
  const d = new Date(date);
  if (d.getTime() <= CUTOFF_MS) return new Date(CUTOFF_MS + DAY_MS); // strictly > cutoff
  return d;
}

// Pick projectStart strictly > CUTOFF. Bias to give a mix of statuses
// based on whether the start is past or future relative to today.
function pickProjectStart() {
  // 0..120 days after CUTOFF (~2026-04-15 → 2026-08-13)
  const offset = rand(1, 120);
  return addDays(CUTOFF, offset);
}

function statusFor(projectStart, today) {
  const diff = (today.getTime() - projectStart.getTime()) / DAY_MS;
  if (diff < -10) return "PLANNING";          // start > 10 days in future
  if (diff < 0)   return "PLANNING";          // start in near future
  if (diff < 60)  return Math.random() < 0.85 ? "IN_PROGRESS" : "ON_HOLD";
  return Math.random() < 0.7 ? "IN_PROGRESS" : "COMPLETED";
}

function computeSchedule(templates, projectStart) {
  const sorted = [...templates].sort((a, b) => a.order - b.order);
  const map = new Map();
  for (const tpl of sorted) {
    let startMs = projectStart.getTime();
    if (tpl.order > 1) {
      const pred = map.get(tpl.order - 1);
      if (pred) {
        const lag = (tpl.defaultLagDays || 0) * DAY_MS;
        startMs = (tpl.defaultDepType === "SS" ? pred.start.getTime() : pred.end.getTime()) + lag;
      }
    }
    // Add a small random extension per phase to make schedules feel less synthetic
    const dur = (tpl.durationDays || 7) + rand(-1, 3);
    const end = new Date(startMs + Math.max(1, dur) * DAY_MS);
    map.set(tpl.order, { start: clampAfterCutoff(new Date(startMs)), end: clampAfterCutoff(end) });
  }
  return sorted.map((tpl) => map.get(tpl.order));
}

function buildPhaseTimelines(storeStatus, progress, plannedDates, N, today) {
  const out = [];
  if (storeStatus === "COMPLETED") {
    for (let i = 0; i < N; i++) {
      out.push({
        status: "COMPLETED",
        actualStart: clampAfterCutoff(addDays(plannedDates[i].start, rand(-2, 2))),
        actualEnd:   clampAfterCutoff(addDays(plannedDates[i].end,   rand(-2, 4))),
      });
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
      out.push({
        status: "COMPLETED",
        actualStart: clampAfterCutoff(addDays(plannedDates[i].start, rand(-2, 2))),
        actualEnd:   clampAfterCutoff(addDays(plannedDates[i].end,   rand(-2, 4))),
      });
    } else if (i === K) {
      out.push({
        status: storeStatus === "ON_HOLD" ? "BLOCKED" : "IN_PROGRESS",
        actualStart: clampAfterCutoff(addDays(plannedDates[i].start, rand(-1, 1))),
        actualEnd: null,
      });
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

// Random dueDate within [phaseStart, phaseEnd], clamped to > CUTOFF
function randomTaskDueDate(phaseStart, phaseEnd) {
  const sMs = new Date(phaseStart).getTime();
  const eMs = new Date(phaseEnd).getTime();
  const lo = Math.max(sMs, CUTOFF_MS + DAY_MS);
  const hi = Math.max(lo, eMs);
  const t  = lo + Math.random() * (hi - lo);
  return new Date(t);
}

async function main() {
  console.log(`▶ Mockup stores (cutoff > ${CUTOFF.toISOString().slice(0,10)}) · DB=${dbUrl}`);
  const today = new Date();
  const t0 = Date.now();

  const wiped = await prisma.storeProject.deleteMany({});
  console.log(`  · wiped ${wiped.count} existing stores`);

  const templates = await prisma.phaseTemplate.findMany({ orderBy: { order: "asc" } });
  if (templates.length === 0) throw new Error("No PhaseTemplate found.");
  const N = templates.length;
  const templatesParsed = templates.map((t) => ({
    ...t,
    defaultLagDays: 0,
    taskTitlesParsed: (() => { try { return JSON.parse(t.taskTitles); } catch { return []; } })(),
  }));
  console.log(`  · ${N} phase templates loaded`);

  // Map staff role-name → user id (created by seed-staff-roles.js)
  const staffUsers = await prisma.user.findMany({
    where: { role: { startsWith: "STAFF_" } },
    select: { id: true, name: true },
  });
  const byName = {};
  for (const u of staffUsers) byName[u.name] = u.id;
  const PHASE_TO_STAFF = {
    1:  "Director",                  2:  "Asistente Canal Fijo",
    3:  "Abogado",                   4:  "Asistente Administracion",
    5:  "Asistente Canal Fijo",      6:  "Jefe Finanzas",
    7:  "Sub Director",              8:  "Jefe Finanzas",
    9:  "Asistente Trainning",      10:  "Jefe Finanzas",
    11: "Jefe Finanzas",            12:  "Asistente Canal Fijo",
    13: "Jefe BC",
  };

  let created = 0, skipped = 0;
  let minDateSeen = Infinity, maxDateSeen = -Infinity;

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
    const pm = await prisma.user.findFirst({ where: { branchId: branch.id, role: "PM" } });

    const projectStart = pickProjectStart();
    const status = statusFor(projectStart, today);
    const progress = status === "COMPLETED" ? 100
      : status === "PLANNING" ? 0
      : status === "ON_HOLD" ? rand(20, 60)
      : rand(15, 80);

    const plannedDates = computeSchedule(templatesParsed, projectStart);
    const targetOpenDate = plannedDates[plannedDates.length - 1].end;
    const actualOpenDate = status === "COMPLETED" ? clampAfterCutoff(addDays(targetOpenDate, rand(-5, 10))) : null;
    const phaseTimelines = buildPhaseTimelines(status, progress, plannedDates, N, today);

    const storeCode = `PE_S_${zone.code}_01`;
    const storeName = `Tienda ${zone.city}`;

    const phasesPayload = templatesParsed.map((tpl, i) => {
      const phaseAssigneeName = PHASE_TO_STAFF[tpl.order];
      const phaseAssigneeId = phaseAssigneeName ? byName[phaseAssigneeName] : null;
      const taskTitles = tpl.taskTitlesParsed;
      const taskStatuses = taskStatusesForPhase(phaseTimelines[i].status, taskTitles.length);

      // Track date range for sanity-check log
      const startMs = new Date(plannedDates[i].start).getTime();
      const endMs   = new Date(plannedDates[i].end).getTime();
      if (startMs < minDateSeen) minDateSeen = startMs;
      if (endMs > maxDateSeen) maxDateSeen = endMs;

      return {
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
          create: taskTitles.map((title, ti) => {
            const taskStatus = taskStatuses[ti];
            const dueDate = randomTaskDueDate(plannedDates[i].start, plannedDates[i].end);
            const completedAt = taskStatus === "DONE"
              ? clampAfterCutoff(addDays(dueDate, rand(-1, 2)))
              : null;
            return {
              title, status: taskStatus,
              priority: ti < 2 ? "HIGH" : pick(["MEDIUM", "MEDIUM", "LOW"]),
              dueDate, completedAt,
              assigneeId: phaseAssigneeId ?? (pm ? pm.id : null),
            };
          }),
        },
      };
    });

    const store = await prisma.storeProject.create({
      data: {
        code: storeCode, name: storeName,
        address: `Av. Principal s/n, ${zone.city}, ${zone.name}, Perú`,
        region: zone.name,
        targetOpenDate, actualOpenDate, status, progress,
        budget: rand(80_000, 350_000),
        notes: `Tienda piloto en ${zone.city}`,
        latitude:  zone.lat, longitude: zone.lng,
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
    console.log(`  ✓ ${storeCode}  ${status.padEnd(11)}  start ${projectStart.toISOString().slice(0,10)}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✓ Done in ${elapsed}s · created ${created} stores · skipped ${skipped}`);
  if (Number.isFinite(minDateSeen) && Number.isFinite(maxDateSeen)) {
    console.log(`  date range: ${new Date(minDateSeen).toISOString().slice(0,10)} → ${new Date(maxDateSeen).toISOString().slice(0,10)}`);
    console.log(`  cutoff: ${CUTOFF.toISOString().slice(0,10)} · all phases > cutoff: ${minDateSeen > CUTOFF_MS ? "✓" : "✗"}`);
  }
}

main()
  .catch((e) => { console.error("✗ Mockup failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
