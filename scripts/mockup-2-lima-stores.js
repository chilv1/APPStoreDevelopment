// Wipe StoreProject and create exactly 2 stores under the Lima branch.
// Both projects start on 2026-04-15 (Tienda Lima Centro) and 2026-04-22
// (Tienda Lima Miraflores). All phase + task dates are strictly >=
// 2026-04-15. Branches/BCs/users untouched.
//
// Usage:
//   Local:  DATABASE_URL="file:./dev.db" node scripts/mockup-2-lima-stores.js
//   VPS:    DATABASE_URL="file:/opt/newstores/data/prod.db" node scripts/mockup-2-lima-stores.js
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const CUTOFF = new Date("2026-04-15T00:00:00Z");
const DAY_MS = 86_400_000;

const STORES = [
  {
    code: "PE_S_LIM_01",
    name: "Tienda Lima Centro",
    address: "Av. Abancay 491, Cercado de Lima, Lima",
    lat: -12.046, lng: -77.043,
    projectStart: new Date("2026-04-15T00:00:00Z"),
    status: "IN_PROGRESS",
    progress: 25,
  },
  {
    code: "PE_S_LIM_02",
    name: "Tienda Lima Miraflores",
    address: "Av. Larco 880, Miraflores, Lima",
    lat: -12.121, lng: -77.030,
    projectStart: new Date("2026-04-22T00:00:00Z"),
    status: "PLANNING",
    progress: 0,
  },
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
  if (d.getTime() < CUTOFF.getTime()) return new Date(CUTOFF.getTime());
  return d;
}

function computeSchedule(templates, projectStart) {
  const sorted = [...templates].sort((a, b) => a.order - b.order);
  const map = new Map();
  for (const tpl of sorted) {
    let startMs = projectStart.getTime();
    if (tpl.order > 1) {
      const pred = map.get(tpl.order - 1);
      if (pred) {
        startMs = (tpl.defaultDepType === "SS" ? pred.start.getTime() : pred.end.getTime());
      }
    }
    const dur = (tpl.durationDays || 7) + rand(-1, 3);
    const end = new Date(startMs + Math.max(1, dur) * DAY_MS);
    map.set(tpl.order, { start: clampAfterCutoff(new Date(startMs)), end: clampAfterCutoff(end) });
  }
  return sorted.map((tpl) => map.get(tpl.order));
}

// Build sequential actuals so each completed phase's actualStart >= previous
// phase's actualEnd (FS dependency rule). Treats every phase as FS; this is
// fine because the seed always wires phases in chain order.
function buildPhaseTimelines(storeStatus, progress, plannedDates, N) {
  const out = [];
  if (storeStatus === "PLANNING") {
    for (let i = 0; i < N; i++) out.push({ status: "NOT_STARTED", actualStart: null, actualEnd: null });
    return out;
  }
  const completedCount = storeStatus === "COMPLETED"
    ? N
    : Math.max(0, Math.min(N - 1, Math.floor((progress / 100) * N)));

  let prevActualEndMs = null;
  for (let i = 0; i < N; i++) {
    if (i < completedCount) {
      const plannedStartMs = new Date(plannedDates[i].start).getTime();
      const plannedDurMs   = new Date(plannedDates[i].end).getTime() - plannedStartMs;
      // actualStart: at least previous actualEnd, plus tiny jitter (0..2 days).
      const lowerBound = prevActualEndMs ?? plannedStartMs;
      const aStartMs = Math.max(lowerBound + rand(0, 2) * DAY_MS, CUTOFF.getTime());
      // Duration: planned ± slight jitter, never negative.
      const aDurMs = Math.max(DAY_MS, plannedDurMs + rand(-1, 4) * DAY_MS);
      const aEndMs = aStartMs + aDurMs;
      out.push({
        status: "COMPLETED",
        actualStart: new Date(aStartMs),
        actualEnd:   new Date(aEndMs),
      });
      prevActualEndMs = aEndMs;
    } else if (i === completedCount && storeStatus !== "COMPLETED") {
      // Currently in progress: actualStart >= prev actualEnd, no actualEnd yet.
      const plannedStartMs = new Date(plannedDates[i].start).getTime();
      const lowerBound = prevActualEndMs ?? plannedStartMs;
      const aStartMs = Math.max(lowerBound + rand(0, 2) * DAY_MS, CUTOFF.getTime());
      out.push({
        status: "IN_PROGRESS",
        actualStart: new Date(aStartMs),
        actualEnd: null,
      });
      prevActualEndMs = null; // no end yet, downstream phases stay NOT_STARTED
    } else {
      out.push({ status: "NOT_STARTED", actualStart: null, actualEnd: null });
    }
  }
  return out;
}

