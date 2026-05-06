"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { PlanningStore, ScheduleResp } from "./types";

interface Props {
  stores: PlanningStore[];
  selectedPhaseId: string | null;
  onSelectPhase: (phaseId: string | null, storeId: string | null) => void;
  onMutate: () => void;
  schedulesByStore: Map<string, ScheduleResp>;
  onRequestSchedule: (storeId: string) => void;
}

const ROW_HEIGHT = 32;
const GROUP_HEIGHT = 40;
const HEADER_HEIGHT = 50;
const NAME_COL_WIDTH = 280;
const MS_PER_DAY = 86_400_000;

type Zoom = "day" | "week" | "month";
const PX_PER_DAY: Record<Zoom, number> = { day: 26, week: 14, month: 4 };

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

interface DragState {
  phaseId: string;
  storeId: string;
  mode: "move" | "resize-start" | "resize-end";
  originX: number;
  origStart: number;
  origEnd: number;
  deltaDays: number;
}

export default function MasterGanttView({
  stores,
  selectedPhaseId,
  onSelectPhase,
  onMutate,
  schedulesByStore,
  onRequestSchedule,
}: Props) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<Zoom>("week");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Compute global timeline range across ALL stores' phases.
  const { rangeStart, totalDays } = useMemo(() => {
    let minMs = Infinity, maxMs = -Infinity;
    for (const s of stores) {
      for (const p of s.phases) {
        const ps = p.plannedStart ? new Date(p.plannedStart).getTime() : null;
        const pe = p.plannedEnd ? new Date(p.plannedEnd).getTime() : null;
        if (ps && ps < minMs) minMs = ps;
        if (pe && pe > maxMs) maxMs = pe;
      }
    }
    if (!Number.isFinite(minMs)) minMs = Date.now();
    if (!Number.isFinite(maxMs)) maxMs = minMs + 90 * MS_PER_DAY;
    const start = startOfDay(new Date(minMs - 7 * MS_PER_DAY));
    const end   = startOfDay(new Date(maxMs + 14 * MS_PER_DAY));
    const days  = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
    return { rangeStart: start, totalDays: days };
  }, [stores]);

  const pxPerDay = PX_PER_DAY[zoom];
  const timelineWidth = totalDays * pxPerDay;

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

  const toggleStore = (storeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
        if (!schedulesByStore.has(storeId)) onRequestSchedule(storeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set(stores.map((s) => s.id));
    setExpanded(all);
    for (const s of stores) {
      if (!schedulesByStore.has(s.id)) onRequestSchedule(s.id);
    }
  };
  const collapseAll = () => setExpanded(new Set());

  // Build flat list of rows for layout: alternating store header + phase rows when expanded.
  type Row = { kind: "store"; store: PlanningStore } | { kind: "phase"; storeId: string; phaseIdx: number };
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const s of stores) {
      out.push({ kind: "store", store: s });
      if (expanded.has(s.id)) {
        for (let i = 0; i < s.phases.length; i++) out.push({ kind: "phase", storeId: s.id, phaseIdx: i });
      }
    }
    return out;
  }, [stores, expanded]);

  // ── Drag handling (PATCH /api/phases/:id) ─────────────────────────────────
  const onPointerDown = (storeId: string, phaseId: string, mode: DragState["mode"]) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const store = stores.find((s) => s.id === storeId);
    const phase = store?.phases.find((p) => p.id === phaseId);
    if (!phase || !phase.plannedStart || !phase.plannedEnd) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({
      phaseId,
      storeId,
      mode,
      originX: e.clientX,
      origStart: new Date(phase.plannedStart).getTime(),
      origEnd:   new Date(phase.plannedEnd).getTime(),
      deltaDays: 0,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dxPx = e.clientX - drag.originX;
    const days = Math.round(dxPx / pxPerDay);
    if (days !== drag.deltaDays) setDrag({ ...drag, deltaDays: days });
  };

  const onPointerUp = async () => {
    if (!drag) return;
    const { phaseId, mode, origStart, origEnd, deltaDays } = drag;
    setDrag(null);
    if (deltaDays === 0) return;
    let newStart = origStart, newEnd = origEnd;
    if (mode === "move")        { newStart += deltaDays * MS_PER_DAY; newEnd += deltaDays * MS_PER_DAY; }
    if (mode === "resize-start"){ newStart += deltaDays * MS_PER_DAY; if (newStart >= newEnd - MS_PER_DAY) return; }
    if (mode === "resize-end")  { newEnd   += deltaDays * MS_PER_DAY; if (newEnd <= newStart + MS_PER_DAY) return; }
    try {
      const res = await fetch(`/api/phases/${phaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannedStart: new Date(newStart).toISOString(),
          plannedEnd:   new Date(newEnd).toISOString(),
        }),
      });
      if (res.ok) onMutate();
    } catch {}
  };

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border)", gap: 12, flexWrap: "wrap" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={expandAll} style={btnStyle}>▼ Expand all</button>
          <button onClick={collapseAll} style={btnStyle}>▶ Collapse all</button>
        </div>

        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {stores.length} tiendas · {expanded.size} expanded
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: 2, marginRight: 4 }} /> Normal</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ef4444", borderRadius: 2, marginRight: 4 }} /> {t.planning.criticalPath}</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 4 }} /> {t.status.completed}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", maxHeight: 720 }}>
        <div style={{ width: NAME_COL_WIDTH, borderRight: "1px solid var(--border)", background: "var(--bg-card)", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ height: HEADER_HEIGHT, borderBottom: "1px solid var(--border)", padding: "0 12px", display: "flex", alignItems: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Tienda · Fase
          </div>
          {rows.map((row, idx) => {
            if (row.kind === "store") {
              const s = row.store;
              const isOpen = expanded.has(s.id);
              const done = s.phases.filter((p) => p.status === "COMPLETED").length;
              return (
                <div
                  key={`store-${s.id}`}
                  onClick={() => toggleStore(s.id)}
                  style={{
                    height: GROUP_HEIGHT,
                    borderBottom: "1px solid var(--border)",
                    padding: "0 12px",
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13,
                    cursor: "pointer",
                    background: "rgba(99,102,241,0.04)",
                    fontWeight: 700,
                  }}
                >
                  <span style={{ fontSize: 10, color: "var(--text-muted)", width: 10 }}>{isOpen ? "▼" : "▶"}</span>
                  <span style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 11, marginRight: 6 }}>{s.code}</span>
                    {s.name}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{done}/{s.phases.length}</span>
                </div>
              );
            }
            const store = stores.find((s) => s.id === row.storeId);
            const phase = store?.phases[row.phaseIdx];
            if (!phase) return null;
            const schedule = schedulesByStore.get(row.storeId);
            const criticalSet = new Set(schedule?.criticalPath ?? []);
            const isCritical = criticalSet.has(phase.id);
            const isSelected = selectedPhaseId === phase.id;
            return (
              <div
                key={phase.id}
                onClick={() => onSelectPhase(phase.id, row.storeId)}
                style={{
                  height: ROW_HEIGHT,
                  borderBottom: "1px solid rgba(15,23,42,0.05)",
                  padding: "0 12px 0 30px",
                  display: "flex", alignItems: "center", fontSize: 12,
                  cursor: "pointer",
                  background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                  borderLeft: isCritical ? "3px solid #ef4444" : "3px solid transparent",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                <span style={{ color: "var(--text-muted)", marginRight: 6, fontFamily: "monospace", fontSize: 10 }}>{phase.phaseNumber}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: isSelected ? 600 : 400 }}>{phase.name}</span>
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
              <div style={{ position: "absolute", left: todayOffset, top: HEADER_HEIGHT, bottom: 0, width: 1, background: "#ef4444", zIndex: 1 }}>
                <div style={{ position: "absolute", top: -16, left: -18, fontSize: 9, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "2px 5px", borderRadius: 3 }}>HOY</div>
              </div>
            )}

            {/* Rows: store headers + phase bars */}
            {(() => {
              let yCursor = HEADER_HEIGHT;
              const elements: React.ReactNode[] = [];
              for (const row of rows) {
                if (row.kind === "store") {
                  const s = row.store;
                  // Store summary band: span min->max of its phases
                  let smin = Infinity, smax = -Infinity;
                  for (const p of s.phases) {
                    const ps = p.plannedStart ? new Date(p.plannedStart).getTime() : null;
                    const pe = p.plannedEnd ? new Date(p.plannedEnd).getTime() : null;
                    if (ps && ps < smin) smin = ps;
                    if (pe && pe > smax) smax = pe;
                  }
                  if (Number.isFinite(smin) && Number.isFinite(smax)) {
                    const left = dayOffset(new Date(smin));
                    const right = dayOffset(new Date(smax));
                    if (left !== null && right !== null) {
                      elements.push(
                        <div
                          key={`store-band-${s.id}`}
                          style={{
                            position: "absolute",
                            left, width: Math.max(2, right - left),
                            top: yCursor + (GROUP_HEIGHT - 8) / 2,
                            height: 8,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            borderRadius: 2,
                            opacity: 0.55,
                            pointerEvents: "none",
                          }}
                          title={`${s.code} · ${new Date(smin).toISOString().slice(0,10)} → ${new Date(smax).toISOString().slice(0,10)}`}
                        />
                      );
                    }
                  }
                  yCursor += GROUP_HEIGHT;
                } else {
                  const store = stores.find((s) => s.id === row.storeId);
                  const phase = store?.phases[row.phaseIdx];
                  if (!phase) { yCursor += ROW_HEIGHT; continue; }
                  const schedule = schedulesByStore.get(row.storeId);
                  const criticalSet = new Set(schedule?.criticalPath ?? []);
                  const isCritical = criticalSet.has(phase.id);
                  const isSelected = selectedPhaseId === phase.id;
                  const isCompleted = phase.status === "COMPLETED";
                  const x = dayOffset(phase.plannedStart);
                  const e = dayOffset(phase.plannedEnd);
                  if (x === null || e === null) { yCursor += ROW_HEIGHT; continue; }
                  const isDragging = drag?.phaseId === phase.id;
                  const dx = isDragging && drag.mode === "move" ? drag.deltaDays * pxPerDay : 0;
                  const dxs = isDragging && drag.mode === "resize-start" ? drag.deltaDays * pxPerDay : 0;
                  const dxe = isDragging && drag.mode === "resize-end" ? drag.deltaDays * pxPerDay : 0;
                  const left = x + dx + dxs;
                  const right = e + dx + dxe;
                  const w = Math.max(2, right - left);
                  const top = yCursor + 5;
                  const barColor = isCompleted ? "#10b981" : isCritical ? "#ef4444" : phase.status === "BLOCKED" ? "#f59e0b" : "#3b82f6";
                  elements.push(
                    <div key={phase.id}>
                      <div
                        onClick={() => onSelectPhase(phase.id, row.storeId)}
                        onPointerDown={onPointerDown(row.storeId, phase.id, "move")}
                        title={`${phase.name} · ${phase.plannedStart?.slice(0, 10)} → ${phase.plannedEnd?.slice(0, 10)}`}
                        style={{
                          position: "absolute",
                          left, top, width: w, height: ROW_HEIGHT - 10,
                          background: barColor, borderRadius: 4,
                          cursor: drag ? "grabbing" : "grab",
                          boxShadow: isSelected ? "0 0 0 2px rgba(59,130,246,0.4)" : "none",
                          display: "flex", alignItems: "center", padding: "0 6px",
                          overflow: "hidden", fontSize: 10, fontWeight: 600, color: "#fff",
                          whiteSpace: "nowrap", textOverflow: "ellipsis",
                          userSelect: "none", touchAction: "none",
                        }}
                      >
                        {phase.pct > 0 && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${phase.pct}%`, background: "rgba(0,0,0,0.18)" }} />}
                        <span style={{ position: "relative", zIndex: 1 }}>{w > 50 ? phase.name : ""}</span>
                        <div
                          onPointerDown={onPointerDown(row.storeId, phase.id, "resize-start")}
                          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, cursor: "ew-resize" }}
                          onClick={(ev) => ev.stopPropagation()}
                        />
                        <div
                          onPointerDown={onPointerDown(row.storeId, phase.id, "resize-end")}
                          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, cursor: "ew-resize" }}
                          onClick={(ev) => ev.stopPropagation()}
                        />
                      </div>
                      {isDragging && drag.deltaDays !== 0 && (
                        <div style={{
                          position: "absolute", left: left + w / 2 - 28, top: top - 22,
                          background: "#0f172a", color: "#fff", padding: "2px 6px", borderRadius: 3,
                          fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", zIndex: 10,
                        }}>
                          {drag.deltaDays > 0 ? `+${drag.deltaDays}d` : `${drag.deltaDays}d`}
                        </div>
                      )}
                    </div>
                  );
                  yCursor += ROW_HEIGHT;
                }
              }
              return elements;
            })()}

            {/* Spacer to ensure scrollable height */}
            <div style={{ height: HEADER_HEIGHT + rows.reduce((acc, r) => acc + (r.kind === "store" ? GROUP_HEIGHT : ROW_HEIGHT), 0) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 4,
  border: "1px solid var(--border)",
  background: "transparent",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-secondary)",
  cursor: "pointer",
};
