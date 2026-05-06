-- Stream 2 P2 — ScheduleSnapshot: frozen scheduler output for diffs over time.

CREATE TABLE "ScheduleSnapshot" (
  "id"       TEXT PRIMARY KEY NOT NULL,
  "storeId"  TEXT NOT NULL,
  "takenAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason"   TEXT,
  "payload"  TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "takenBy"  TEXT,
  CONSTRAINT "ScheduleSnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "StoreProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScheduleSnapshot_takenBy_fkey" FOREIGN KEY ("takenBy") REFERENCES "User"         ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ScheduleSnapshot_storeId_takenAt_idx" ON "ScheduleSnapshot"("storeId", "takenAt");
