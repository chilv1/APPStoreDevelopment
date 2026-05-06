"use client";

import { useState } from "react";
import { PRIORITY_COLORS, STATUS_COLORS, formatDate, getStatusLabel, getPriorityLabel } from "@/lib/utils";
import { useT, useLocale } from "@/lib/i18n/context";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function toDateInput(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function TaskModal({ task, storeId, canEdit, onClose, onUpdated }: {
  task: any;
  storeId: string;
  canEdit: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const t = useT();
  const { locale, intlCode } = useLocale();
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [notes, setNotes] = useState(task.notes || "");
  const [dueDate, setDueDate] = useState<string>(toDateInput(task.dueDate));
  const [completedAt, setCompletedAt] = useState<string>(toDateInput(task.completedAt));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase context — read-only display so the user sees the planning frame.
  const phaseStart = task.phase?.plannedStart ?? null;
  const phaseEnd   = task.phase?.plannedEnd ?? null;

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // If transitioning to DONE without explicit completedAt, default to today.
      const effectiveCompletedAt =
        status === "DONE"
          ? (completedAt || new Date().toISOString().slice(0, 10))
          : null;
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          notes,
          dueDate: dueDate || null,
          completedAt: effectiveCompletedAt,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error ?? "Save failed");
      }
      onUpdated();
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, flex: 1, paddingRight: 16 }}>
            {task.title}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>

        {task.description && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>{task.description}</p>
        )}

        {/* Read-only context: assignee + phase planning frame */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18, padding: 12, background: "rgba(15,23,42,0.03)", borderRadius: 8 }}>
          <InfoItem label={t.modal.taskAssignee} value={task.assignee?.name || t.common.notAssigned} />
          {phaseStart && phaseEnd && (
            <InfoItem
              label="Fase (Planificación)"
              value={`${formatDate(phaseStart, intlCode)} → ${formatDate(phaseEnd, intlCode)}`}
            />
          )}
        </div>

        {canEdit ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.taskStatus}</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{getStatusLabel(s, locale)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.taskPriority}</label>
                <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{getPriorityLabel(p, locale)}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.taskDueDate}</label>
                <input
                  type="date"
                  className="input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Fecha completada {status !== "DONE" && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(solo si DONE)</span>}
                </label>
                <input
                  type="date"
                  className="input"
                  value={completedAt}
                  disabled={status !== "DONE"}
                  onChange={(e) => setCompletedAt(e.target.value)}
                  placeholder="(automática)"
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.taskNotes}</label>
              <textarea className="input" rows={3} placeholder={t.modal.taskNotesPh} value={notes}
                onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
            </div>

            {error && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.08)", color: "#dc2626", borderRadius: 6, fontSize: 12 }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "10px", borderRadius: 8,
                background: "rgba(15,23,42,0.05)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
              }}>{t.common.cancel}</button>
              <button onClick={handleSave} disabled={loading} className="gradient-btn" style={{
                flex: 2, padding: "10px", borderRadius: 8, border: "none",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{t.ganttModals.saving}</> : `💾 ${t.common.save}`}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`badge ${STATUS_COLORS[task.status]}`}>{getStatusLabel(task.status, locale)}</span>
            <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{getPriorityLabel(task.priority, locale)}</span>
            {task.dueDate && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.modal.taskDueDate}: {formatDate(task.dueDate, intlCode)}</span>}
            {task.completedAt && <span style={{ fontSize: 12, color: "#10b981" }}>✓ {formatDate(task.completedAt, intlCode)}</span>}
            {task.notes && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, width: "100%" }}>{task.notes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
