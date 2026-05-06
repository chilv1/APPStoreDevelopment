"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { PlanningStore, ScheduleResp } from "./types";

interface PlanningAssignee { id: string; name: string; role: string }

interface Props {
  stores: PlanningStore[];
  selectedPhaseId: string | null;
  onSelectPhase: (phaseId: string | null, storeId: string | null) => void;
  onMutate: () => void;
  schedulesByStore: Map<string, ScheduleResp>;
  onRequestSchedule: (storeId: string) => void;
  currentUserId: string | null;
}

const ROW_HEIGHT = 38;
const GROUP_HEIGHT = 44;
const HEADER_HEIGHT = 50;
const NAME_COL_WIDTH = 320;
const MS_PER_DAY = 86_400_000;

type Zoom = "day" | "week" | "month";
const PX_PER_DAY: Record<Zoom, number> = { day: 26, week: 14, month: 4 };

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${(hue + 30) % 360} 65% 45%))`;
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

// Avatar stack used inside AssigneePill on hover.
function AvatarStack({ users, onUserClick, activeUserId }: {
  users: PlanningAssignee[];
  onUserClick: (id: string) => void;
  activeUserId: string | null;
}) {
  const shown = users.slice(0, 3);
  const overflow = users.length - shown.length;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((u, i) => (
        <button
          key={u.id}
          onClick={(ev) => { ev.stopPropagation(); onUserClick(u.id); }}
          title={u.name}
          style={{
            width: 22, height: 22, borderRadius: "50%",
            background: hashColor(u.id), color: "#fff",
            fontSize: 9, fontWeight: 700, display: "flex",
            alignItems: "center", justifyContent: "center",
            marginLeft: i === 0 ? 0 : -6,
            border: `2px solid ${activeUserId === u.id ? "#0f172a" : "var(--bg-card, #fff)"}`,
            cursor: "pointer", padding: 0, lineHeight: 1,
            boxShadow: activeUserId === u.id ? "0 0 0 1px rgba(15,23,42,0.4)" : "none",
          }}
        >{initials(u.name)}</button>
      ))}
      {overflow > 0 && (
        <div
          title={users.slice(3).map((u) => u.name).join(", ")}
          style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "#94a3b8", color: "#fff",
            fontSize: 9, fontWeight: 700, display: "flex",
            alignItems: "center", justifyContent: "center",
            marginLeft: -6, border: "2px solid var(--bg-card, #fff)",
          }}
        >+{overflow}</div>
      )}
    </div>
  );
}

// Default = compact badge "👥 N", hover = expand to AvatarStack.
function AssigneePill({ users, onUserClick, activeUserId }: {
  users: PlanningAssignee[];
  onUserClick: (id: string) => void;
  activeUserId: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  if (users.length === 0) return null;
  const isActive = activeUserId !== null && users.some((u) => u.id === activeUserId);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(ev) => ev.stopPropagation()}
      style={{ display: "inline-flex", alignItems: "center", marginLeft: "auto", flexShrink: 0 }}
    >
      {hovered ? (
        <AvatarStack users={users} onUserClick={onUserClick} activeUserId={activeUserId} />
      ) : (
        <span
          title={users.map((u) => u.name).join(", ")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "2px 7px", borderRadius: 11, height: 22,
            background: isActive ? "rgba(15,23,42,0.12)" : "rgba(99,102,241,0.10)",
            color: isActive ? "#0f172a" : "#4f46e5",
            fontSize: 10, fontWeight: 700,
            border: isActive ? "1px solid rgba(15,23,42,0.3)" : "1px solid rgba(99,102,241,0.25)",
          }}
        >
          👥 {users.length}
        </span>
      )}
    </span>
  );
}

// Mini progress bar 3px tall under phase name.
function MiniProgressBar({ pct }: { pct: number }) {
  const fillColor = pct >= 100 ? "#10b981" : "#3b82f6";
  return (
    <div style={{ width: "100%", height: 3, background: "rgba(15,23,42,0.06)", borderRadius: 2, marginTop: 3 }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: fillColor, borderRadius: 2, transition: "width 0.15s ease" }} />
    </div>
  );
}

export default function MasterGanttView({
  stores,
  selectedPhaseId,
  onSelectPhase,
  onMutate,
  schedulesByStore,
  onRequestSchedule,
  currentUserId,
}: Props) {
  const t = useT();
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<Zoom>("week");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const effectiveFilterUserId = assigneeFilter === "me" ? currentUserId : assigneeFilter;

  // Unique users across all stores' phases for the filter select.
  const allAssignees = useMemo<PlanningAssignee[]>(() => {
    const seen = new Map<string, PlanningAssignee>();
    for (const s of stores) {
      for (const p of s.phases) {
        for (const u of p.assignees ?? []) {
          if (!seen.has(u.id)) seen.set(u.id, u);
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [stores]);

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
    if (!rightRef.current) return;
    const today = startOfDay(new Date());
    const offset = ((today.getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;
    rightRef.current.scrollLeft = Math.max(0, offset - 200);
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

  const handleAvatarClick = (uid: string) => {
    setAssigneeFilter((prev) => (prev === uid ? null : uid));
  };

  // Rows: store header + phase rows when expanded.
  type Row =
    | { kind: "store"; store: PlanningStore }
    | { kind: "phase"; storeId: string; phaseIdx: number };
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

  const phaseMatchesFilter = (assignees: PlanningAssignee[]): boolean => {
    if (!effectiveFilterUserId) return true;
    return assignees.some((u) => u.id === effectiveFilterUserId);
  };

  // ── Vertical scroll sync between cols ────────────────────────────────────
  const onLeftScroll = () => {
    const a = leftRef.current; const b = rightRef.current;
    if (!a || !b) return;
    if (b.scrollTop !== a.scrollTop) b.scrollTop = a.scrollTop;
  };
  const onRightScroll = () => {
    const a = leftRef.current; const b = rightRef.current;
    if (!a || !b) return;
    if (a.scrollTop !== b.scrollTop) a.scrollTop = b.scrollTop;
  };

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

        {/* Assignee filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>👥</span>
          <select
            className="input"
            style={{ padding: "4px 8px", fontSize: 11, minWidth: 140 }}
            value={assigneeFilter ?? ""}
            onChange={(e) => setAssigneeFilter(e.target.value || null)}
          >
            <option value="">— Todos —</option>
            {currentUserId && <option value="me">Solo yo</option>}
            {allAssignees.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
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

      {/* Body — two cols, each with its own vertical scroll, synced via onScroll */}
      <div style={{ display: "flex", maxHeight: 720 }}>
        {/* Left col: name list with own vertical scroll */}
        <div
          ref={leftRef}
          onScroll={onLeftScroll}
          style={{
            width: NAME_COL_WIDTH,
            borderRight: "1px solid var(--border)",
            background: "var(--bg-card)",
            flexShrink: 0,
            overflowX: "hidden",
            overflowY: "auto",
            // Hide native scrollbar on left so only right col shows the scroll handle
            scrollbarWidth: "none" as any,
          }}
        >
          {/* Sticky col header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 3,
            height: HEADER_HEIGHT, borderBottom: "1px solid var(--border)",
            padding: "0 12px", display: "flex", alignItems: "center",
            fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            background: "var(--bg-card)",
          }}>
            Tienda · Fase
          </div>
          {rows.map((row) => {
            if (row.kind === "store") {
              const s = row.store;
              const isOpen = expanded.has(s.id);
              const done = s.phases.filter((p) => p.status === "COMPLETED").length;
              const storePct = s.phases.length > 0 ? Math.round((done / s.phases.length) * 100) : 0;
              return (
                <div key={`store-${s.id}`} style={{ borderBottom: "1px solid var(--border)" }}>
                  <div
                    onClick={() => toggleStore(s.id)}
                    style={{
                      height: GROUP_HEIGHT,
                      padding: "0 12px",
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 13, cursor: "pointer",
                      background: "rgba(99,102,241,0.04)",
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ fontSize: 10, color: "var(--text-muted)", width: 10 }}>{isOpen ? "▼" : "▶"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: "var(--text-primary)" }}>
                          <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 11, marginRight: 6 }}>{s.code}</span>
                          {s.name}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{done}/{s.phases.length}</span>
                      </div>
                      <MiniProgressBar pct={storePct} />
                    </div>
                  </div>
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
            const matches = phaseMatchesFilter(phase.assignees ?? []);
            return (
              <div
                key={phase.id}
                onClick={() => onSelectPhase(phase.id, row.storeId)}
                style={{
                  height: ROW_HEIGHT,
                  borderBottom: "1px solid rgba(15,23,42,0.05)",
                  padding: "0 12px 0 30px",
                  display: "flex", alignItems: "center",
                  fontSize: 12, cursor: "pointer",
                  background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                  borderLeft: isCritical ? "3px solid #ef4444" : "3px solid transparent",
                  opacity: matches ? 1 : 0.25,
                  transition: "opacity 0.15s ease",
                }}
              >
                <span style={{ color: "var(--text-muted)", marginRight: 6, fontFamily: "monospace", fontSize: 10, flexShrink: 0 }}>{phase.phaseNumber}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: isSelected ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{phase.name}</span>
                    <AssigneePill users={phase.assignees ?? []} onUserClick={handleAvatarClick} activeUserId={effectiveFilterUserId} />
                  </div>
                  <MiniProgressBar pct={phase.pct} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right col: timeline with own vertical scroll, synced */}
        <div
          ref={rightRef}
          onScroll={onRightScroll}
          style={{ flex: 1, overflow: "auto" }}
        >
          <div style={{ width: timelineWidth, position: "relative" }}>
            {/* Sticky timeline header */}
            <div style={{
              height: HEADER_HEIGHT, position: "sticky", top: 0,
              background: "var(--bg-card)", borderBottom: "1px solid var(--border)", zIndex: 2,
            }}>
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

            {/* Rows: store summary band + phase bars */}
            {(() => {
              let yCursor = HEADER_HEIGHT;
              const elements: React.ReactNode[] = [];
              for (const row of rows) {
                if (row.kind === "store") {
                  const s = row.store;
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
                  const matches = phaseMatchesFilter(phase.assignees ?? []);
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
                    <div key={phase.id} style={{ opacity: matches ? 1 : 0.25, transition: "opacity 0.15s ease" }}>
                      <div
                        onClick={() => onSelectPhase(phase.id, row.storeId)}
                        onPointerDown={onPointerDown(row.storeId, phase.id, "move")}
                        title={`${phase.name} · ${phase.plannedStart?.slice(0, 10)} → ${phase.plannedEnd?.slice(0, 10)}`}
                        style={{
                          position: "absolute",
                          left, top, width: w, height: ROW_HEIGHT - 12,
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

            {/* Spacer to ensure scrollable height equals the rows total */}
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
