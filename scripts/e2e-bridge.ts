// Run via:  npx tsx scripts/e2e-bridge.ts
// Validates the new TaskDependency-aware scheduler against local dev DB.
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { scheduleStore } from "../src/lib/scheduler/db-bridge";

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
  const prisma = new PrismaClient({ adapter });
  const stores = await prisma.storeProject.findMany({ take: 1, select: { id: true, code: true, name: true } });
  if (stores.length === 0) { console.error("No stores"); process.exit(1); }
  const s = stores[0];
  console.log(`Scheduling store ${s.code} ${s.name}...`);
  const result = await scheduleStore(prisma, s.id);
  console.log(`Phases:            ${result.tasks.length}`);
  console.log(`Dependencies:      ${result.metrics.dependencyCount}`);
  console.log(`Project span:      ${result.projectStart.toISOString().slice(0,10)} → ${result.projectFinish.toISOString().slice(0,10)} (${result.durationDays} working days)`);
  console.log(`Critical path:     ${result.criticalPath.length} phases`);
  console.log(`Errors / Warnings: ${result.errors.length} / ${result.warnings.length}`);
  console.log(`Engine elapsed:    ${result.metrics.elapsedMs}ms`);
  console.log(`Critical phases:`);
  for (const id of result.criticalPath) {
    const t = result.tasks.find((x) => x.id === id)!;
    console.log(`  - ${t.name}: ${t.start.toISOString().slice(0,10)} → ${t.finish.toISOString().slice(0,10)}  (TF=${t.totalFloat})`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
