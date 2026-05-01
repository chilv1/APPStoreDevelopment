-- SQLite: recreate table to drop NOT NULL on region
-- Step 1: Create new table
CREATE TABLE "StoreProject_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT,
    "targetOpenDate" DATETIME,
    "actualOpenDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "budget" REAL,
    "notes" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pmId" TEXT,
    "businessCenterId" TEXT,
    CONSTRAINT "StoreProject_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoreProject_businessCenterId_fkey" FOREIGN KEY ("businessCenterId") REFERENCES "BusinessCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 2: Copy data
INSERT INTO "StoreProject_new" SELECT * FROM "StoreProject";

-- Step 3: Drop old, rename new
DROP TABLE "StoreProject";
ALTER TABLE "StoreProject_new" RENAME TO "StoreProject";

-- Step 4: Recreate unique index
CREATE UNIQUE INDEX "StoreProject_code_key" ON "StoreProject"("code");
