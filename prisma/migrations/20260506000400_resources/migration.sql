-- Stream 4 P2 — Resource + ResourceAssignment.

CREATE TABLE "Resource" (
  "id"           TEXT PRIMARY KEY NOT NULL,
  "name"         TEXT NOT NULL,
  "kind"         TEXT NOT NULL DEFAULT 'WORK',
  "email"        TEXT,
  "group"        TEXT,
  "maxUnits"     INTEGER NOT NULL DEFAULT 100,
  "standardRate" REAL NOT NULL DEFAULT 0,
  "overtimeRate" REAL NOT NULL DEFAULT 0,
  "costPerUse"   REAL NOT NULL DEFAULT 0,
  "storeId"      TEXT,
  "userId"       TEXT,
  "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    DATETIME NOT NULL,
  CONSTRAINT "Resource_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "StoreProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Resource_userId_fkey"  FOREIGN KEY ("userId")  REFERENCES "User"         ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Resource_storeId_idx" ON "Resource"("storeId");
CREATE INDEX "Resource_userId_idx"  ON "Resource"("userId");

CREATE TABLE "ResourceAssignment" (
  "id"         TEXT PRIMARY KEY NOT NULL,
  "resourceId" TEXT NOT NULL,
  "phaseId"    TEXT NOT NULL,
  "units"      INTEGER NOT NULL DEFAULT 100,
  "workHours"  REAL NOT NULL DEFAULT 0,
  "actualWork" REAL NOT NULL DEFAULT 0,
  "cost"       REAL NOT NULL DEFAULT 0,
  "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  DATETIME NOT NULL,
  CONSTRAINT "ResourceAssignment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResourceAssignment_phaseId_fkey"    FOREIGN KEY ("phaseId")    REFERENCES "Phase"    ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ResourceAssignment_resourceId_phaseId_key" ON "ResourceAssignment"("resourceId", "phaseId");
CREATE INDEX        "ResourceAssignment_phaseId_idx"            ON "ResourceAssignment"("phaseId");
