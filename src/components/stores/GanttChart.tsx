"use client";

import { useMemo } from "react";
import { PHASE_ICONS } from "@/lib/utils";

const PHASE_DURATIONS = [30, 14, 21, 14, 21, 60, 21, 21, 14, 14, 30];
const DAY_MS = 1000 * 60 * 60 * 24;

type DerivedStatus = "DONE" | "ON_TRACK" | "AT_RISK" | "OVERDUE" | "NOT_STARTED" | "BLOCKED";

const STATUS_THEME: Record<DerivedStatus, { color: string; label: string; emoji: string }> = {
  DONE:        { color: "#10b981", label: "Hoàn thành",     emoji: "✓" },
  ON_TRACK:    { color: "#3b82f6", label: "Đúng tiến độ",   emoji: "▶" },
  AT_RISK:     { color: "#f59e0b", label: "Sắp trễ",        emoji: "⚠" },
  OVERDUE:     { color: "#ef4444", label: "Đã trễ",         emoji: "⚠" },
  NOT_STARTED: { color: "#6b7280", label: "Chưa bắt đầu",   emoji: "○" },
  BLOCKED:     { color: "#a855f7", label: "Vướng mắc",      emoji: "✕" },
};

function deriveStatus(phase: any, now: Date): DerivedStatus {
  if (phase.status === "BLOCKED") return "BLOCKED";
  if (phase.status === "COMPLETED") return "DONE";

  const plannedEnd = phase.plannedEnd ? new Date(phase.plannedEnd) : null;
  if (plannedEnd && plannedEnd.getTime() < now.getTime()) return "OVERDUE";

  if (plannedEnd) {
    const daysLeft = (plannedEnd.getTime() - now.getTime()) / DAY_MS;
    if (daysLeft <= 3) return "AT_RISK";
  }

  if (phase.status === "IN_PROGRESS") return "ON_TRACK";
  return "NOT_STARTED";
}

