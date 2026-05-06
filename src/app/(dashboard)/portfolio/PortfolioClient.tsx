"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Portfolio {
  kpis: { totalStores: number; byStatus: Record<string, number>; lateCount: number; avgProgress: number };
  milestones: { storeId: string; storeCode: string; storeName: string; region: string | null; phaseId: string; phaseNumber: number; phaseName: string; phaseStatus: string; plannedStart: string | null; plannedEnd: string | null; deadline: string | null }[];
  capacity: { region: string; total: number; active: number; late: number; risks: number }[];
  stores: { id: string; code: string; name: string; status: string; progress: number; region: string | null; branch: string | null; pmName: string | null; targetOpenDate: string | null; openIssues: number }[];
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PLANNING:    { label: "Planning",    color: "#92400e", bg: "rgba(245,158,11,0.1)" },
  IN_PROGRESS: { label: "In progress", color: "#1d4ed8", bg: "rgba(59,130,246,0.1)" },
  COMPLETED:   { label: "Completed",   color: "#047857", bg: "rgba(16,185,129,0.1)" },
  ON_HOLD:     { label: "On hold",     color: "#b91c1c", bg: "rgba(239,68,68,0.1)" },
  CANCELLED:   { label: "Cancelled",   color: "var(--text-muted)", bg: "rgba(15,23,42,0.05)" },
  BLOCKED:     { label: "Blocked",     color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  NOT_STARTED: { label: "Not started", color: "var(--text-muted)", bg: "rgba(15,23,42,0.05)" },
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export default function PortfolioClient() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>Loading…</div>;
  }

  const { kpis } = data;

  const StatCard = ({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) => (
    <div className="stat-card">
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color ?? "var(--text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1500, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>📊 Portfolio</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Visión transversal de todas las tiendas del portafolio</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard label="Stores" value={kpis.totalStores} />
        <StatCard label="In progress" value={kpis.byStatus.IN_PROGRESS ?? 0} color="#1d4ed8" />
        <StatCard label="Planning" value={kpis.byStatus.PLANNING ?? 0} color="#92400e" />
        <StatCard label="Completed" value={kpis.byStatus.COMPLETED ?? 0} color="#047857" />
        <StatCard label="On hold" value={kpis.byStatus.ON_HOLD ?? 0} color="#b91c1c" />
        <StatCard label="Late" value={kpis.lateCount} color="#dc2626" sub="past target date" />
        <StatCard label="Avg progress" value={`${kpis.avgProgress}%`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Capacity heatmap by region */}
        <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Capacity by region</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Region</th>
                <th style={{ width: 80, textAlign: "right" }}>Total</th>
                <th style={{ width: 80, textAlign: "right" }}>Active</th>
                <th style={{ width: 70, textAlign: "right" }}>Late</th>
                <th style={{ width: 80, textAlign: "right" }}>Risks</th>
                <th style={{ width: 130 }}>Load</th>
              </tr>
            </thead>
            <tbody>
              {data.capacity.map((c) => {
                const load = c.total > 0 ? Math.min(100, Math.round((c.active / Math.max(1, c.total)) * 100)) : 0;
                const lateRatio = c.total > 0 ? c.late / c.total : 0;
                const loadColor = lateRatio > 0.3 ? "#ef4444" : load > 60 ? "#f59e0b" : "#10b981";
                return (
                  <tr key={c.region}>
                    <td style={{ fontWeight: 600 }}>{c.region}</td>
                    <td style={{ textAlign: "right" }}>{c.total}</td>
                    <td style={{ textAlign: "right" }}>{c.active}</td>
                    <td style={{ textAlign: "right", color: c.late > 0 ? "#dc2626" : "var(--text-muted)" }}>{c.late}</td>
                    <td style={{ textAlign: "right" }}>{c.risks}</td>
                    <td>
                      <div style={{ height: 8, background: "rgba(15,23,42,0.06)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${load}%`, height: "100%", background: loadColor, borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Upcoming milestones */}
        <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Upcoming milestones</h2>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{data.milestones.length} active deliverables sorted by due</div>
          </div>
          <div style={{ maxHeight: 480, overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Phase</th>
                  <th style={{ width: 110 }}>Due</th>
                  <th style={{ width: 90 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.milestones.map((m) => {
                  const meta = STATUS_META[m.phaseStatus] ?? STATUS_META.NOT_STARTED;
                  const isLate = m.plannedEnd && new Date(m.plannedEnd).getTime() < Date.now();
                  return (
                    <tr key={`${m.storeId}_${m.phaseId}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.storeCode}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.region}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>F.{m.phaseNumber} {m.phaseName}</div>
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums", color: isLate ? "#dc2626" : "var(--text-secondary)" }}>{fmtDate(m.plannedEnd)}</td>
                      <td><span className="badge" style={{ background: meta.bg, color: meta.color, borderColor: "transparent" }}>{meta.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stores list */}
      <div className="glass" style={{ borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>All stores</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>Code</th>
              <th>Name</th>
              <th style={{ width: 130 }}>Region</th>
              <th style={{ width: 130 }}>PM</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 130 }}>Target open</th>
              <th style={{ width: 70 }}>Risks</th>
              <th style={{ width: 140 }}>Progress</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {data.stores.map((s) => {
              const meta = STATUS_META[s.status] ?? STATUS_META.PLANNING;
              const late = s.targetOpenDate && new Date(s.targetOpenDate).getTime() < Date.now() && s.status !== "COMPLETED";
              return (
                <tr key={s.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{s.code}</td>
                  <td><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.branch ?? "—"}</div></td>
                  <td>{s.region ?? "—"}</td>
                  <td>{s.pmName ?? "—"}</td>
                  <td><span className="badge" style={{ background: meta.bg, color: meta.color, borderColor: "transparent" }}>{meta.label}</span></td>
                  <td style={{ fontVariantNumeric: "tabular-nums", color: late ? "#dc2626" : "var(--text-secondary)" }}>{fmtDate(s.targetOpenDate)}</td>
                  <td style={{ fontWeight: 700 }}>{s.openIssues}</td>
                  <td>
                    <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${s.progress}%` }} /></div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.progress}%</div>
                  </td>
                  <td><Link href={`/stores/${s.id}`} style={{ color: "var(--accent-blue)", fontSize: 12, textDecoration: "none" }}>Open →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
