"use client";

import { useEffect, useState } from "react";
import { formatDateUTC } from "@/lib/utils";

interface PendingEntry {
  id: string;
  date: string;
  hours: number;
  notes: string | null;
  submittedAt: string | null;
  user:  { id: string; name: string; role: string; region: string | null };
  phase: { id: string; name: string; phaseNumber: number; store: { id: string; code: string; name: string } };
}

interface Resp {
  entries: PendingEntry[];
  summary: { totalEntries: number; totalHours: number; uniqueUsers: number; byUser: { id: string; name: string; count: number; hours: number }[] };
}

interface Props { onClose: () => void }

export default function ApprovalsPanel({ onClose }: Props) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/timesheets/pending");
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, action: "approve" | "reject") => {
    setActingId(id);
    try {
      await fetch(`/api/timesheets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      await load();
    } finally { setActingId(null); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.25)", zIndex: 49, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 580, background: "#fff", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 32px rgba(15,23,42,0.12)", zIndex: 50, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Approvals queue</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>📥 Pending timesheets</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, color: "var(--text-muted)", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {loading && <div style={{ color: "var(--text-secondary)" }}>Loading…</div>}
          {data && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="stat-card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Pending entries</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{data.summary.totalEntries}</div>
                </div>
                <div className="stat-card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Total hours</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{data.summary.totalHours.toFixed(1)}h</div>
                </div>
                <div className="stat-card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Unique users</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{data.summary.uniqueUsers}</div>
                </div>
              </div>

              {data.entries.length === 0 ? (
                <div style={{ background: "rgba(16,185,129,0.08)", borderLeft: "3px solid #10b981", padding: "10px 14px", borderRadius: 6, fontSize: 13, color: "#047857" }}>
                  ✓ No pending approvals — inbox clean.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.entries.map((e) => (
                    <div key={e.id} className="task-item" style={{ padding: 12, gap: 10, alignItems: "stretch", flexDirection: "column" }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{e.user.name} <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>({e.user.role})</span></div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.phase.store.code} · F.{e.phase.phaseNumber} {e.phase.name}</div>
                          {e.notes && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, fontStyle: "italic" }}>"{e.notes}"</div>}
                          <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                            <span>📅 {formatDateUTC(e.date)}</span>
                            <span>⏱ {e.hours}h</span>
                            {e.submittedAt && <span>↑ {new Date(e.submittedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => act(e.id, "reject")} disabled={actingId === e.id} style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: actingId === e.id ? "not-allowed" : "pointer" }}>
                          ✕ Reject
                        </button>
                        <button onClick={() => act(e.id, "approve")} disabled={actingId === e.id} className="gradient-btn" style={{ flex: 2, padding: "6px 10px", borderRadius: 6, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: actingId === e.id ? "not-allowed" : "pointer" }}>
                          {actingId === e.id ? "..." : "✓ Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
