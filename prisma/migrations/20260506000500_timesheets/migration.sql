-- Stream 5 P1 — TimeEntry table for timesheet capture + approval.

CREATE TABLE "TimeEntry" (
  "id"          TEXT PRIMARY KEY NOT NULL,
  "userId"      TEXT NOT NULL,
  "phaseId"    TEXT NOT NULL,
  "taskId"      TEXT,
  "date"        DATETIME NOT NULL,
  "hours"       REAL NOT NULL,
  "billable"    BOOLEAN NOT NULL DEFAULT 1,
  "notes"       TEXT,
  "status"      TEXT NOT NULL DEFAULT 'DRAFT',
  "submittedAt" DATETIME,
  "approvedAt"  DATETIME,
  "approverId"  TEXT,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   DATETIME NOT NULL,
  CONSTRAINT "TimeEntry_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "User"  ("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "TimeEntry_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"  ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TimeEntry_phaseId_fkey"    FOREIGN KEY ("phaseId")    REFERENCES "Phase" ("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "TimeEntry_taskId_fkey"     FOREIGN KEY ("taskId")     REFERENCES "Task"  ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "TimeEntry_userId_date_idx" ON "TimeEntry"("userId", "date");
CREATE INDEX "TimeEntry_phaseId_idx"      ON "TimeEntry"("phaseId");
