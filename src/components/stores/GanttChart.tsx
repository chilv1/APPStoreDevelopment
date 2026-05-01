"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PHASE_ICONS } from "@/lib/utils";

const PHASE_DURATIONS = [30, 14, 21, 14, 21, 60, 21, 21, 14, 14, 30];
const DAY_MS = 1000 * 60 * 60 * 24;
const CONTRACT_PHASE_NUMBER = 4;

type ZoomLevel = "WEEK" | "MONTH" | "QUARTER" | "ALL";

const ZOOM_DAYS: Record<ZoomLevel, number> = {
  WEEK: 28,
  MONTH: 90,
  QUARTER: 180,
  ALL: 0,
};

type DerivedStatus = "DONE" | "ON_TRACK" | "AT_RISK" | "OVERDUE" | "NOT_STARTED" | "BLOCKED";

const STATUS_THEME: Record<DerivedStatus, { color: string; label: string; emoji: string }> = {
  DONE:        { color: "#10b981", label: "Hoàn thành",     emoji: "✓" },
  ON_TRACK:    { color: "#3b82f6", label: "Đúng tiến độ",   emoji: "▶" },
  AT_RISK:     { color: "#f59e0b", label: "Sắp trễ",        emoji: "⚠" },
  OVERDUE:     { color: "#ef4444", label: "Đã trễ",         emoji: "⚠" },
  NOT_STARTED: { color: "#6b7280", label: "Chưa bắt đầu",   emoji: "○" },
  BLOCKED:     { color: "#a855f7", label: "Vướng mắc",      emoji: "✕" },
};

const PHASE_STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Chưa bắt đầu", color: "#6b7280" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", color: "#3b82f6" },
  { value: "COMPLETED",   label: "Hoàn thành",     color: "#10b981" },
  { value: "BLOCKED",     label: "Vướng mắc",      color: "#a855f7" },
];

