-- P3 bundle: stage-gate (Stream 8) + time-phased baseline (Stream 3) + ReportSchedule (Stream 7).

-- Stage-gate columns on Phase
ALTER TABLE "Phase" ADD COLUMN "gateRequired"   BOOLEAN  NOT NULL DEFAULT 0;
ALTER TABLE "Phase" ADD COLUMN "gateApprovedAt" DATETIME;
ALTER TABLE "Phase" ADD COLUMN "gateApproverId" TEXT REFERENCES "User"("id") ON DELETE SET NULL;

-- Time-phased baseline columns on PhaseBaselineSnapshot
ALTER TABLE "PhaseBaselineSnapshot" ADD COLUMN "fixedCost"    REAL NOT NULL DEFAULT 0;
ALTER TABLE "PhaseBaselineSnapshot" ADD COLUMN "workHours"    REAL NOT NULL DEFAULT 0;
ALTER TABLE "PhaseBaselineSnapshot" ADD COLUMN "totalCost"    REAL NOT NULL DEFAULT 0;
ALTER TABLE "PhaseBaselineSnapshot" ADD COLUMN "progressPct"  INTEGER NOT NULL DEFAULT 0;

-- ReportSchedule
CREATE TABLE "ReportSchedule" (
  "id"          TEXT PRIMARY KEY NOT NULL,
  "name"        TEXT NOT NULL,
  "reportKind"  TEXT NOT NULL DEFAULT 'WEEKLY_SUMMARY',
  "cron"        TEXT NOT NULL,
  "recipients"  TEXT NOT NULL,
  "storeId"     TEXT,
  "enabled"     BOOLEAN NOT NULL DEFAULT 1,
  "lastRunAt"   DATETIME,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   DATETIME NOT NULL,
  "createdBy"   TEXT,
  CONSTRAINT "ReportSchedule_storeId_fkey"   FOREIGN KEY ("storeId")   REFERENCES "StoreProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReportSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"         ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
