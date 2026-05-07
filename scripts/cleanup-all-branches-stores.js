// Delete ALL Branch + BusinessCenter + StoreProject records (and cascade to
// phases, tasks, issues, activities, dependencies, baselines, snapshots,
// notes, resources, time entries).
//
// User table is preserved; users' branchId is set to null first so Branch
// deletion doesn't fail on FK constraint (User.branchId is optional but
// has no onDelete cascade).
//
// Order (matters for FK):
//   1. StoreProject  → cascades Phase, Task, Issue, PhaseNote, Baseline, Snapshot, ScheduleSnapshot, Resource, ReportSchedule
//   2. BusinessCenter → must come before Branch (BC.branchId is REQUIRED)
//   3. User.branchId = null
//   4. Branch
//
// Usage:
//   Local:  DATABASE_URL="file:./dev.db"        node scripts/cleanup-all-branches-stores.js
//   VPS:    DATABASE_URL="file:./data/prod.db"  node scripts/cleanup-all-branches-stores.js
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`▶ Cleanup ALL branches/BCs/stores · DB=${dbUrl}`);
  const t0 = Date.now();

  // Pre-flight counts
  const [bBefore, bcBefore, sBefore] = await Promise.all([
    prisma.branch.count(),
    prisma.businessCenter.count(),
    prisma.storeProject.count(),
  ]);
  console.log(`  pre-flight: ${bBefore} branches · ${bcBefore} BCs · ${sBefore} stores`);

  if (bBefore + bcBefore + sBefore === 0) {
    console.log("  Nothing to delete. Exiting.");
    return;
  }

  // 1. Stores (cascades all child records)
  const stores = await prisma.storeProject.deleteMany({});
  console.log(`  · stores deleted:        ${stores.count}`);

  // 2. BusinessCenters (must come before Branches — BC.branchId is REQUIRED)
  const bcs = await prisma.businessCenter.deleteMany({});
  console.log(`  · business centers:      ${bcs.count}`);

  // 3. Detach users from any branches (User.branchId is optional, no auto-cascade)
  const usersDetached = await prisma.user.updateMany({
    where: { branchId: { not: null } },
    data: { branchId: null },
  });
  console.log(`  · users detached:        ${usersDetached.count}`);

  // 4. Branches
  const branches = await prisma.branch.deleteMany({});
  console.log(`  · branches deleted:      ${branches.count}`);

  // Verify
  const [bAfter, bcAfter, sAfter] = await Promise.all([
    prisma.branch.count(),
    prisma.businessCenter.count(),
    prisma.storeProject.count(),
  ]);
  console.log(`  post-check: ${bAfter} branches · ${bcAfter} BCs · ${sAfter} stores`);

  console.log(`✓ Done in ${Date.now() - t0}ms`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
