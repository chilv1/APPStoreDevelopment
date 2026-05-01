-- CreateTable Branch
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateTable BusinessCenter
CREATE TABLE "BusinessCenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessCenter_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BusinessCenter_code_key" ON "BusinessCenter"("code");

-- AlterTable User: add branchId
ALTER TABLE "User" ADD COLUMN "branchId" TEXT REFERENCES "Branch"("id");

-- AlterTable StoreProject: make region nullable, add businessCenterId
ALTER TABLE "StoreProject" ADD COLUMN "businessCenterId" TEXT REFERENCES "BusinessCenter"("id");