function deriveStatus(phase: any, now: Date): DerivedStatus {
  if (phase.status === "BLOCKED") return "BLOCKED";
  if (phase.status === "COMPLETED") return "DONE";

  const plannedEnd = phase.plannedEnd ? new Date(phase.plannedEnd) : null;
  if (plannedEnd && plannedEnd.getTime() < now.getTime()) return "OVERDUE";

  if (plannedEnd) {
    const daysLeft = (plannedEnd.getTime() - now.getTime()) / DAY_MS;
    if (daysLeft <= 3 && phase.status === "IN_PROGRESS") return "AT_RISK";
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
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateShort(d: Date | string): string {
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ---- Phase Edit Modal ----
function PhaseEditModal({ phase, onClose, onSaved }: { phase: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    plannedStart: toDateInput(phase.plannedStart),
    plannedEnd:   toDateInput(phase.plannedEnd),
    actualStart:  toDateInput(phase.actualStart),
    actualEnd:    toDateInput(phase.actualEnd),
    status:       phase.status,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/phases/${phase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedStart: form.plannedStart || null,
        plannedEnd:   form.plannedEnd   || null,
        actualStart:  form.actualStart  || null,
        actualEnd:    form.actualEnd    || null,
        status:       form.status,
      }),
    });
    if (res.ok) {
      onSaved();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Lỗi cập nhật");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f0f4ff", margin: 0 }}>
            {PHASE_ICONS[phase.phaseNumber]} GĐ {phase.phaseNumber}: {phase.name}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Trạng thái</label>
          <div style={{ display: "flex", gap: 6 }}>
            {PHASE_STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setForm({ ...form, status: s.value })} style={{
                flex: 1, padding: "7px 4px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1.5px solid ${form.status === s.value ? s.color : "var(--border)"}`,
                background: form.status === s.value ? `${s.color}22` : "transparent",
                color: form.status === s.value ? s.color : "var(--text-secondary)",
                cursor: "pointer",
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>📅 Kế hoạch bắt đầu</label>
            <input type="date" className="input" value={form.plannedStart}
              onChange={(e) => setForm({ ...form, plannedStart: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>📅 Kế hoạch kết thúc</label>
            <input type="date" className="input" value={form.plannedEnd}
              onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>✅ Thực tế bắt đầu</label>
            <input type="date" className="input" value={form.actualStart}
              onChange={(e) => setForm({ ...form, actualStart: e.target.value })} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>✅ Thực tế kết thúc</label>
            <input type="date" className="input" value={form.actualEnd}
              onChange={(e) => setForm({ ...form, actualEnd: e.target.value })} />
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "8px 12px", color: "#fca5a5", fontSize: 12, marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 8,
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
          }}>Hủy</button>
          <button onClick={handleSave} disabled={loading} className="gradient-btn" style={{
            flex: 2, padding: "10px", borderRadius: 8, border: "none",
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Đang lưu...</> : "✓ Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Status Quick-Toggle Dropdown ----
function StatusBadgeDropdown({ phase, theme, onChange }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        fontSize: 10, fontWeight: 600,
        background: `${theme.color}1a`,
        color: theme.color,
        border: `1px solid ${theme.color}40`,
        borderRadius: 99, padding: "3px 9px",
        whiteSpace: "nowrap", cursor: "pointer",
      }}>
        {theme.emoji} {theme.label} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 4,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 4, zIndex: 30, minWidth: 140,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {PHASE_STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => { onChange(s.value); setOpen(false); }} style={{
              display: "block", width: "100%", padding: "6px 10px",
              background: phase.status === s.value ? `${s.color}22` : "transparent",
              color: phase.status === s.value ? s.color : "#f0f4ff",
              border: "none", borderRadius: 6, textAlign: "left",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>{s.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Custom Hover Tooltip ----
function Tooltip({ phase, x, y, now }: { phase: any; x: number; y: number; now: Date }) {
  if (!phase) return null;
  const status = deriveStatus(phase, now);
  const theme = STATUS_THEME[status];
  const progress = getProgress(phase);
  const tasks = phase.tasks || [];
  const doneTasks = tasks.filter((t: any) => t.status === "DONE").length;

  // Variance calculation
  const plannedEnd = new Date(phase.plannedEnd);
  const actualEnd = phase.actualEnd ? new Date(phase.actualEnd) : null;
  let varianceMsg = "";
  if (phase.status === "COMPLETED" && actualEnd) {
    const days = Math.round((actualEnd.getTime() - plannedEnd.getTime()) / DAY_MS);
    varianceMsg = days > 0 ? `Trễ ${days} ngày` : days < 0 ? `Sớm ${Math.abs(days)} ngày` : "Đúng kế hoạch";
  } else if (phase.status !== "COMPLETED") {
    const days = Math.round((plannedEnd.getTime() - now.getTime()) / DAY_MS);
    varianceMsg = days > 0 ? `Còn ${days} ngày` : days === 0 ? "Hết hạn hôm nay" : `Quá hạn ${Math.abs(days)} ngày`;
  }

  return (
    <div style={{
      position: "fixed", left: x + 12, top: y + 12, zIndex: 100,
      background: "rgba(15, 23, 42, 0.98)", border: `1px solid ${theme.color}`,
      borderRadius: 10, padding: "10px 14px", minWidth: 240, maxWidth: 320,
      pointerEvents: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      fontSize: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff" }}>
          {PHASE_ICONS[phase.phaseNumber]} GĐ {phase.phaseNumber}: {phase.name}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: `${theme.color}22`, color: theme.color, fontWeight: 600, border: `1px solid ${theme.color}55` }}>
          {theme.emoji} {theme.label}
        </span>
        {varianceMsg && (
          <span style={{ fontSize: 10, color: status === "OVERDUE" ? "#fca5a5" : status === "AT_RISK" ? "#fcd34d" : "var(--text-secondary)" }}>
            {varianceMsg}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", fontSize: 11, marginBottom: 8 }}>
        <span style={{ color: "var(--text-muted)" }}>Kế hoạch:</span>
        <span style={{ color: "#f0f4ff" }}>{fmtDateShort(phase.plannedStart)} → {fmtDateShort(phase.plannedEnd)}</span>
        {phase.actualStart && (
          <>
            <span style={{ color: "var(--text-muted)" }}>Thực tế:</span>
            <span style={{ color: theme.color }}>{fmtDateShort(phase.actualStart)} → {phase.actualEnd ? fmtDateShort(phase.actualEnd) : "Hôm nay"}</span>
          </>
        )}
        <span style={{ color: "var(--text-muted)" }}>Tasks:</span>
        <span style={{ color: "#f0f4ff" }}>{doneTasks}/{tasks.length || 0} hoàn thành</span>
      </div>

      {/* Progress bar */}
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: `${progress}%`, height: "100%", background: theme.color, transition: "width 0.2s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
        <span>Tiến độ</span><span>{progress}%</span>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-muted)", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6 }}>
        💡 Bấm vào thanh để chỉnh sửa
      </div>
    </div>
  );
}

// ============================================================================
// Main GanttChart Component
// ============================================================================
export default function GanttChart({ phases, targetDate, onUpdated }: { phases: any[]; targetDate?: string | null; onUpdated?: () => void }) {
  const [zoom, setZoom] = useState<ZoomLevel>("MONTH");
  const [viewOffsetDays, setViewOffsetDays] = useState(0); // shift view forward/back
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const [hoveredPhase, setHoveredPhase] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<{
    phaseId: string;
    type: "move" | "resize-start" | "resize-end";
    startX: number;
    originalStart: number;  // ms timestamp
    originalEnd: number;    // ms timestamp
    deltaDays: number;
    moved: boolean;
  } | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const barAreaWidthRef = useRef<number>(0);

  if (!phases.length) return null;

  const now = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

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

  // Full project span
  const fullStart = useMemo(() => {
    let min = Math.min(...phasesWithDates.map((p: any) => new Date(p.plannedStart).getTime()));
    if (target) min = Math.min(min, target.getTime());
    return new Date(min);
  }, [phasesWithDates, target]);

  const fullEnd = useMemo(() => {
    let max = Math.max(...phasesWithDates.map((p: any) => new Date(p.plannedEnd).getTime()));
    if (target) max = Math.max(max, target.getTime());
    return new Date(max);
  }, [phasesWithDates, target]);

  // Compute visible window based on zoom
  const { start, end } = useMemo(() => {
    if (zoom === "ALL") return { start: fullStart, end: fullEnd };
    const days = ZOOM_DAYS[zoom];
    const halfDays = Math.floor(days / 2);
    const center = new Date(now);
    center.setDate(center.getDate() + viewOffsetDays);
    const s = new Date(center); s.setDate(s.getDate() - halfDays);
    const e = new Date(center); e.setDate(e.getDate() + (days - halfDays));
    return { start: s, end: e };
  }, [zoom, viewOffsetDays, now, fullStart, fullEnd]);

  const totalDays = Math.max((end.getTime() - start.getTime()) / DAY_MS, 1);
  const pctFromDate = (date: string | Date): number =>
    ((new Date(date).getTime() - start.getTime()) / DAY_MS) / totalDays * 100;
  const widthFromRange = (s: string | Date, e: string | Date): number =>
    Math.max(((new Date(e).getTime() - new Date(s).getTime()) / DAY_MS) / totalDays * 100, 0.5);

  const todayPct = pctFromDate(now);
  const targetPct = target ? pctFromDate(target) : null;

  // Contract milestone (GĐ 4 plannedEnd)
  const contractPhase = phasesWithDates.find((p: any) => p.phaseNumber === CONTRACT_PHASE_NUMBER);
  const contractDate = contractPhase ? new Date(contractPhase.plannedEnd) : null;
  const contractPct = contractDate ? pctFromDate(contractDate) : null;

  // Generate month markers (only those visible)
  const monthMarkers = useMemo(() => {
    const out: { date: Date; label: string; pct: number }[] = [];
    const cursor = new Date(start);
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    const endTime = end.getTime();
    while (cursor.getTime() <= endTime + DAY_MS * 30) {
      const pct = pctFromDate(cursor);
      if (pct >= -5 && pct <= 105) {
        out.push({
          date: new Date(cursor),
          label: cursor.toLocaleDateString("vi-VN", { month: "short" }).replace("thg ", "Th "),
          pct,
        });
      }
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

  const LEFT_COL = 200;
  const RIGHT_COL = 130;
  const ROW_HEIGHT = 50;
  const BAR_AREA_HEIGHT = 32;

  // Drag handlers
  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (e: MouseEvent) => {
      const width = barAreaWidthRef.current;
      if (width <= 0) return;
      const dx = e.clientX - dragState.startX;
      const pxPerDay = width / totalDays;
      if (pxPerDay <= 0) return;
      const days = Math.round(dx / pxPerDay);
      setDragState((prev) => prev ? { ...prev, deltaDays: days, moved: prev.moved || Math.abs(dx) > 4 } : null);
    };

    const onMouseUp = async () => {
      const ds = dragState;
      // Treat as click if no movement
      if (!ds.moved || ds.deltaDays === 0) {
        const phase = phasesWithDates.find((p: any) => p.id === ds.phaseId);
        if (phase) setEditingPhase(phase);
        setDragState(null);
        return;
      }
      // Apply changes
      const deltaMs = ds.deltaDays * DAY_MS;
      const newStart = ds.type !== "resize-end"   ? new Date(ds.originalStart + deltaMs) : null;
      const newEnd   = ds.type !== "resize-start" ? new Date(ds.originalEnd + deltaMs) : null;

      // Validation: keep at least 1 day
      const finalStart = newStart || new Date(ds.originalStart);
      const finalEnd   = newEnd   || new Date(ds.originalEnd);
      if (finalEnd.getTime() - finalStart.getTime() < DAY_MS) {
        setDragState(null);
        return;
      }

      const body: any = {};
      if (newStart) body.plannedStart = newStart.toISOString();
      if (newEnd)   body.plannedEnd   = newEnd.toISOString();

      try {
        await fetch(`/api/phases/${ds.phaseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        onUpdated?.();
      } catch { /* ignore */ }
      setDragState(null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor =
      dragState.type === "move" ? "grabbing" : "ew-resize";
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragState, totalDays, phasesWithDates, onUpdated]);

  const startDrag = (e: React.MouseEvent, phase: any, type: "move" | "resize-start" | "resize-end") => {
    e.preventDefault();
    e.stopPropagation();
    // Capture bar area width from event target's parent
    const barAreaEl = (e.currentTarget as HTMLElement).closest("[data-bar-area]") as HTMLElement;
    if (barAreaEl) barAreaWidthRef.current = barAreaEl.getBoundingClientRect().width;
    setDragState({
      phaseId: phase.id,
      type,
      startX: e.clientX,
      originalStart: new Date(phase.plannedStart).getTime(),
      originalEnd:   new Date(phase.plannedEnd).getTime(),
      deltaDays: 0,
      moved: false,
    });
  };

  // Update phase status quickly
  const handleStatusChange = async (phaseId: string, newStatus: string) => {
    await fetch(`/api/phases/${phaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdated?.();
  };

  // Print/Export
  const handlePrint = () => window.print();

  const isClipped = (val: number) => val < 0 || val > 100;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", margin: 0 }}>
          📅 Gantt Chart — Tiến Độ 11 Giai Đoạn
        </h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {openingMsg && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: daysUntilOpening != null && daysUntilOpening < 0 ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)",
              border: `1px solid ${daysUntilOpening != null && daysUntilOpening < 0 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
              color: daysUntilOpening != null && daysUntilOpening < 0 ? "#fca5a5" : "#93c5fd",
              borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600,
            }}>
              🎯 <span>{openingMsg}</span>
            </div>
          )}
          <button onClick={handlePrint} className="no-print" title="In hoặc xuất PDF" style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", padding: "5px 12px", borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          }}>
            🖨️ In / Xuất PDF
          </button>
        </div>
      </div>

      {/* Zoom + Nav toolbar */}
      <div className="no-print" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
          {(["WEEK", "MONTH", "QUARTER", "ALL"] as ZoomLevel[]).map(z => (
            <button key={z} onClick={() => { setZoom(z); setViewOffsetDays(0); }} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: zoom === z ? "rgba(59,130,246,0.2)" : "transparent",
              color: zoom === z ? "#93c5fd" : "var(--text-secondary)",
              border: "none", cursor: "pointer",
            }}>
              {z === "WEEK" ? "Tuần" : z === "MONTH" ? "Tháng" : z === "QUARTER" ? "Quý" : "Tất cả"}
            </button>
          ))}
        </div>

        {zoom !== "ALL" && (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setViewOffsetDays(viewOffsetDays - Math.floor(ZOOM_DAYS[zoom] / 3))} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}>← Lùi</button>
            <button onClick={() => setViewOffsetDays(0)} disabled={viewOffsetDays === 0} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11,
              background: viewOffsetDays === 0 ? "rgba(255,255,255,0.02)" : "rgba(59,130,246,0.1)",
              border: `1px solid ${viewOffsetDays === 0 ? "var(--border)" : "rgba(59,130,246,0.3)"}`,
              color: viewOffsetDays === 0 ? "var(--text-muted)" : "#93c5fd",
              cursor: viewOffsetDays === 0 ? "default" : "pointer",
            }}>Hôm nay</button>
            <button onClick={() => setViewOffsetDays(viewOffsetDays + Math.floor(ZOOM_DAYS[zoom] / 3))} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}>Tới →</button>
          </div>
        )}

        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
          Hiển thị: <strong style={{ color: "#f0f4ff" }}>{fmtDate(start)}</strong> → <strong style={{ color: "#f0f4ff" }}>{fmtDate(end)}</strong>
        </div>
      </div>

      {phasesWithDates.some((p: any) => p._fallback) && (
        <div style={{ marginBottom: 10, fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "6px 10px", display: "inline-block" }}>
          ⚠️ Một số giai đoạn chưa có ngày kế hoạch — đang hiển thị ước tính
        </div>
      )}

      {/* Status legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12, fontSize: 11, color: "var(--text-secondary)" }}>
        {Object.entries(STATUS_THEME).filter(([k]) => k !== "BLOCKED").map(([key, theme]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: theme.color, display: "inline-block" }} />
            {theme.label}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 10 }}>
          <span style={{ display: "inline-block", color: "#10b981", fontSize: 14 }}>◆</span>
          Mốc quan trọng
        </div>
      </div>

      {/* Gantt body */}
      <div ref={ganttRef} style={{
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
            overflow: "hidden",
          }}>
            {monthMarkers.map((m, i) => !isClipped(m.pct) && (
              <div key={i} style={{
                position: "absolute", left: `${m.pct}%`, top: 0,
                fontSize: 11, color: "var(--text-secondary)", fontWeight: 600,
                paddingLeft: 6, borderLeft: "1px solid rgba(255,255,255,0.08)",
                height: "100%",
              }}>
                {m.label}
              </div>
            ))}
            {todayPct >= 0 && todayPct <= 100 && (
              <div style={{
                position: "absolute", left: `${todayPct}%`, top: -4,
                transform: "translateX(-50%)",
                background: "#ef4444", color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                whiteSpace: "nowrap", zIndex: 5,
              }}>
                Hôm nay · {fmtDateShort(now)}
              </div>
            )}
          </div>

          {/* Rows container */}
          <div style={{ position: "relative" }}>
            {/* Today vertical line */}
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
                top: 0, bottom: 0, width: 0,
                borderLeft: "2px dashed #10b981", opacity: 0.5,
                zIndex: 3, pointerEvents: "none",
              }} />
            )}

            {/* Contract milestone vertical line (GĐ4) */}
            {contractPct !== null && contractPct >= 0 && contractPct <= 100 && (
              <div style={{
                position: "absolute",
                left: `calc(${LEFT_COL}px + (100% - ${LEFT_COL + RIGHT_COL}px) * ${contractPct} / 100)`,
                top: 0, bottom: 0, width: 0,
                borderLeft: "1px dotted #8b5cf6", opacity: 0.4,
                zIndex: 3, pointerEvents: "none",
              }} />
            )}

            {phasesWithDates.map((phase: any) => {
              const status = deriveStatus(phase, now);
              const theme = STATUS_THEME[status];
              const progress = getProgress(phase);
              const plannedLeft = pctFromDate(phase.plannedStart);
              const plannedWidth = widthFromRange(phase.plannedStart, phase.plannedEnd);

              // Visible portion clipping
              const visLeft = Math.max(plannedLeft, 0);
              const visRight = Math.min(plannedLeft + plannedWidth, 100);
              const visWidth = Math.max(visRight - visLeft, 0);

              const showActualBar =
                phase.actualStart != null ||
                phase.status === "COMPLETED" ||
                phase.status === "IN_PROGRESS" ||
                progress > 0;

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
                  <div data-bar-area style={{ flex: 1, position: "relative", height: BAR_AREA_HEIGHT, minWidth: 0 }}>
                    {/* Background grid */}
                    {monthMarkers.map((m, i) => !isClipped(m.pct) && (
                      <div key={`grid-${i}`} style={{
                        position: "absolute", left: `${m.pct}%`, top: 0, bottom: 0,
                        width: 1, background: "rgba(255,255,255,0.04)", pointerEvents: "none",
                      }} />
                    ))}

                    {/* Out-of-view indicator (left/right) */}
                    {plannedLeft + plannedWidth < 0 && (
                      <div title={`Đã qua: ${fmtDateShort(phase.plannedStart)} → ${fmtDateShort(phase.plannedEnd)}`} style={{
                        position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)",
                        fontSize: 14, color: theme.color, opacity: 0.7,
                      }}>‹‹</div>
                    )}
                    {plannedLeft > 100 && (
                      <div title={`Sắp tới: ${fmtDateShort(phase.plannedStart)} → ${fmtDateShort(phase.plannedEnd)}`} style={{
                        position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                        fontSize: 14, color: theme.color, opacity: 0.7,
                      }}>››</div>
                    )}

                    {/* Bar (visible part only) */}
                    {visWidth > 0 && (() => {
                      // If currently being dragged, show preview position
                      const isDragging = dragState?.phaseId === phase.id;
                      const dragDeltaPct = isDragging ? (dragState!.deltaDays / totalDays) * 100 : 0;
                      const previewLeft = isDragging && dragState!.type !== "resize-end"
                        ? plannedLeft + dragDeltaPct : plannedLeft;
                      const previewRight = isDragging && dragState!.type !== "resize-start"
                        ? plannedLeft + plannedWidth + dragDeltaPct : plannedLeft + plannedWidth;
                      const previewVisLeft = Math.max(previewLeft, 0);
                      const previewVisRight = Math.min(previewRight, 100);
                      const previewVisWidth = Math.max(previewVisRight - previewVisLeft, 0);

                      const renderLeft = isDragging ? previewVisLeft : visLeft;
                      const renderWidth = isDragging ? previewVisWidth : visWidth;

                      // Show drag info badge
                      const dragInfo = isDragging && dragState!.moved && (
                        <div style={{
                          position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                          background: "#1e293b", color: "#f0f4ff", border: `1px solid ${theme.color}`,
                          borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                          whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        }}>
                          {dragState!.deltaDays > 0 ? `+${dragState!.deltaDays}d` : `${dragState!.deltaDays}d`} ·
                          {" "}{fmtDateShort(new Date(dragState!.type !== "resize-end" ? dragState!.originalStart + dragState!.deltaDays * DAY_MS : dragState!.originalStart))}
                          {" → "}
                          {fmtDateShort(new Date(dragState!.type !== "resize-start" ? dragState!.originalEnd + dragState!.deltaDays * DAY_MS : dragState!.originalEnd))}
                        </div>
                      );

                      return (
                        <div
                          onMouseDown={(e) => startDrag(e, phase, "move")}
                          onMouseEnter={(e) => { if (!dragState) { setHoveredPhase(phase); setTooltipPos({ x: e.clientX, y: e.clientY }); } }}
                          onMouseMove={(e) => { if (!dragState) setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                          onMouseLeave={() => setHoveredPhase(null)}
                          style={{
                            position: "absolute",
                            left: `${renderLeft}%`,
                            width: `${renderWidth}%`,
                            top: 6,
                            height: 20,
                            background: phase._fallback ? "rgba(255,255,255,0.04)" : `${theme.color}26`,
                            border: `1px ${phase._fallback ? "dashed" : "solid"} ${theme.color}`,
                            borderRadius: 4,
                            overflow: "hidden",
                            cursor: dragState?.phaseId === phase.id ? "grabbing" : "grab",
                            transition: isDragging ? "none" : "left 0.15s, width 0.15s, box-shadow 0.15s",
                            boxShadow: status === "OVERDUE" ? `0 0 16px ${theme.color}80, inset 0 0 8px ${theme.color}40`
                              : isDragging ? `0 0 12px ${theme.color}80` : undefined,
                            animation: status === "OVERDUE" && !isDragging ? "ganttPulse 2s ease-in-out infinite" : undefined,
                            zIndex: isDragging ? 8 : 2,
                          }}>
                          {dragInfo}

                          {/* Progress fill */}
                          {progress > 0 && !isDragging && (() => {
                            const totalBarPct = plannedWidth;
                            const visStartOffsetPct = visLeft - plannedLeft;
                            const fillEndPct = totalBarPct * progress / 100;
                            const fillVisStart = Math.max(0, visStartOffsetPct);
                            const fillVisEnd = Math.min(fillEndPct, totalBarPct - (totalBarPct - (visRight - plannedLeft)));
                            const fillWidthInVis = ((fillVisEnd - fillVisStart) / (visRight - visLeft)) * 100;
                            if (fillWidthInVis <= 0) return null;
                            return (
                              <div style={{
                                width: `${Math.max(0, Math.min(100, fillWidthInVis))}%`, height: "100%",
                                background: theme.color,
                                transition: "width 0.3s ease",
                                pointerEvents: "none",
                              }} />
                            );
                          })()}

                          {/* Resize handles - only show when not in fallback mode */}
                          {!phase._fallback && (
                            <>
                              <div
                                onMouseDown={(e) => startDrag(e, phase, "resize-start")}
                                style={{
                                  position: "absolute", left: 0, top: 0, bottom: 0, width: 5,
                                  cursor: "ew-resize", background: "transparent",
                                  borderLeft: "2px solid rgba(255,255,255,0.5)",
                                  zIndex: 4,
                                }}
                                title="Kéo để đổi ngày bắt đầu"
                              />
                              <div
                                onMouseDown={(e) => startDrag(e, phase, "resize-end")}
                                style={{
                                  position: "absolute", right: 0, top: 0, bottom: 0, width: 5,
                                  cursor: "ew-resize", background: "transparent",
                                  borderRight: "2px solid rgba(255,255,255,0.5)",
                                  zIndex: 4,
                                }}
                                title="Kéo để đổi ngày kết thúc"
                              />
                            </>
                          )}

                          {/* Bar label */}
                          <div style={{
                            position: "absolute", inset: 0,
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            paddingLeft: 8, paddingRight: 8,
                            fontSize: 10, color: "#fff", fontWeight: 600,
                            pointerEvents: "none", overflow: "hidden", whiteSpace: "nowrap",
                            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                          }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{phase.name}</span>
                            {progress > 0 && renderWidth > 5 && (
                              <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, opacity: 0.95, flexShrink: 0 }}>{progress}%</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right status badge with quick-toggle */}
                  <div style={{ width: RIGHT_COL, flexShrink: 0, paddingLeft: 12, display: "flex", justifyContent: "flex-end" }}>
                    <StatusBadgeDropdown phase={phase} theme={theme}
                      onChange={(newStatus: string) => handleStatusChange(phase.id, newStatus)} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Milestone diamonds at bottom strip */}
          <div style={{ marginTop: 8, marginLeft: LEFT_COL, marginRight: RIGHT_COL, height: 32, position: "relative" }}>
            {contractPct !== null && contractPct >= 0 && contractPct <= 100 && contractDate && (
              <div style={{
                position: "absolute", left: `${contractPct}%`,
                top: 0, transform: "translateX(-50%)", textAlign: "center",
              }}>
                <div style={{
                  width: 12, height: 12, background: "#8b5cf6",
                  transform: "rotate(45deg)", margin: "0 auto",
                  border: "2px solid rgba(139, 92, 246, 0.8)",
                  boxShadow: "0 2px 6px rgba(139,92,246,0.4)",
                }} />
                <div style={{ fontSize: 9, color: "#c4b5fd", fontWeight: 700, marginTop: 4, whiteSpace: "nowrap", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 4, padding: "2px 6px" }}>
                  ◆ Ký HĐ · {fmtDateShort(contractDate)}
                </div>
              </div>
            )}
            {targetPct !== null && targetPct >= 0 && targetPct <= 100 && target && (
              <div style={{
                position: "absolute", left: `${targetPct}%`,
                top: 0, transform: "translateX(-50%)", textAlign: "center",
              }}>
                <div style={{
                  width: 14, height: 14, background: "#10b981",
                  transform: "rotate(45deg)", margin: "0 auto",
                  border: "2px solid rgba(16, 185, 129, 0.8)",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.5)",
                }} />
                <div style={{ fontSize: 9, color: "#6ee7b7", fontWeight: 700, marginTop: 4, whiteSpace: "nowrap", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 4, padding: "2px 6px" }}>
                  ◆ Khai trương · {fmtDateShort(target)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom hover tooltip */}
      {hoveredPhase && (
        <Tooltip phase={hoveredPhase} x={tooltipPos.x} y={tooltipPos.y} now={now} />
      )}

      {/* Edit modal */}
      {editingPhase && (
        <PhaseEditModal phase={editingPhase} onClose={() => setEditingPhase(null)}
          onSaved={() => { setEditingPhase(null); onUpdated?.(); }} />
      )}

      {/* Print/animation styles */}
      <style jsx global>{`
        @keyframes ganttPulse {
          0%, 100% { box-shadow: 0 0 16px rgba(239,68,68,0.5), inset 0 0 8px rgba(239,68,68,0.25); }
          50%      { box-shadow: 0 0 24px rgba(239,68,68,0.85), inset 0 0 12px rgba(239,68,68,0.5); }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
