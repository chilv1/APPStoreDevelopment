"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n/types";

type TypeOpt = { value: string; labelKey: keyof Dict["modal"] };
type SeverityOpt = { value: string; labelKey: keyof Dict["priority"] };

const TYPES: TypeOpt[] = [
  { value: "ISSUE",   labelKey: "issueTypeIssue" },
  { value: "RISK",    labelKey: "issueTypeRisk" },
  { value: "BLOCKER", labelKey: "issueTypeBlocker" },
];
const SEVERITIES: SeverityOpt[] = [
  { value: "LOW",      labelKey: "low" },
  { value: "MEDIUM",   labelKey: "medium" },
  { value: "HIGH",     labelKey: "high" },
  { value: "CRITICAL", labelKey: "critical" },
];

export default function IssueModal({ storeId, onClose, onCreated }: {
  storeId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [form, setForm] = useState({ title: "", description: "", type: "ISSUE", severity: "MEDIUM" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/stores/${storeId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    onCreated();
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>{t.modal.issueRegisterTitle}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.issueTitleField}</label>
            <input className="input" required placeholder={t.modal.issueTitlePh}
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.issueType}</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((opt) => <option key={opt.value} value={opt.value}>{t.modal[opt.labelKey]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.issueSeverity}</label>
              <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{t.priority[s.labelKey]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.issueDescField}</label>
            <textarea className="input" rows={4} placeholder={t.modal.issueDescPh}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "10px", borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
            }}>{t.common.cancel}</button>
            <button type="submit" disabled={loading} className="gradient-btn" style={{
              flex: 2, padding: "10px", borderRadius: 8, border: "none",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{t.modal.issueSubmitting}</> : t.modal.issueSubmitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
