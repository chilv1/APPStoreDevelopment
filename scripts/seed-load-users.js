// Seed 100 load-test users with predictable emails + roles.
// Run on VPS: node scripts/seed-load-users.js
//
// Distribution:
//   load_001..005    → ADMIN
//   load_006..020    → AREA_MANAGER (assigned round-robin to existing branches)
//   load_021..080    → PM
//   load_081..100    → SURVEY_STAFF
//
// All passwords = "loadtest123" (bcrypt rounds=10).
// Output: writes tests/load/users.json with email/password/role list.
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const dbPath = process.env.DATABASE_URL || "file:./data/prod.db";
const adapter = new PrismaBetterSqlite3({ url: dbPath.replace("file:", "file:") });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seed load-test users · target 100 accounts");
  const password = "loadtest123";
  const hashed = await bcrypt.hash(password, 10);

  // Get branches to round-robin Area Managers
  const branches = await prisma.branch.findMany({ select: { id: true, code: true } });
  console.log(`Found ${branches.length} branches`);

  const usersToCreate = [];
  for (let i = 1; i <= 100; i++) {
    const num = String(i).padStart(3, "0");
    const email = `load_${num}@bitel.pe`;
    let role, branchId;

    if (i <= 5) {
      role = "ADMIN";
      branchId = null;
    } else if (i <= 20) {
      role = "AREA_MANAGER";
      branchId = branches[(i - 6) % branches.length]?.id ?? null;
    } else if (i <= 80) {
      role = "PM";
      branchId = branches[(i - 21) % branches.length]?.id ?? null;
    } else {
      role = "SURVEY_STAFF";
      branchId = branches[(i - 81) % branches.length]?.id ?? null;
    }

    usersToCreate.push({
      name: `Load Test ${num}`,
      email,
      password: hashed,
      role,
      branchId,
    });
  }

  // Upsert (idempotent — re-running is safe)
  let created = 0, updated = 0;
  for (const u of usersToCreate) {
    const result = await prisma.user.upsert({
      where: { email: u.email },
      create: u,
      update: { name: u.name, role: u.role, branchId: u.branchId, password: u.password },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
  }
  console.log(`✓ Created ${created} new, updated ${updated} existing`);

  // Write users.json for k6 to consume
  const outFile = path.resolve(__dirname, "../tests/load/users.json");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      usersToCreate.map((u) => ({ email: u.email, password, role: u.role })),
      null,
      2
    )
  );
  console.log(`✓ Wrote ${usersToCreate.length} entries to ${outFile}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
