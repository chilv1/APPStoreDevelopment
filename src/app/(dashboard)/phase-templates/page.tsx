"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PHASE_ICONS } from "@/lib/utils";

type Template = {
  phaseNumber: number;
  name: string;
  description: string | null;
  durationDays: number;
  taskTitles: string[];
};

export default function PhaseTemplatesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/phase-templates").then(r => r.json()).then(d => {
      setTemplates(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const totalDays = useMemo(() => templates.reduce((s, t) => s + (Number(t.durationDays) || 0), 0), [templates]);

  if (user && user.role !== "ADMIN") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Chỉ Admin có quyền sửa cấu hình giai đoạn</p>
      </div>
    );
  }

  const update = (idx: number, patch: Partial<Template>) => {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t));
    setDirty(true);
  };

  const updateTaskTitle = (idx: number, taskIdx: number, value: string) => {
    setTemplates(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const next = [...t.taskTitles];
      next[taskIdx] = value;
      return { ...t, taskTitles: next };
    }));
    setDirty(true);
  };

  const addTask = (idx: number) => {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, taskTitles: [...t.taskTitles, ""] } : t));
    setDirty(true);
  };

  const removeTask = (idx: number, taskIdx: number) => {
    setTemplates(prev => prev.map((t, i) => i === idx
      ? { ...t, taskTitles: t.taskTitles.filter((_, j) => j !== taskIdx) }
      : t));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/phase-templates", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(templates),
    });
    if (res.ok) {
      setDirty(false);
      setSavedAt(new Date());
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Lỗi cập nhật");
    }
    setSaving(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto", paddingBottom: 100 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
          ⚙️ Cấu Hình Mẫu Giai Đoạn
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Sửa thời lượng + tên + danh sách task mặc định cho 11 giai đoạn. Áp dụng khi tạo cửa hàng MỚI (cửa hàng cũ không bị ảnh hưởng).
        </p>
      </div>

      {/* Summary */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20,
      }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6", lineHeight: 1 }}>{totalDays}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Tổng số ngày dự án (~{Math.round(totalDays / 30 * 10) / 10} tháng)</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981", lineHeight: 1 }}>{templates.length}/11</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Giai đoạn được cấu hình</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#8b5cf6", lineHeight: 1 }}>
            {templates.reduce((s, t) => s + t.taskTitles.length, 0)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Tổng task mặc định</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table className="data-table" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th style={{ width: 220 }}>Tên giai đoạn</th>
              <th style={{ width: 110 }}>Thời lượng (ngày)</th>
              <th>Mô tả</th>
              <th style={{ width: 120 }}>Tasks mặc định</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t, idx) => (
              <>
                <tr key={t.phaseNumber}>
                  <td style={{ verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{PHASE_ICONS[t.phaseNumber]}</span>
                      <strong style={{ color: "#f0f4ff" }}>GĐ {t.phaseNumber}</strong>
                    </div>
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <input className="input" value={t.name}
                      onChange={(e) => update(idx, { name: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: 13 }} />
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <input className="input" type="number" min={1} value={t.durationDays}
                      onChange={(e) => update(idx, { durationDays: Number(e.target.value) })}
                      style={{ padding: "6px 10px", fontSize: 13, textAlign: "center" }} />
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <input className="input" value={t.description || ""}
                      onChange={(e) => update(idx, { description: e.target.value })}
                      placeholder="Mô tả ngắn gọn về giai đoạn..."
                      style={{ padding: "6px 10px", fontSize: 13 }} />
                  </td>
                  <td style={{ verticalAlign: "top", textAlign: "center" }}>
                    <button onClick={() => setExpanded(expanded === t.phaseNumber ? null : t.phaseNumber)} style={{
                      padding: "5px 10px", borderRadius: 6,
                      background: expanded === t.phaseNumber ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${expanded === t.phaseNumber ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                      color: expanded === t.phaseNumber ? "#93c5fd" : "var(--text-secondary)",
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>
                      {t.taskTitles.length} tasks {expanded === t.phaseNumber ? "▴" : "▾"}
                    </button>
                  </td>
                </tr>
                {expanded === t.phaseNumber && (
                  <tr key={`${t.phaseNumber}-tasks`}>
                    <td colSpan={5} style={{ background: "rgba(59,130,246,0.04)", borderTop: "1px solid rgba(59,130,246,0.2)" }}>
                      <div style={{ padding: "10px 4px" }}>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>
                          📋 Tasks mặc định (sẽ được tạo khi mở cửa hàng mới)
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {t.taskTitles.map((title, taskIdx) => (
                            <div key={taskIdx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "var(--text-muted)", width: 24, textAlign: "center" }}>{taskIdx + 1}</span>
                              <input className="input" value={title}
                                onChange={(e) => updateTaskTitle(idx, taskIdx, e.target.value)}
                                style={{ padding: "5px 10px", fontSize: 12, flex: 1 }} />
                              <button onClick={() => removeTask(idx, taskIdx)} style={{
                                padding: "4px 8px", borderRadius: 4,
                                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                                color: "#fca5a5", fontSize: 11, cursor: "pointer",
                              }}>✕</button>
                            </div>
                          ))}
                          <button onClick={() => addTask(idx)} style={{
                            padding: "5px 10px", borderRadius: 6,
                            background: "rgba(255,255,255,0.03)", border: "1px dashed var(--border)",
                            color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                            marginTop: 4, alignSelf: "flex-start",
                          }}>+ Thêm task</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div style={{
          marginTop: 14, fontSize: 13, color: "#fca5a5",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 8, padding: "10px 14px",
        }}>⚠️ {error}</div>
      )}

      {/* Sticky save bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 280, right: 0,
        background: "rgba(15, 23, 42, 0.98)", borderTop: "1px solid var(--border)",
        padding: "12px 32px",
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12,
        backdropFilter: "blur(8px)", zIndex: 30,
      }}>
        {savedAt && !dirty && (
          <span style={{ fontSize: 12, color: "#6ee7b7" }}>
            ✓ Đã lưu lúc {savedAt.toLocaleTimeString("vi-VN")}
          </span>
        )}
        {dirty && (
          <span style={{ fontSize: 12, color: "#fcd34d" }}>● Có thay đổi chưa lưu</span>
        )}
        <button onClick={handleSave} disabled={!dirty || saving} className="gradient-btn" style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: !dirty || saving ? "not-allowed" : "pointer",
          opacity: !dirty || saving ? 0.5 : 1,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Đang lưu...</> : "✓ Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
