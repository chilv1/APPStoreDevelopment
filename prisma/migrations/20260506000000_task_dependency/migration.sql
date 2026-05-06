-- Phase 1 / Stream 1 (Advanced Dependencies)
--
-- Adds the multi-predecessor TaskDependency join table. Backfills one row
-- per existing Phase that already has a legacy `dependsOnId` set. The
-- legacy columns (Phase.dependsOnId / dependencyType / lagDays) are kept
-- intact for one sprint of backward compatibility; they will be dropped
-- in a follow-up migration once all callers read from TaskDependency.

CREATE TABLE "TaskDependency" (
  "id"            TEXT PRIMARY KEY NOT NULL,
  "predecessorId" TEXT NOT NULL,
  "successorId"   TEXT NOT NULL,
  "type"          TEXT NOT NULL DEFAULT 'FS',
  "lagDays"       INTEGER NOT NULL DEFAULT 0,
  "lagPercent"    INTEGER,
  "hard"          BOOLEAN NOT NULL DEFAULT 1,
  "notes"         TEXT,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     DATETIME NOT NULL,
  "createdBy"     TEXT,
  CONSTRAINT "TaskDependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Phase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskDependency_successorId_fkey"   FOREIGN KEY ("successorId")   REFERENCES "Phase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskDependency_createdBy_fkey"     FOREIGN KEY ("createdBy")     REFERENCES "User" ("id")  ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TaskDependency_predecessorId_successorId_key" ON "TaskDependency"("predecessorId", "successorId");
CREATE INDEX        "TaskDependency_successorId_idx"               ON "TaskDependency"("successorId");

-- Backfill from legacy single-predecessor fields. Use the Phase id as the
-- TaskDependency id (no need for cuid here — it's a deterministic 1:1 map
-- from the legacy edge), so re-running this migration in a recovery scenario
-- is idempotent against duplicates.
INSERT INTO "TaskDependency" (
  "id", "predecessorId", "successorId", "type", "lagDays",
  "hard", "createdAt", "updatedAt"
)
SELECT
  'legacy_' || p."id"  AS id,
  p."dependsOnId"      AS predecessorId,
  p."id"               AS successorId,
  p."dependencyType"   AS type,
  p."lagDays"          AS lagDays,
  1                    AS hard,
  CURRENT_TIMESTAMP    AS createdAt,
  CURRENT_TIMESTAMP    AS updatedAt
FROM "Phase" p
WHERE p."dependsOnId" IS NOT NULL;
