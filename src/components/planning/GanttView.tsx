"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { PlanningStore, ScheduleResp } from "./types";

interface Props {
  store: PlanningStore;
  schedule: ScheduleResp | null;
  selectedPhaseId: string | null;
  onSelectPhase: (id: string | null) => void;
  onMutate: () => void;
}

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 50;
const NAME_COL_WIDTH = 240;
const MS_PER_DAY = 86_400_000;

type Zoom = "day" | "week" | "month";
const PX_PER_DAY: Record<Zoom, number> = { day: 26, week: 14, month: 4 };

interface Baseline {
  id: string;
  name: string;
  createdAt: string;
  snapshots: { phaseNumber: number; plannedStart: string | null; plannedEnd: string | null }[];
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

interface DragState {
  phaseId: string;
  mode: "move" | "resize-start" | "resize-end";
  originX: number;
  origStart: number;
  origEnd: number;
  deltaDays: number;
}

export default function GanttView({ store, schedule, selectedPhaseId, onSelectPhase, onMutate }: Props) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<Zoom>("week");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [activeBaselineId, setActiveBaselineId] = useState<string | null>(null);
  const [savingBaseline, setSavingBaseline] = useState(false);

  const phases = store.phases;
  const tasksById = new Map((schedule?.tasks ?? []).map((x) => [x.id, x]));
  const criticalSet = new Set(schedule?.criticalPath ?? []);

