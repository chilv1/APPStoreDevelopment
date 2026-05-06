"use client";

import { useT } from "@/lib/i18n/context";
import type { PlanningStore, ScheduleResp } from "./types";

interface Props {
  store: PlanningStore;
  schedule: ScheduleResp | null;
  selectedPhaseId: string | null;
  onSelectPhase: (id: string | null) => void;
}

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

function dur(start: string | null, finish: string | null): string {
  if (!start || !finish) return "—";
  const ms = new Date(finish).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24))).toString();
}

export default function WBSGrid({ store, schedule, selectedPhaseId, onSelectPhase }: Props) {
  const t = useT();
  const tasksById = new Map((schedule?.tasks ?? []).map((x) => [x.id, x]));
  const criticalSet = new Set(schedule?.criticalPath ?? []);
  const phaseById = new Map(store.phases.map((p) => [p.id, p]));

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>{t.planning.colWBS}</th>
            <th>{t.planning.colName}</th>
            <th style={{ width: 110 }}>{t.planning.colDur}</th>
            <th style={{ width: 130 }}>{t.planning.colStart}</th>
            <th style={{ width: 130 }}>{t.planning.colFinish}</th>
            <th style={{ width: 200 }}>{t.planning.colPredecessors}</th>
            <th style={{ width: 110 }}>{t.planning.colProgress}</th>
            <th style={{ width: 90 }}>{t.planning.colCritical}</th>
          </tr>
        </thead>
        <tbody>
          {store.phases.map((p) => {
            const task = tasksById.get(p.id);
            const isCritical = criticalSet.has(p.id);
            const isSelected = selectedPhaseId === p.id;
            const start = task?.start ?? p.plannedStart;
            const finish = task?.finish ?? p.plannedEnd;
            const duration = task?.duration ?? Number(dur(p.plannedStart, p.plannedEnd));
            const predName = p.dependsOnId ? phaseById.get(p.dependsOnId)?.phaseNumber : null;
            const predLabel = predName ? `${predName} ${p.dependencyType}${p.lagDays ? ` ${p.lagDays > 0 ? "+" : ""}${p.lagDays}d` : ""}` : "—";
            return (
              <tr
                key={p.id}
                onClick={() => onSelectPhase(p.id)}
                style={{
                  cursor: "pointer",
                  background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                  borderLeft: isCritical ? "3px solid #ef4444" : "3px solid transparent",
                }}
              >
                <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontWeight: 600 }}>
                  {p.phaseNumber}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.taskCount} tasks</div>
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>
                  {duration > 0 ? `${duration} ${t.planning.days}` : "—"}
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(start)}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(finish)}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{predLabel}</td>
                <td>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${p.pct}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{p.pct}%</div>
                </td>
                <td>
                  {isCritical && (
                    <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", borderColor: "rgba(239,68,68,0.3)" }}>
                      ★
                    </span>
                  )}
                  {task && !isCritical && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      TF {task.totalFloat}d
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
