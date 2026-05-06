// Cleanup: delete all load_*@bitel.pe accounts created for load testing.
// Run on VPS: node scripts/cleanup-load-users.js
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbPath = process.env.DATABASE_URL || "file:./data/prod.db";
const adapter = new PrismaBetterSqlite3({ url: dbPath.replace("file:", "file:") });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.deleteMany({
    where: { email: { startsWith: "load_", endsWith: "@bitel.pe" } },
  });
  console.log(`✓ Deleted ${result.count} load-test users`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