  // Fetch baselines once per store.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stores/${store.id}/baselines`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        if (cancelled) return;
        setBaselines(Array.isArray(d) ? d : []);
        if (Array.isArray(d) && d.length > 0) setActiveBaselineId(d[0].id);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [store.id]);

  const activeBaseline = baselines.find((b) => b.id === activeBaselineId) ?? null;
  const baselineByPhase = new Map<number, { start: Date | null; end: Date | null }>();
  if (activeBaseline) {
    for (const s of activeBaseline.snapshots) {
      baselineByPhase.set(s.phaseNumber, {
        start: s.plannedStart ? new Date(s.plannedStart) : null,
        end:   s.plannedEnd   ? new Date(s.plannedEnd)   : null,
      });
    }
  }

  const handleSaveBaseline = async () => {
    const name = window.prompt("Baseline name?", `Baseline ${new Date().toLocaleDateString()}`);
    if (!name) return;
    setSavingBaseline(true);
    try {
      const res = await fetch(`/api/stores/${store.id}/baselines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const fresh = await fetch(`/api/stores/${store.id}/baselines`);
        if (fresh.ok) {
          const list = await fresh.json();
          setBaselines(list);
          if (list[0]) setActiveBaselineId(list[0].id);
        }
      } else {
        alert((await res.json().catch(() => ({}))).error ?? "Save failed");
      }
    } finally { setSavingBaseline(false); }
  };

  const { rangeStart, totalDays } = useMemo(() => {
    let minMs = Infinity, maxMs = -Infinity;
    for (const p of phases) {
      const s = p.plannedStart ? new Date(p.plannedStart).getTime() : null;
      const e = p.plannedEnd   ? new Date(p.plannedEnd).getTime()   : null;
      if (s && s < minMs) minMs = s;
      if (e && e > maxMs) maxMs = e;
    }
    if (activeBaseline) {
      for (const s of activeBaseline.snapshots) {
        if (s.plannedStart) {
          const t = new Date(s.plannedStart).getTime();
          if (t < minMs) minMs = t;
        }
        if (s.plannedEnd) {
          const t = new Date(s.plannedEnd).getTime();
          if (t > maxMs) maxMs = t;
        }
      }
    }
    if (!Number.isFinite(minMs)) minMs = Date.now();
    if (!Number.isFinite(maxMs)) maxMs = minMs + 90 * MS_PER_DAY;
    const start = startOfDay(new Date(minMs - 7 * MS_PER_DAY));
    const end   = startOfDay(new Date(maxMs + 14 * MS_PER_DAY));
    const days  = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
    return { rangeStart: start, rangeEnd: end, totalDays: days };
  }, [phases, activeBaseline]);

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

  // ── Drag handling ─────────────────────────────────────────────────────────
  const onPointerDown = (phaseId: string, mode: DragState["mode"]) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase || !phase.plannedStart || !phase.plannedEnd) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({
      phaseId,
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

        {/* Baseline picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Baseline:</span>
          <select
            className="input"
            style={{ padding: "4px 8px", fontSize: 12 }}
            value={activeBaselineId ?? ""}
            onChange={(e) => setActiveBaselineId(e.target.value || null)}
          >
            <option value="">— off —</option>
            {baselines.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            onClick={handleSaveBaseline}
            disabled={savingBaseline}
            style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}
          >
            {savingBaseline ? "..." : "+ Save"}
          </button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: 2, marginRight: 4 }} /> Normal</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ef4444", borderRadius: 2, marginRight: 4 }} /> {t.planning.criticalPath}</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 4 }} /> {t.status.completed}</span>
          {activeBaseline && (
            <span><span style={{ display: "inline-block", width: 10, height: 4, background: "#94a3b8", marginRight: 4, marginBottom: 1 }} /> Baseline</span>
          )}
        </div>
      </div>

      {/* Body — split: name col (sticky) + timeline (scrollable) */}
      <div style={{ display: "flex", maxHeight: 600 }}>
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
                  display: "flex", alignItems: "center", fontSize: 13,
                  cursor: "pointer",
                  background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                  borderLeft: isCritical ? "3px solid #ef4444" : "3px solid transparent",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
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
              <div style={{ position: "absolute", left: todayOffset, top: HEADER_HEIGHT, bottom: 0, width: 1, background: "#ef4444", zIndex: 1 }}>
                <div style={{ position: "absolute", top: -16, left: -18, fontSize: 9, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "2px 5px", borderRadius: 3 }}>HOY</div>
              </div>
            )}

            {/* Phase rows */}
            {phases.map((p, idx) => {
              const x = dayOffset(p.plannedStart);
              const e = dayOffset(p.plannedEnd);
              if (x === null || e === null) return null;
              const isDragging = drag?.phaseId === p.id;
              const dx = isDragging && drag.mode === "move" ? drag.deltaDays * pxPerDay : 0;
              const dxs = isDragging && drag.mode === "resize-start" ? drag.deltaDays * pxPerDay : 0;
              const dxe = isDragging && drag.mode === "resize-end" ? drag.deltaDays * pxPerDay : 0;
              const left = x + dx + dxs;
              const right = e + dx + dxe;
              const w = Math.max(2, right - left);
              const isCritical = criticalSet.has(p.id);
              const isSelected = selectedPhaseId === p.id;
              const isCompleted = p.status === "COMPLETED";
              const top = HEADER_HEIGHT + idx * ROW_HEIGHT + 5;
              const barColor = isCompleted ? "#10b981" : isCritical ? "#ef4444" : p.status === "BLOCKED" ? "#f59e0b" : "#3b82f6";

              const bl = baselineByPhase.get(p.phaseNumber);
              const blStart = bl?.start ? dayOffset(bl.start) : null;
              const blEnd   = bl?.end   ? dayOffset(bl.end)   : null;

              return (
                <div key={p.id}>
                  {/* Baseline ghost */}
                  {activeBaseline && blStart !== null && blEnd !== null && (
                    <div
                      style={{
                        position: "absolute",
                        left: blStart,
                        width: Math.max(2, blEnd - blStart),
                        top: top + (ROW_HEIGHT - 10) - 2,
                        height: 4,
                        background: "#94a3b8",
                        borderRadius: 1,
                        opacity: 0.7,
                        pointerEvents: "none",
                      }}
                      title={`Baseline: ${bl?.start?.toISOString().slice(0,10)} → ${bl?.end?.toISOString().slice(0,10)}`}
                    />
                  )}
                  {/* Live bar */}
                  <div
                    onClick={() => onSelectPhase(p.id)}
                    onPointerDown={onPointerDown(p.id, "move")}
                    title={`${p.name} · ${p.plannedStart?.slice(0, 10)} → ${p.plannedEnd?.slice(0, 10)}`}
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
                    {p.pct > 0 && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${p.pct}%`, background: "rgba(0,0,0,0.18)" }} />}
                    <span style={{ position: "relative", zIndex: 1 }}>{w > 50 ? p.name : ""}</span>

                    {/* Resize handles */}
                    <div
                      onPointerDown={onPointerDown(p.id, "resize-start")}
                      style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, cursor: "ew-resize", background: "rgba(255,255,255,0.0)" }}
                      onClick={(ev) => ev.stopPropagation()}
                    />
                    <div
                      onPointerDown={onPointerDown(p.id, "resize-end")}
                      style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, cursor: "ew-resize", background: "rgba(255,255,255,0.0)" }}
                      onClick={(ev) => ev.stopPropagation()}
                    />
                  </div>
                  {/* Drag tooltip */}
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
            })}

            <div style={{ height: HEADER_HEIGHT + phases.length * ROW_HEIGHT }} />
          </div>
        </div>
      </div>
    </div>
  );
}
