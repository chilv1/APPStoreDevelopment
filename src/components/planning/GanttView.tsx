"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import type { PlanningStore, ScheduleResp } from "./types";

interface Props {
  store: PlanningStore;
  schedule: ScheduleResp | null;
  selectedPhaseId: string | null;
  onSelectPhase: (id: string | null) => void;
}

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 50;
const NAME_COL_WIDTH = 240;
const MS_PER_DAY = 86_400_000;

type Zoom = "day" | "week" | "month";

const PX_PER_DAY: Record<Zoom, number> = { day: 26, week: 14, month: 4 };

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export default function GanttView({ store, schedule, selectedPhaseId, onSelectPhase }: Props) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<Zoom>("week");

  const phases = store.phases;
  const tasksById = new Map((schedule?.tasks ?? []).map((x) => [x.id, x]));
  const criticalSet = new Set(schedule?.criticalPath ?? []);

  // Build min/max date range from data, padded.
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    let minMs = Infinity, maxMs = -Infinity;
    for (const p of phases) {
      const s = p.plannedStart ? new Date(p.plannedStart).getTime() : null;
      const e = p.plannedEnd   ? new Date(p.plannedEnd).getTime()   : null;
      if (s && s < minMs) minMs = s;
      if (e && e > maxMs) maxMs = e;
    }
    if (!Number.isFinite(minMs)) minMs = Date.now();
    if (!Number.isFinite(maxMs)) maxMs = minMs + 90 * MS_PER_DAY;
    const start = startOfDay(new Date(minMs - 7 * MS_PER_DAY));
    const end   = startOfDay(new Date(maxMs + 14 * MS_PER_DAY));
    const days  = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
    return { rangeStart: start, rangeEnd: end, totalDays: days };
  }, [phases]);

  const pxPerDay = PX_PER_DAY[zoom];
  const timelineWidth = totalDays * pxPerDay;

  // Scroll to today on mount.
  useEffect(() => {
    if (!containerRef.current) return;
    const today = startOfDay(new Date());
    const offset = ((today.getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;
    containerRef.current.scrollLeft = Math.max(0, offset - 200);
  }, [rangeStart, pxPerDay]);

  const dayOffset = (d: Date | string | null): number | null => {
    if (!d) return null;
    return ((startOfDay(new Date(d)).getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;
  };

  // Header tick marks: month + day.
  const ticks = useMemo(() => {
    const out: { left: number; label: string; major: boolean; weekend: boolean }[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(rangeStart.getTime() + i * MS_PER_DAY);
      const isMonthStart = d.getUTCDate() === 1;
      const isMondayOrMonth = d.getUTCDay() === 1 || isMonthStart;
      const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
      let label = "";
      if (zoom === "day") label = String(d.getUTCDate());
      else if (zoom === "week" && isMondayOrMonth) label = isMonthStart ? `${d.getUTCDate()}/${d.getUTCMonth() + 1}` : String(d.getUTCDate());
      else if (zoom === "month" && isMonthStart) label = d.toLocaleDateString(undefined, { month: "short" });
      out.push({ left: i * pxPerDay, label, major: isMonthStart, weekend: isWeekend });
    }
    return out;
  }, [rangeStart, totalDays, zoom, pxPerDay]);

  const todayOffset = dayOffset(new Date());

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border)", gap: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Zoom:</span>
        <div style={{ display: "flex", gap: 2, padding: 2, background: "rgba(15,23,42,0.04)", borderRadius: 6 }}>
          {(["day", "week", "month"] as Zoom[]).map((z) => (
            <button key={z} onClick={() => setZoom(z)} style={{
              padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
              background: zoom === z ? "var(--gradient-brand)" : "transparent",
              color: zoom === z ? "#fff" : "var(--text-secondary)",
            }}>{z}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: 2, marginRight: 4 }} /> Normal</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ef4444", borderRadius: 2, marginRight: 4 }} /> {t.planning.criticalPath}</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 4 }} /> {t.status.completed}</span>
        </div>
      </div>

      {/* Body — split: name col (sticky) + timeline (scrollable) */}
      <div style={{ display: "flex", maxHeight: 600 }}>
        {/* Name column */}
        <div style={{ width: NAME_COL_WIDTH, borderRight: "1px solid var(--border)", background: "var(--bg-card)", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ height: HEADER_HEIGHT, borderBottom: "1px solid var(--border)", padding: "0 12px", display: "flex", alignItems: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {t.planning.colName}
          </div>
          {phases.map((p) => {
            const isCritical = criticalSet.has(p.id);
            const isSelected = selectedPhaseId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPhase(p.id)}
                style={{
                  height: ROW_HEIGHT,
                  borderBottom: "1px solid rgba(15,23,42,0.05)",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 13,
                  cursor: "pointer",
                  background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                  borderLeft: isCritical ? "3px solid #ef4444" : "3px solid transparent",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span style={{ color: "var(--text-muted)", marginRight: 6, fontFamily: "monospace", fontSize: 11 }}>{p.phaseNumber}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: isSelected ? 600 : 500 }}>{p.name}</span>
              </div>
            );
          })}
        </div>

        {/* Timeline */}
        <div ref={containerRef} style={{ flex: 1, overflow: "auto" }}>
          <div style={{ width: timelineWidth, position: "relative" }}>
            {/* Header */}
            <div style={{ height: HEADER_HEIGHT, position: "sticky", top: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border)", zIndex: 2 }}>
              {ticks.map((tk, i) => (
                <div key={i} style={{
                  position: "absolute", left: tk.left, top: 0, height: HEADER_HEIGHT,
                  borderLeft: tk.major ? "1px solid var(--border-hover)" : tk.weekend ? "1px solid transparent" : "1px solid rgba(15,23,42,0.04)",
                  paddingLeft: 4, fontSize: 10, color: tk.major ? "var(--text-primary)" : "var(--text-muted)", fontWeight: tk.major ? 600 : 400,
                  display: "flex", alignItems: "flex-end", paddingBottom: 6,
                }}>{tk.label}</div>
              ))}
            </div>

            {/* Today line */}
            {todayOffset !== null && todayOffset >= 0 && todayOffset <= timelineWidth && (
              <div style={{
                position: "absolute",
                left: todayOffset,
                top: HEADER_HEIGHT,
                bottom: 0,
                width: 1,
                background: "#ef4444",
                zIndex: 1,
              }}>
                <div style={{ position: "absolute", top: -16, left: -18, fontSize: 9, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "2px 5px", borderRadius: 3 }}>
                  HOY
                </div>
              </div>
            )}

            {/* Phase rows */}
            {phases.map((p, idx) => {
              const x = dayOffset(p.plannedStart);
              const e = dayOffset(p.plannedEnd);
              if (x === null || e === null) return null;
              const w = Math.max(2, e - x);
              const isCritical = criticalSet.has(p.id);
              const isSelected = selectedPhaseId === p.id;
              const isCompleted = p.status === "COMPLETED";
              const top = HEADER_HEIGHT + idx * ROW_HEIGHT + 5;
              const barColor = isCompleted ? "#10b981" : isCritical ? "#ef4444" : p.status === "BLOCKED" ? "#f59e0b" : "#3b82f6";
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPhase(p.id)}
                  title={`${p.name} · ${p.plannedStart?.slice(0, 10)} → ${p.plannedEnd?.slice(0, 10)}`}
                  style={{
                    position: "absolute",
                    left: x,
                    top,
                    width: w,
                    height: ROW_HEIGHT - 10,
                    background: barColor,
                    borderRadius: 4,
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 0 0 2px rgba(59,130,246,0.4)" : "none",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 6px",
                    overflow: "hidden",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {/* progress overlay */}
                  {p.pct > 0 && (
                    <div style={{
                      position: "absolute",
                      left: 0, top: 0, bottom: 0,
                      width: `${p.pct}%`,
                      background: "rgba(0,0,0,0.18)",
                    }} />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>{w > 50 ? p.name : ""}</span>
                </div>
              );
            })}

            {/* Spacer to reserve full height for absolute children */}
            <div style={{ height: HEADER_HEIGHT + phases.length * ROW_HEIGHT }} />
          </div>
        </div>
      </div>
    </div>
  );
}
