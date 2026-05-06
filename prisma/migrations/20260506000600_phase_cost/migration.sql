-- Stream 6 P1 — fixed cost on Phase + accrual model.

ALTER TABLE "Phase" ADD COLUMN "fixedCost"        REAL NOT NULL DEFAULT 0;
ALTER TABLE "Phase" ADD COLUMN "fixedCostAccrual" TEXT NOT NULL DEFAULT 'PRORATED';
