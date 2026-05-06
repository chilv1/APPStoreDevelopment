"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { PlanningStore, ScheduleResp } from "./types";

interface Props {
  store: PlanningStore;
  schedule: ScheduleResp | null;
  selectedPhaseId: string | null;
  onSelectPhase: (id: string | null) => void;
}

const MS_PER_DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function rangeOverlapsDay(start: Date, end: Date, day: Date): boolean {
  const dayStart = day.getTime();
  const dayEnd = dayStart + MS_PER_DAY - 1;
  return end.getTime() >= dayStart && start.getTime() <= dayEnd;
}

export default function CalendarView({ store, schedule, selectedPhaseId, onSelectPhase }: Props) {
  const t = useT();
  const phases = store.phases;
  const criticalSet = new Set(schedule?.criticalPath ?? []);

  // Initial month = month of project start (or today).
  const initialMonth = useMemo(() => {
    const earliest = phases.reduce<Date | null>((acc, p) => {
      if (!p.plannedStart) return acc;
      const d = new Date(p.plannedStart);
      if (!acc || d < acc) return d;
      return acc;
    }, null);
    return startOfMonth(earliest ?? new Date());
  }, [phases]);

  const [month, setMonth] = useState<Date>(initialMonth);

  // Build a 6-week grid (42 days) starting from the Monday of the week
  // containing the 1st of the month.
  const grid = useMemo(() => {
    const first = month;
    const dayOfWeek = first.getUTCDay(); // 0 = Sun
    const offset = (dayOfWeek + 6) % 7; // shift so Mon = 0
    const start = new Date(first.getTime() - offset * MS_PER_DAY);
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getTime() + i * MS_PER_DAY);
      cells.push({ date: d, inMonth: d.getUTCMonth() === first.getUTCMonth() });
    }
    return cells;
  }, [month]);

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)", gap: 10 }}>
        <button onClick={() => setMonth(addMonths(month, -1))} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>‹</button>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", flex: 1, textAlign: "center", margin: 0 }}>
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <button onClick={() => setMonth(addMonths(month, 1))} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>›</button>
        <button onClick={() => setMonth(startOfMonth(new Date()))} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>
          Hoy
        </button>
      </div>

      {/* Week-day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(110px, auto)" }}>
        {grid.map((cell, i) => {
          const today = startOfDay(new Date());
          const isToday = cell.date.getTime() === today.getTime();
          const day = startOfDay(cell.date);
          const overlapping = phases.filter((p) => {
            if (!p.plannedStart || !p.plannedEnd) return false;
            return rangeOverlapsDay(new Date(p.plannedStart), new Date(p.plannedEnd), day);
          });
          return (
            <div
              key={i}
              style={{
                padding: 6,
                borderRight: i % 7 !== 6 ? "1px solid rgba(15,23,42,0.05)" : "none",
                borderTop: i >= 7 ? "1px solid rgba(15,23,42,0.05)" : "none",
                opacity: cell.inMonth ? 1 : 0.4,
                background: isToday ? "rgba(59,130,246,0.05)" : "transparent",
                minHeight: 110,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? "#3b82f6" : "var(--text-primary)" }}>
                {cell.date.getUTCDate()}
              </div>
              {overlapping.slice(0, 3).map((p) => {
                const isCritical = criticalSet.has(p.id);
                const isSelected = selectedPhaseId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPhase(p.id)}
                    style={{
                      cursor: "pointer",
                      fontSize: 10,
                      padding: "2px 4px",
                      borderRadius: 3,
                      background: isCritical ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.1)",
                      color: isCritical ? "#dc2626" : "#1d4ed8",
                      border: isSelected ? "1px solid currentColor" : "1px solid transparent",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      fontWeight: 500,
                    }}
                    title={`F.${p.phaseNumber} ${p.name}`}
                  >
                    {isCritical ? "★ " : ""}F.{p.phaseNumber} {p.name}
                  </div>
                );
              })}
              {overlapping.length > 3 && (
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>+{overlapping.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
