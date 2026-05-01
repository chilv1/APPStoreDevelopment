#!/usr/bin/env node
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbFile = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace("file:", "")
  : path.join(__dirname, "../dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFile}` });
const prisma = new PrismaClient({ adapter });

const PHASE_DURATIONS = [30, 14, 21, 14, 21, 60, 21, 21, 14, 14, 30];

async function main() {
  const phases = await prisma.phase.findMany({
    where: { OR: [{ plannedStart: null }, { plannedEnd: null }] },
    include: { store: { select: { id: true, name: true, createdAt: true } } },
    orderBy: [{ storeId: "asc" }, { phaseNumber: "asc" }],
  });

  if (phases.length === 0) { console.log("✅ Tất cả giai đoạn đã có ngày kế hoạch."); return; }
  console.log(`📋 Tìm thấy ${phases.length} giai đoạn chưa có ngày kế hoạch...`);

  // Group by store
  const byStore = {};
  for (const p of phases) {
    if (!byStore[p.storeId]) byStore[p.storeId] = [];
    byStore[p.storeId].push(p);
  }

  let total = 0;
  for (const [storeId, storePhases] of Object.entries(byStore)) {
    const storeName = storePhases[0].store.name;
    const base = new Date(storePhases[0].store.createdAt);
    base.setHours(0, 0, 0, 0);

    for (const phase of storePhases) {
      const idx = phase.phaseNumber - 1;
      const offset = PHASE_DURATIONS.slice(0, idx).reduce((a, b) => a + b, 0);
      const dur = PHASE_DURATIONS[idx] ?? 14;
      const plannedStart = new Date(base);
      plannedStart.setDate(plannedStart.getDate() + offset);
      const plannedEnd = new Date(plannedStart);
      plannedEnd.setDate(plannedEnd.getDate() + dur);

      await prisma.phase.update({
        where: { id: phase.id },
        data: { plannedStart, plannedEnd },
      });
      total++;
    }
    console.log(`  ✅ ${storeName} — cập nhật ${storePhases.length} giai đoạn`);
  }

  console.log(`\n✅ Hoàn thành! Đã cập nhật ${total} giai đoạn.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