function getProgress(phase: any): number {
  const tasks = phase.tasks || [];
  if (tasks.length === 0) return phase.status === "COMPLETED" ? 100 : 0;
  const done = tasks.filter((t: any) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function GanttChart({ phases, targetDate }: { phases: any[]; targetDate?: string | null }) {
  if (!phases.length) return null;

  const now = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  // Fill in fallback dates for phases that have none
  const phasesWithDates = useMemo(() => phases.map((p, idx) => {
    if (p.plannedStart && p.plannedEnd) return p;
    const offset = PHASE_DURATIONS.slice(0, idx).reduce((a, b) => a + b, 0);
    const dur = PHASE_DURATIONS[idx] ?? 14;
    const base = new Date(now);
    const s = new Date(base); s.setDate(s.getDate() + offset);
    const e = new Date(s);    e.setDate(e.getDate() + dur);
    return { ...p, plannedStart: s.toISOString(), plannedEnd: e.toISOString(), _fallback: true };
  }), [phases, now]);

  const target = targetDate ? new Date(targetDate) : null;

  // Compute timeline range — extend if targetDate is outside planned range
  const start = useMemo(() => {
    let min = Math.min(...phasesWithDates.map((p: any) => new Date(p.plannedStart).getTime()));
    if (target) min = Math.min(min, target.getTime());
    return new Date(min);
  }, [phasesWithDates, target]);

  const end = useMemo(() => {
    let max = Math.max(...phasesWithDates.map((p: any) => new Date(p.plannedEnd).getTime()));
    if (target) max = Math.max(max, target.getTime());
    return new Date(max);
  }, [phasesWithDates, target]);

  const totalDays = Math.max((end.getTime() - start.getTime()) / DAY_MS, 1);

  const pctFromDate = (date: string | Date): number =>
    ((new Date(date).getTime() - start.getTime()) / DAY_MS) / totalDays * 100;

  const widthFromRange = (s: string | Date, e: string | Date): number =>
    Math.max(((new Date(e).getTime() - new Date(s).getTime()) / DAY_MS) / totalDays * 100, 0.5);

  const todayPct = pctFromDate(now);
  const targetPct = target ? pctFromDate(target) : null;

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const out: { date: Date; label: string; pct: number; weeks: { pct: number }[] }[] = [];
    const cursor = new Date(start);
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    const endTime = end.getTime();
    while (cursor.getTime() <= endTime) {
      const pct = pctFromDate(cursor);
      // Week markers within this month
      const weeks: { pct: number }[] = [];
      const weekCursor = new Date(cursor);
      weekCursor.setDate(8); // skip first week (overlaps month label)
      const monthEnd = new Date(cursor); monthEnd.setMonth(monthEnd.getMonth() + 1);
      while (weekCursor < monthEnd && weekCursor.getTime() <= endTime) {
        const wp = pctFromDate(weekCursor);
        if (wp >= 0 && wp <= 100) weeks.push({ pct: wp });
        weekCursor.setDate(weekCursor.getDate() + 7);
      }
      out.push({
        date: new Date(cursor),
        label: cursor.toLocaleDateString("vi-VN", { month: "short" }).replace("thg ", "Th "),
        pct,
        weeks,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [start, end]);

  // Days until opening
  const daysUntilOpening = target ? Math.ceil((target.getTime() - now.getTime()) / DAY_MS) : null;
  const openingMsg = daysUntilOpening == null ? null
    : daysUntilOpening > 0 ? `Khai trương: ${daysUntilOpening} ngày nữa`
    : daysUntilOpening === 0 ? "Khai trương hôm nay 🎉"
    : `Đã quá hạn khai trương ${Math.abs(daysUntilOpening)} ngày`;

  const LEFT_COL = 200;  // px - phase label column width
  const RIGHT_COL = 110; // px - status badge column width
  const ROW_HEIGHT = 56;
  const BAR_AREA_HEIGHT = 36;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", margin: 0 }}>
          📅 Gantt Chart — Tiến Độ 11 Giai Đoạn
        </h2>
        {openingMsg && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: daysUntilOpening != null && daysUntilOpening < 0 ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)",
            border: `1px solid ${daysUntilOpening != null && daysUntilOpening < 0 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
            color: daysUntilOpening != null && daysUntilOpening < 0 ? "#fca5a5" : "#93c5fd",
            borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 600,
          }}>
            🎯 <span>{openingMsg}</span>
          </div>
        )}
      </div>

      {phasesWithDates.some((p: any) => p._fallback) && (
        <div style={{ marginBottom: 12, fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "6px 10px", display: "inline-block" }}>
          ⚠️ Một số giai đoạn chưa có ngày kế hoạch — đang hiển thị ước tính
        </div>
      )}

      {/* Status legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14, fontSize: 11, color: "var(--text-secondary)" }}>
        {Object.entries(STATUS_THEME).filter(([k]) => k !== "BLOCKED").map(([key, theme]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: theme.color, display: "inline-block" }} />
            {theme.label}
          </div>
        ))}
      </div>

      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "16px 20px", overflowX: "auto",
      }}>
        <div style={{ minWidth: 720, position: "relative" }}>

          {/* Month header strip */}
          <div style={{
            position: "relative",
            marginLeft: LEFT_COL, marginRight: RIGHT_COL,
            height: 28, marginBottom: 8,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            {monthMarkers.map((m, i) => (
              <div key={i} style={{
                position: "absolute", left: `${m.pct}%`, top: 0,
                fontSize: 11, color: "var(--text-secondary)", fontWeight: 600,
                paddingLeft: 6, borderLeft: "1px solid rgba(255,255,255,0.08)",
                height: "100%",
              }}>
                {m.label}
              </div>
            ))}
            {/* Today label on header */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div style={{
                position: "absolute", left: `${todayPct}%`, top: -4,
                transform: "translateX(-50%)",
                background: "#ef4444", color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                whiteSpace: "nowrap", zIndex: 5,
              }}>
                Hôm nay · {fmtDate(now)}
              </div>
            )}
          </div>

          {/* Rows */}
          <div style={{ position: "relative" }}>
            {/* Today vertical line spanning all rows */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div style={{
                position: "absolute",
                left: `calc(${LEFT_COL}px + (100% - ${LEFT_COL + RIGHT_COL}px) * ${todayPct} / 100)`,
                top: 0, bottom: 0, width: 2, background: "#ef4444", opacity: 0.55,
                zIndex: 3, pointerEvents: "none",
              }} />
            )}
            {/* Target opening vertical line */}
            {targetPct !== null && targetPct >= 0 && targetPct <= 100 && (
              <div style={{
                position: "absolute",
                left: `calc(${LEFT_COL}px + (100% - ${LEFT_COL + RIGHT_COL}px) * ${targetPct} / 100)`,
                top: 0, bottom: 0, width: 2, background: "#10b981", opacity: 0.4,
                zIndex: 3, pointerEvents: "none",
                borderLeft: "2px dashed #10b981",
              }} />
            )}

            {phasesWithDates.map((phase: any) => {
              const status = deriveStatus(phase, now);
              const theme = STATUS_THEME[status];
              const progress = getProgress(phase);
              const plannedLeft = pctFromDate(phase.plannedStart);
              const plannedWidth = widthFromRange(phase.plannedStart, phase.plannedEnd);

              // Derive actual bar:
              //  - COMPLETED: full plannedStart -> plannedEnd (with 100% fill)
              //  - IN_PROGRESS / has progress > 0: plannedStart -> today (with progress fill)
              //  - explicit actualStart wins over derivation
              const showActualBar =
                phase.actualStart != null ||
                phase.status === "COMPLETED" ||
                phase.status === "IN_PROGRESS" ||
                progress > 0;
              const actualStart = phase.actualStart
                ? new Date(phase.actualStart)
                : showActualBar ? new Date(phase.plannedStart) : null;
              const actualEndForDisplay = phase.actualEnd
                ? new Date(phase.actualEnd)
                : phase.status === "COMPLETED" ? new Date(phase.plannedEnd)
                : showActualBar
                  ? (now.getTime() < new Date(phase.plannedEnd).getTime() ? now : new Date(phase.plannedEnd))
                  : null;
              const actualLeft = actualStart ? pctFromDate(actualStart) : 0;
              const actualWidth = actualStart && actualEndForDisplay
                ? widthFromRange(actualStart, actualEndForDisplay) : 0;
              const hasActual = showActualBar && actualWidth > 0;

              return (
                <div key={phase.id} style={{ display: "flex", alignItems: "center", height: ROW_HEIGHT, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {/* Left label */}
                  <div style={{
                    width: LEFT_COL, flexShrink: 0, paddingRight: 10,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{PHASE_ICONS[phase.phaseNumber]}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#f0f4ff", fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        GĐ {phase.phaseNumber}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {phase.name}
                      </div>
                    </div>
                  </div>

                  {/* Bar area */}
                  <div style={{ flex: 1, position: "relative", height: BAR_AREA_HEIGHT, minWidth: 0 }}>
                    {/* Background grid - month dividers */}
                    {monthMarkers.map((m, i) => (
                      <div key={`grid-${i}`} style={{
                        position: "absolute", left: `${m.pct}%`, top: 0, bottom: 0,
                        width: 1, background: "rgba(255,255,255,0.04)", pointerEvents: "none",
                      }} />
                    ))}

                    {/* Main bar (planned area, with progress fill inside) */}
                    <div title={`Kế hoạch: ${fmtDate(phase.plannedStart)} → ${fmtDate(phase.plannedEnd)}${hasActual ? `\nThực tế: ${fmtDate(actualStart!)} → ${phase.actualEnd ? fmtDate(phase.actualEnd) : "Hôm nay"}` : ""}\nTiến độ: ${progress}%`} style={{
                      position: "absolute",
                      left: `${plannedLeft}%`,
                      width: `${plannedWidth}%`,
                      top: hasActual ? 4 : 8,
                      height: hasActual ? 20 : 22,
                      background: phase._fallback ? "rgba(255,255,255,0.04)" : `${theme.color}22`,
                      border: `1px ${phase._fallback ? "dashed" : "solid"} ${theme.color}66`,
                      borderRadius: 4,
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                      boxShadow: status === "OVERDUE" ? `0 0 12px ${theme.color}55` : undefined,
                    }}>
                      {/* Progress fill from left */}
                      {progress > 0 && (
                        <div style={{
                          width: `${progress}%`, height: "100%",
                          background: theme.color,
                          transition: "width 0.3s ease",
                        }} />
                      )}
                    </div>

                    {/* Planned reference strip below (only when there's an actual override) */}
                    {phase.actualStart && (
                      <div title={`Kế hoạch ban đầu: ${fmtDate(phase.plannedStart)} → ${fmtDate(phase.plannedEnd)}`} style={{
                        position: "absolute",
                        left: `${plannedLeft}%`,
                        width: `${plannedWidth}%`,
                        top: 28, height: 4,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px dashed rgba(255,255,255,0.15)",
                        borderRadius: 2,
                      }} />
                    )}

                    {/* Bar label (phase name + progress) */}
                    <div style={{
                      position: "absolute",
                      left: `${plannedLeft}%`,
                      width: `${plannedWidth}%`,
                      top: hasActual ? 4 : 8,
                      height: hasActual ? 20 : 22,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      paddingLeft: 8, paddingRight: 8,
                      fontSize: 10, color: "#fff", fontWeight: 600,
                      pointerEvents: "none", overflow: "hidden", whiteSpace: "nowrap",
                      textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                    }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{phase.name}</span>
                      {progress > 0 && plannedWidth > 6 && (
                        <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, opacity: 0.95, flexShrink: 0 }}>{progress}%</span>
                      )}
                    </div>
                  </div>

                  {/* Right status badge */}
                  <div style={{ width: RIGHT_COL, flexShrink: 0, paddingLeft: 12 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      background: `${theme.color}1a`,
                      color: theme.color,
                      border: `1px solid ${theme.color}40`,
                      borderRadius: 99, padding: "3px 9px",
                      whiteSpace: "nowrap",
                    }}>
                      {theme.emoji} {theme.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Target opening milestone diamond at bottom row */}
          {targetPct !== null && targetPct >= 0 && targetPct <= 100 && target && (
            <div style={{
              position: "absolute",
              left: `calc(${LEFT_COL}px + (100% - ${LEFT_COL + RIGHT_COL}px) * ${targetPct} / 100)`,
              bottom: -8,
              transform: "translateX(-50%)",
              zIndex: 4, pointerEvents: "none",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 9, color: "#10b981", fontWeight: 700, whiteSpace: "nowrap", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 4, padding: "2px 6px" }}>
                  ◆ Khai trương · {fmtDate(target)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
