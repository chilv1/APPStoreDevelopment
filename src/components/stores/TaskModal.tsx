"use client";

import { useState } from "react";
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, STATUS_COLORS, formatDate } from "@/lib/utils";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function TaskModal({ task, storeId, canEdit, onClose, onUpdated }: {
  task: any;
  storeId: string;
  canEdit: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [notes, setNotes] = useState(task.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, priority, notes }),
    });
    setLoading(false);
    onUpdated();
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", lineHeight: 1.3, flex: 1, paddingRight: 16 }}>
            {task.title}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>

        {task.description && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>{task.description}</p>
        )}

        {/* Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <InfoItem label="Người phụ trách" value={task.assignee?.name || "Chưa gán"} />
          <InfoItem label="Deadline" value={formatDate(task.dueDate)} />
          {task.completedAt && <InfoItem label="Hoàn thành lúc" value={formatDate(task.completedAt)} />}
        </div>

        {canEdit ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Trạng thái</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Độ ưu tiên</label>
                <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Ghi chú cập nhật</label>
              <textarea className="input" rows={3} placeholder="Nhập ghi chú, cập nhật tiến độ..." value={notes}
                onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
            </div>

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
                {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Đang lưu...</> : "💾 Lưu cập nhật"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className={`badge ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
            <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
            {task.notes && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>{task.notes}</p>}
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
      <div style={{ fontSize: 13, color: "#f0f4ff", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
