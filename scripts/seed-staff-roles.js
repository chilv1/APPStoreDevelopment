// Seed 8 cross-region staff users (Director, Asistente Canal Fijo, ...)
// + reassign every existing Task to the appropriate staff role based on
// the phase number it belongs to.
//
// Idempotent — safe to run multiple times.
//
// Run locally: node scripts/seed-staff-roles.js
// Run on VPS:  node scripts/seed-staff-roles.js
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

// 8 unique staff roles
const STAFF = [
  { name: "Director",                email: "director@telecom.pe",            role: "STAFF_DIRECTOR" },
  { name: "Asistente Canal Fijo",    email: "asistente.canal@telecom.pe",     role: "STAFF_CANAL_FIJO" },
  { name: "Abogado",                 email: "abogado@telecom.pe",             role: "STAFF_LEGAL" },
  { name: "Asistente Administracion",email: "asistente.admin@telecom.pe",     role: "STAFF_ADMIN" },
  { name: "Jefe Finanzas",           email: "jefe.finanzas@telecom.pe",       role: "STAFF_FINANZAS" },
  { name: "Sub Director",            email: "sub.director@telecom.pe",        role: "STAFF_SUBDIR" },
  { name: "Asistente Trainning",     email: "asistente.training@telecom.pe",  role: "STAFF_TRAINING" },
  { name: "Jefe BC",                 email: "jefe.bc@telecom.pe",             role: "STAFF_BC" },
];

// Phase number → staff name (the user explicitly listed this mapping)
const PHASE_TO_STAFF = {
  1:  "Director",
  2:  "Asistente Canal Fijo",
  3:  "Abogado",
  4:  "Asistente Administracion",
  5:  "Asistente Canal Fijo",
  6:  "Jefe Finanzas",
  7:  "Sub Director",
  8:  "Jefe Finanzas",
  9:  "Asistente Trainning",
  10: "Jefe Finanzas",
  11: "Jefe Finanzas",
  12: "Asistente Canal Fijo",
  13: "Jefe BC",
};

async function main() {
  console.log("[seed-staff] DB =", dbPath);
  const password = "telecom123";
  const hashed = await bcrypt.hash(password, 10);

  // 1. Upsert staff users
  const byName = {};
  for (const s of STAFF) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, role: s.role },
      create: { name: s.name, email: s.email, password: hashed, role: s.role, region: "Cross-region" },
    });
    byName[s.name] = u.id;
    console.log(`[seed-staff] ✓ user ${u.name.padEnd(30)} ${u.email}`);
  }

  // 2. Reassign every existing task to the right staff based on its phase number
  const phases = await prisma.phase.findMany({
    select: { id: true, phaseNumber: true, name: true, store: { select: { code: true } } },
  });
  console.log(`[seed-staff] found ${phases.length} phases across all stores`);

  let updatedTasks = 0;
  let skippedPhases = 0;
  for (const ph of phases) {
    const staffName = PHASE_TO_STAFF[ph.phaseNumber];
    if (!staffName) { skippedPhases++; continue; }
    const userId = byName[staffName];
    if (!userId) { skippedPhases++; continue; }
    const r = await prisma.task.updateMany({
      where: { phaseId: ph.id },
      data: { assigneeId: userId },
    });
    updatedTasks += r.count;
  }
  console.log(`[seed-staff] reassigned ${updatedTasks} tasks (${skippedPhases} phases skipped — no mapping)`);
  console.log("[seed-staff] DONE.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