function taskStatusesForPhase(phaseStatus, count) {
  if (phaseStatus === "COMPLETED")   return Array(count).fill("DONE");
  if (phaseStatus === "NOT_STARTED") return Array(count).fill("TODO");
  return Array.from({ length: count }, () => {
    const r = Math.random();
    if (r < 0.5) return "DONE";
    if (r < 0.8) return "IN_PROGRESS";
    return "TODO";
  });
}

function randomTaskDueDate(phaseStart, phaseEnd) {
  const sMs = new Date(phaseStart).getTime();
  const eMs = new Date(phaseEnd).getTime();
  const lo = Math.max(sMs, CUTOFF.getTime());
  const hi = Math.max(lo, eMs);
  return new Date(lo + Math.random() * (hi - lo));
}

async function main() {
  console.log(`▶ Mockup 2 Lima stores · DB=${dbUrl}`);
  const t0 = Date.now();

  const wiped = await prisma.storeProject.deleteMany({});
  console.log(`  · wiped ${wiped.count} existing stores`);

  const templates = await prisma.phaseTemplate.findMany({ orderBy: { order: "asc" } });
  if (templates.length === 0) throw new Error("No PhaseTemplate found.");
  const N = templates.length;
  const templatesParsed = templates.map((t) => ({
    ...t,
    taskTitlesParsed: (() => { try { return JSON.parse(t.taskTitles); } catch { return []; } })(),
  }));
  console.log(`  · ${N} phase templates`);

  // Lima branch + first BC
  const branch = await prisma.branch.findUnique({
    where: { code: "PE_LIM" },
    include: { businessCenters: { orderBy: { code: "asc" }, take: 1 } },
  });
  if (!branch) throw new Error("Lima branch (PE_LIM) not found");
  if (branch.businessCenters.length === 0) throw new Error("Lima branch has no BC");
  const bc = branch.businessCenters[0];
  console.log(`  · branch ${branch.code} · BC ${bc.code}`);

  // PM for Lima
  const pm = await prisma.user.findFirst({ where: { branchId: branch.id, role: "PM" } });

  // Staff users by name (seeded by seed-staff-roles.js)
  const staff = await prisma.user.findMany({ where: { role: { startsWith: "STAFF_" } }, select: { id: true, name: true } });
  const byName = Object.fromEntries(staff.map((u) => [u.name, u.id]));
  const PHASE_TO_STAFF = {
    1:  "Director",                  2:  "Asistente Canal Fijo",
    3:  "Abogado",                   4:  "Asistente Administracion",
    5:  "Asistente Canal Fijo",      6:  "Jefe Finanzas",
    7:  "Sub Director",              8:  "Jefe Finanzas",
    9:  "Asistente Trainning",      10:  "Jefe Finanzas",
    11: "Jefe Finanzas",            12:  "Asistente Canal Fijo",
    13: "Jefe BC",
  };

  let minDateSeen = Infinity, maxDateSeen = -Infinity;

  for (const cfg of STORES) {
    const plannedDates = computeSchedule(templatesParsed, cfg.projectStart);
    const targetOpenDate = plannedDates[plannedDates.length - 1].end;
    const phaseTimelines = buildPhaseTimelines(cfg.status, cfg.progress, plannedDates, N);

    const phasesPayload = templatesParsed.map((tpl, i) => {
      const phaseAssigneeName = PHASE_TO_STAFF[tpl.order];
      const phaseAssigneeId = phaseAssigneeName ? byName[phaseAssigneeName] : null;
      const taskTitles = tpl.taskTitlesParsed;
      const taskStatuses = taskStatusesForPhase(phaseTimelines[i].status, taskTitles.length);

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
        code: cfg.code, name: cfg.name,
        address: cfg.address,
        region: "Lima",
        targetOpenDate,
        actualOpenDate: null,
        status: cfg.status,
        progress: cfg.progress,
        budget: rand(150_000, 280_000),
        notes: `${cfg.name} — proyecto piloto Lima`,
        latitude:  cfg.lat,
        longitude: cfg.lng,
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

    console.log(`  ✓ ${cfg.code}  ${cfg.name}  ${cfg.status.padEnd(11)}  start ${cfg.projectStart.toISOString().slice(0,10)}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✓ Done in ${elapsed}s · created ${STORES.length} Lima stores`);
  console.log(`  date range: ${new Date(minDateSeen).toISOString().slice(0,10)} → ${new Date(maxDateSeen).toISOString().slice(0,10)}`);
  console.log(`  cutoff: ${CUTOFF.toISOString().slice(0,10)} · all phases >= cutoff: ${minDateSeen >= CUTOFF.getTime() ? "✓" : "✗"}`);
}

main()
  .catch((e) => { console.error("✗ Mockup failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
