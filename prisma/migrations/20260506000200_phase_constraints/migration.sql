-- Phase 1.5 / P2 — constraint types + deadline on Phase.
-- ASAP/ALAP/MSO/MFO/SNET/SNLT/FNET/FNLT — values are validated at API layer.

ALTER TABLE "Phase" ADD COLUMN "constraintType" TEXT;
ALTER TABLE "Phase" ADD COLUMN "constraintDate" DATETIME;
ALTER TABLE "Phase" ADD COLUMN "deadline"       DATETIME;
