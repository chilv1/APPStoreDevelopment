/**
 * AI assistant — schedule risk analyzer (deterministic, no external LLM).
 *
 * Operates on the scheduler engine output + raw phase data. Produces a
 * scored list of "risks" the user should look at, plus a one-paragraph
 * weekly status summary in plain prose.
 *
 * Why deterministic instead of an LLM call:
 *   - zero API key / cost
 *   - reproducible explanations (audit-friendly)
 *   - works offline
 *
 * Stream 9 P2 will swap-in an LLM behind the same interface for richer
 * narratives, but the same risk-scoring rules will continue to seed it.
 */

import type { ScheduleResult } from "@/lib/scheduler/types";

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ScheduleRisk {
  code: string;
  severity: RiskSeverity;
  taskId?: string;
  taskName?: string;
  message: string;
  suggestion?: string;
}

export interface PhaseLite {
  id: string;
  phaseNumber: number;
  name: string;
  status: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  deadline: Date | null;
  progressPct: number;
}

const MS_PER_DAY = 86_400_000;

function diffDays(a: Date | null | undefined, b: Date | null | undefined): number | null {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

const SEV_RANK: Record<RiskSeverity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function analyzeRisks(result: ScheduleResult, phases: PhaseLite[]): ScheduleRisk[] {
  const risks: ScheduleRisk[] = [];
  const today = Date.now();

  // Cycle errors (always CRITICAL).
  for (const e of result.errors) {
    if (e.code === "CYCLE") {
      risks.push({
        code: "CYCLE",
        severity: "CRITICAL",
        message: e.message,
        suggestion: "Remove one edge from the cycle (open the dependency editor and delete the offending predecessor).",
      });
    }
    if (e.code === "SELF_LOOP") {
      risks.push({ code: "SELF_LOOP", severity: "HIGH", taskId: e.taskId, message: e.message });
    }
  }

  // Engine warnings → translate to risks.
  for (const w of result.warnings) {
    if (w.code === "DEADLINE_MISSED") {
      risks.push({
        code: "DEADLINE_MISSED",
        severity: "HIGH",
        taskId: w.taskId,
        message: w.message,
        suggestion: "Compress the predecessors via lead-time, increase resources, or renegotiate the deadline.",
      });
    } else if (w.code === "CONSTRAINT_VIOLATION") {
      risks.push({
        code: "CONSTRAINT_VIOLATION",
        severity: "MEDIUM",
        taskId: w.taskId,
        message: w.message,
        suggestion: "Verify the constraint date — either dependency-driven dates need to shift earlier, or the constraint is too aggressive.",
      });
    }
  }

  // Negative-float / on-the-edge tasks.
  const tasksById = new Map(result.tasks.map((t) => [t.id, t]));
  for (const t of result.tasks) {
    if (t.totalFloat < 0) {
      risks.push({
        code: "NEGATIVE_FLOAT",
        severity: t.totalFloat <= -10 ? "CRITICAL" : "HIGH",
        taskId: t.id, taskName: t.name,
        message: `Task "${t.name}" has total float ${t.totalFloat} working days — already late vs. project finish.`,
        suggestion: "Crash the task duration, fast-track the predecessor, or accept the slip and rebaseline.",
      });
    } else if (t.totalFloat === 0 && t.critical) {
      risks.push({
        code: "ZERO_FLOAT_CRITICAL",
        severity: "MEDIUM",
        taskId: t.id, taskName: t.name,
        message: `"${t.name}" sits on the critical path — any delay shifts the project finish.`,
        suggestion: "Add a contingency buffer or ensure resources are allocated 100%.",
      });
    }
  }

  // Phases past their plannedEnd but not COMPLETED.
  for (const p of phases) {
    if (p.status !== "COMPLETED" && p.plannedEnd && p.plannedEnd.getTime() < today - 2 * MS_PER_DAY) {
      const days = Math.round((today - p.plannedEnd.getTime()) / MS_PER_DAY);
      risks.push({
        code: "PHASE_OVERDUE",
        severity: days >= 14 ? "HIGH" : "MEDIUM",
        taskId: p.id, taskName: p.name,
        message: `"${p.name}" is ${days} day${days === 1 ? "" : "s"} past its planned finish but is still ${p.status}.`,
        suggestion: "Update the actual finish date or move the planned end forward to reflect reality.",
      });
    }
    // Started phases with no progress.
    if (p.status === "IN_PROGRESS" && p.plannedStart && p.plannedStart.getTime() < today - 7 * MS_PER_DAY && p.progressPct === 0) {
      risks.push({
        code: "STALLED",
        severity: "MEDIUM",
        taskId: p.id, taskName: p.name,
        message: `"${p.name}" has been IN_PROGRESS for over a week with 0% progress logged.`,
        suggestion: "Log task progress or move the phase back to NOT_STARTED if work paused.",
      });
    }
  }

  // Sort by severity desc, then by name.
  risks.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || (a.taskName ?? "").localeCompare(b.taskName ?? ""));
  return risks;
}

export function buildWeeklySummary(result: ScheduleResult, phases: PhaseLite[], risks: ScheduleRisk[]): string {
  const today = new Date();
  const finish = result.projectFinish ? new Date(result.projectFinish) : null;
  const daysToFinish = finish ? Math.round((finish.getTime() - today.getTime()) / MS_PER_DAY) : null;

  const completed   = phases.filter((p) => p.status === "COMPLETED").length;
  const inProgress  = phases.filter((p) => p.status === "IN_PROGRESS").length;
  const blocked     = phases.filter((p) => p.status === "BLOCKED").length;
  const totalPhases = phases.length;
  const cpLength    = result.criticalPath.length;
  const errors      = result.errors.length;
  const critRisks   = risks.filter((r) => r.severity === "CRITICAL").length;
  const highRisks   = risks.filter((r) => r.severity === "HIGH").length;

  const parts: string[] = [];
  parts.push(`As of ${today.toLocaleDateString()}, the project has ${completed}/${totalPhases} phases completed (${Math.round((completed / Math.max(1, totalPhases)) * 100)}%) and ${inProgress} actively in progress.`);
  if (daysToFinish !== null) {
    parts.push(daysToFinish > 0
      ? `Projected finish is in ${daysToFinish} working days (${finish!.toLocaleDateString()}).`
      : daysToFinish === 0
        ? `Projected finish is today.`
        : `The schedule finished ${Math.abs(daysToFinish)} days ago — close out the remaining open phases and rebaseline.`);
  }
  parts.push(`The critical path runs through ${cpLength} phase${cpLength === 1 ? "" : "s"}.`);
  if (blocked > 0) parts.push(`${blocked} phase${blocked === 1 ? " is" : "s are"} BLOCKED — unblock these before pushing other work forward.`);
  if (errors > 0) parts.push(`The scheduler reported ${errors} hard error${errors === 1 ? "" : "s"} (cycles or invalid constraints) — these prevent reliable schedule arithmetic.`);
  if (critRisks > 0 || highRisks > 0) {
    parts.push(`${critRisks} critical and ${highRisks} high-severity risk${critRisks + highRisks === 1 ? "" : "s"} detected — see the risk panel for details.`);
  } else {
    parts.push(`No critical or high risks detected this week.`);
  }
  return parts.join(" ");
}
