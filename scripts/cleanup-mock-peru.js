// Cleanup mock data created by seed-mock-peru.js.
//
// Removes ONLY records with mock prefixes:
//   - StoreProject.code starting with 'PE_S_'
//   - BusinessCenter.code starting with 'PE_BC_'
//   - User.email starting with 'mock_'
//   - Branch.code starting with 'PE_'
//
// Cascade behavior (per schema): deleting StoreProject cascades Phase → Task,
// PhaseNote, Issue, PhaseBaseline → PhaseBaselineSnapshot. Activity rows with
// matching storeId/userId get the FK set to null (Prisma default for optional FKs).
//
// Order matters because of FK constraints:
//   1. StoreProject (frees up BC + User refs)
//   2. BusinessCenter (Branch FK is REQUIRED — must drop before Branch)
//   3. User       (mock_ users)
//   4. Branch     (PE_ branches)
//
// Usage:
//   Local:  DATABASE_URL="file:./dev.db"        node scripts/cleanup-mock-peru.js
//   VPS:    DATABASE_URL="file:./data/prod.db"  node scripts/cleanup-mock-peru.js
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`▶ Mock cleanup starting · DB=${dbUrl}`);
  const startTime = Date.now();

  // 1. Delete mock stores (cascades phases, tasks, phase notes, issues, baselines)
  const stores = await prisma.storeProject.deleteMany({
    where: { code: { startsWith: "PE_S_" } },
  });
  console.log(`  · stores deleted:    ${stores.count}`);

  // 2. Delete mock BCs (must come before branches due to required FK)
  const bcs = await prisma.businessCenter.deleteMany({
    where: { code: { startsWith: "PE_BC_" } },
  });
  console.log(`  · BCs deleted:       ${bcs.count}`);

  // 3. Delete mock users — relations to remaining records (Task.assigneeId,
  // Issue.reporterId, PhaseNote.authorId, etc.) are all optional, so Prisma
  // sets them to null automatically.
  const users = await prisma.user.deleteMany({
    where: { email: { startsWith: "mock_" } },
  });
  console.log(`  · users deleted:     ${users.count}`);

  // 4. Delete mock branches (only safe after BCs/users released)
  const branches = await prisma.branch.deleteMany({
    where: { code: { startsWith: "PE_" } },
  });
  console.log(`  · branches deleted:  ${branches.count}`);

  // 5. Tidy any orphaned Activity rows whose storeId/userId pointed to the
  // mock data — Prisma SetNull leaves them with null FKs, so they're safe but
  // a bit useless. Skip unless cleanup turns out to be needed; commenting out
  // by default to keep audit history.
  // const orphans = await prisma.activity.deleteMany({
  //   where: { OR: [{ storeId: null }, { userId: null }] },
  // });
  // console.log(`  · activity orphans cleared: ${orphans.count}`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Mock cleanup complete in ${elapsed}s`);
}

main()
  .catch((e) => { console.error("✗ Cleanup failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
