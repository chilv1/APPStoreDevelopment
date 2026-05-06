"use client";

import { useEffect, useState } from "react";

interface Schedule {
  id: string;
  name: string;
  reportKind: "WEEKLY_SUMMARY" | "COST_VARIANCE" | "RISK_DIGEST";
  cron: string;
  recipients: string;
  enabled: boolean;
  lastRunAt: string | null;
  storeId: string | null;
  store: { id: string; code: string; name: string } | null;
  creator: { id: string; name: string } | null;
}

interface Props { onClose: () => void }

const KIND_OPTIONS: { v: Schedule["reportKind"]; label: string }[] = [
  { v: "WEEKLY_SUMMARY", label: "Weekly summary" },
  { v: "COST_VARIANCE",  label: "Cost variance" },
  { v: "RISK_DIGEST",    label: "Risk digest" },
];

export default function ReportSchedulesPanel({ onClose }: Props) {
  const [list, setList] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", reportKind: "WEEKLY_SUMMARY" as Schedule["reportKind"], cron: "0 9 * * 1", recipients: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await fetch("/api/report-schedules"); if (r.ok) setList(await r.json()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim() || !form.cron.trim()) return;
    setAdding(true); setError(null);
    try {
      const r = await fetch("/api/report-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          reportKind: form.reportKind,
          cron: form.cron.trim(),
          recipients: form.recipients.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error ?? "Save failed");
      }
      setForm({ name: "", reportKind: "WEEKLY_SUMMARY", cron: "0 9 * * 1", recipients: "" });
      await load();
    } catch (e: any) { setError(String(e.message ?? e)); }
    finally { setAdding(false); }
  };

  const toggle = async (s: Schedule) => {
    await fetch(`/api/report-schedules/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !s.enabled }) });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this schedule?")) return;
    await fetch(`/api/report-schedules/${id}`, { method: "DELETE" });
    load();
  };

  const [preview, setPreview] = useState<{ subject: string; bodyMarkdown: string; recipients: string[] } | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const runPreview = async (id: string) => {
    setPreviewing(id);
    try {
      const r = await fetch(`/api/report-schedules/${id}/run`, { method: "POST" });
      if (r.ok) setPreview(await r.json());
      load();
    } finally { setPreviewing(null); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.25)", zIndex: 49, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 560, background: "#fff", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 32px rgba(15,23,42,0.12)", zIndex: 50, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reports</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>📧 Scheduled digests</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, color: "var(--text-muted)", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Add form */}
          <div className="task-item" style={{ flexDirection: "column", padding: 12, gap: 8, alignItems: "stretch" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>+ New schedule</div>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Schedule name (e.g. Weekly portfolio summary)" style={{ fontSize: 13 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <select className="input" value={form.reportKind} onChange={(e) => setForm({ ...form, reportKind: e.target.value as Schedule["reportKind"] })} style={{ flex: 1, fontSize: 13 }}>
                {KIND_OPTIONS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
              </select>
              <input className="input" value={form.cron} onChange={(e) => setForm({ ...form, cron: e.target.value })} placeholder="cron e.g. 0 9 * * 1" style={{ flex: 1, fontSize: 13, fontFamily: "monospace" }} />
            </div>
            <input className="input" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder="emails, comma-separated" style={{ fontSize: 13 }} />
            {error && <div style={{ fontSize: 12, color: "#dc2626" }}>⚠ {error}</div>}
            <button onClick={create} disabled={adding || !form.name.trim()} className="gradient-btn" style={{ padding: "8px 12px", borderRadius: 6, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: adding ? "not-allowed" : "pointer" }}>
              {adding ? "..." : "+ Add schedule"}
            </button>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              Note: cron runner + email transport land in P4. For now this stores the configuration.
            </div>
          </div>

          {loading && <div style={{ color: "var(--text-secondary)" }}>Loading…</div>}
          {!loading && list.length === 0 && <div style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 13 }}>No schedules yet.</div>}
          {preview && (
            <div className="task-item" style={{ flexDirection: "column", padding: 12, gap: 8, alignItems: "stretch", borderLeft: "3px solid #3b82f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong style={{ fontSize: 12, flex: 1 }}>📨 Preview · {preview.subject}</strong>
                <button onClick={() => setPreview(null)} style={{ background: "transparent", border: "none", fontSize: 16, color: "var(--text-muted)", cursor: "pointer" }}>×</button>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>To: {preview.recipients.length === 0 ? "(no recipients configured)" : preview.recipients.join(", ")}</div>
              <pre style={{ background: "rgba(15,23,42,0.04)", padding: 10, borderRadius: 6, fontSize: 11, lineHeight: 1.5, overflow: "auto", maxHeight: 240, whiteSpace: "pre-wrap" }}>{preview.bodyMarkdown}</pre>
            </div>
          )}
          {list.map((s) => {
            let recipients: string[] = [];
            try { recipients = JSON.parse(s.recipients) as string[]; } catch {}
            const kindMeta = KIND_OPTIONS.find((k) => k.v === s.reportKind);
            return (
              <div key={s.id} className="task-item" style={{ padding: 12, flexDirection: "column", alignItems: "stretch", gap: 6, opacity: s.enabled ? 1 : 0.55 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong style={{ fontSize: 13, flex: 1 }}>{s.name}</strong>
                  <span className="badge" style={{ background: "rgba(59,130,246,0.1)", color: "#1d4ed8", borderColor: "transparent" }}>{kindMeta?.label ?? s.reportKind}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>cron: {s.cron}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>To: {recipients.join(", ") || "—"}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => runPreview(s.id)} disabled={previewing === s.id} className="gradient-btn" style={{ padding: "4px 12px", borderRadius: 4, border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: previewing === s.id ? "not-allowed" : "pointer" }}>
                    {previewing === s.id ? "..." : "▶ Preview"}
                  </button>
                  <button onClick={() => toggle(s)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}>
                    {s.enabled ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => remove(s.id)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
