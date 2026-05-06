-- Down-migration for 20260506000000_task_dependency.
--
-- Removes the TaskDependency join table after the Stream 1 / Aurora /
-- Planning features were rolled back. Phase.dependsOnId / dependencyType /
-- lagDays are kept (they were untouched and still drive the legacy
-- per-phase update API).
--
-- Idempotent: safe to re-run if the table is already gone.

DROP INDEX IF EXISTS "TaskDependency_successorId_idx";
DROP INDEX IF EXISTS "TaskDependency_predecessorId_successorId_key";
DROP TABLE IF EXISTS "TaskDependency";
