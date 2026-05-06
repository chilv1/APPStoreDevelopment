"use client";

/**
 * Portfolio overview — cross-store summary computed client-side from the
 * existing /api/planning data already loaded by PlanningClient. No new
 * endpoint needed; this is a "view mode" that switches the rest of the
 * Planning tabs into a portfolio-wide aggregate.
 */
import { useMemo } from "react";
import type { PlanningStore } from "./types";

interface Props {
  stores: PlanningStore[];
  onPickStore: (id: string) => void;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PLANNING:    { label: "Planning",    color: "#92400e", bg: "rgba(245,158,11,0.1)" },
  IN_PROGRESS: { label: "In progress", color: "#1d4ed8", bg: "rgba(59,130,246,0.1)" },
  COMPLETED:   { label: "Completed",   color: "#047857", bg: "rgba(16,185,129,0.1)" },
  ON_HOLD:     { label: "On hold",     color: "#b91c1c", bg: "rgba(239,68,68,0.1)" },
  CANCELLED:   { label: "Cancelled",   color: "var(--text-muted)", bg: "rgba(15,23,42,0.05)" },
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export default function PortfolioOverview({ stores, onPickStore }: Props) {
  const stats = useMemo(() => {
    const today = Date.now();
    const byStatus: Record<string, number> = { PLANNING: 0, IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0, CANCELLED: 0 };
    const byRegion: Record<string, { region: string; total: number; active: number; late: number }> = {};
    let lateCount = 0, totalProgress = 0;
    const milestones: { storeId: string; storeCode: string; storeName: string; region: string | null; phaseId: string; phaseNumber: number; phaseName: string; phaseStatus: string; plannedEnd: string | null }[] = [];

    for (const s of stores) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      totalProgress += s.progress;
      const region = s.region ?? "—";
      if (!byRegion[region]) byRegion[region] = { region, total: 0, active: 0, late: 0 };
      byRegion[region].total++;
      if (s.status === "IN_PROGRESS" || s.status === "PLANNING") byRegion[region].active++;
      const isLate = s.targetOpenDate && new Date(s.targetOpenDate).getTime() < today && s.status !== "COMPLETED";
      if (isLate) { lateCount++; byRegion[region].late++; }

      // Pick next 2 active phases for the milestones lane.
      const upcoming = s.phases
        .filter((p) => p.status !== "COMPLETED" && p.plannedEnd && new Date(p.plannedEnd).getTime() > today - 7 * 86_400_000)
        .slice(0, 2);
      for (const p of upcoming) {
        milestones.push({
          storeId: s.id, storeCode: s.code, storeName: s.name, region: s.region,
          phaseId: p.id, phaseNumber: p.phaseNumber, phaseName: p.name, phaseStatus: p.status,
          plannedEnd: p.plannedEnd,
        });
      }
    }
    milestones.sort((a, b) => {
      const ta = a.plannedEnd ? new Date(a.plannedEnd).getTime() : Infinity;
      const tb = b.plannedEnd ? new Date(b.plannedEnd).getTime() : Infinity;
      return ta - tb;
    });

    return {
      total: stores.length,
      byStatus,
      lateCount,
      avgProgress: stores.length > 0 ? Math.round(totalProgress / stores.length) : 0,
      regions: Object.values(byRegion).sort((a, b) => b.total - a.total),
      milestones: milestones.slice(0, 30),
    };
  }, [stores]);

  if (stores.length === 0) {
    return <div className="glass" style={{ borderRadius: 14, padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>No stores in the portfolio yet.</div>;
  }

  const StatCard = ({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) => (
    <div className="stat-card">
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color ?? "var(--text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard label="Stores"      value={stats.total} />
        <StatCard label="In progress" value={stats.byStatus.IN_PROGRESS ?? 0} color="#1d4ed8" />
        <StatCard label="Planning"    value={stats.byStatus.PLANNING ?? 0}    color="#92400e" />
        <StatCard label="Completed"   value={stats.byStatus.COMPLETED ?? 0}   color="#047857" />
        <StatCard label="On hold"     value={stats.byStatus.ON_HOLD ?? 0}     color="#b91c1c" />
        <StatCard label="Late"        value={stats.lateCount}                 color="#dc2626" sub="past target date" />
        <StatCard label="Avg progress" value={`${stats.avgProgress}%`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Capacity by region */}
        <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Capacity by region</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Region</th>
                <th style={{ width: 70, textAlign: "right" }}>Total</th>
                <th style={{ width: 70, textAlign: "right" }}>Active</th>
                <th style={{ width: 70, textAlign: "right" }}>Late</th>
                <th style={{ width: 130 }}>Load</th>
              </tr>
            </thead>
            <tbody>
              {stats.regions.map((c) => {
                const load = c.total > 0 ? Math.min(100, Math.round((c.active / Math.max(1, c.total)) * 100)) : 0;
                const lateRatio = c.total > 0 ? c.late / c.total : 0;
                const loadColor = lateRatio > 0.3 ? "#ef4444" : load > 60 ? "#f59e0b" : "#10b981";
                return (
                  <tr key={c.region}>
                    <td style={{ fontWeight: 600 }}>{c.region}</td>
                    <td style={{ textAlign: "right" }}>{c.total}</td>
                    <td style={{ textAlign: "right" }}>{c.active}</td>
                    <td style={{ textAlign: "right", color: c.late > 0 ? "#dc2626" : "var(--text-muted)" }}>{c.late}</td>
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
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{stats.milestones.length} active deliverables</div>
          </div>
          <div style={{ maxHeight: 380, overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Phase</th>
                  <th style={{ width: 100 }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {stats.milestones.map((m) => {
                  const isLate = m.plannedEnd && new Date(m.plannedEnd).getTime() < Date.now();
                  return (
                    <tr key={`${m.storeId}_${m.phaseId}`} onClick={() => onPickStore(m.storeId)} style={{ cursor: "pointer" }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.storeCode}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.region ?? "—"}</div>
                      </td>
                      <td><div style={{ fontWeight: 500 }}>F.{m.phaseNumber} {m.phaseName}</div></td>
                      <td style={{ fontVariantNumeric: "tabular-nums", color: isLate ? "#dc2626" : "var(--text-secondary)" }}>{fmtDate(m.plannedEnd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* All stores list — clickable to focus that project in Planning */}
      <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>All stores · click to open in Planning</h2>
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
              <th style={{ width: 140 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => {
              const meta = STATUS_META[s.status] ?? STATUS_META.PLANNING;
              const late = s.targetOpenDate && new Date(s.targetOpenDate).getTime() < Date.now() && s.status !== "COMPLETED";
              return (
                <tr key={s.id} onClick={() => onPickStore(s.id)} style={{ cursor: "pointer" }}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{s.code}</td>
                  <td><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.branch ?? "—"}</div></td>
                  <td>{s.region ?? "—"}</td>
                  <td>{s.pm?.name ?? "—"}</td>
                  <td><span className="badge" style={{ background: meta.bg, color: meta.color, borderColor: "transparent" }}>{meta.label}</span></td>
                  <td style={{ fontVariantNumeric: "tabular-nums", color: late ? "#dc2626" : "var(--text-secondary)" }}>{fmtDate(s.targetOpenDate)}</td>
                  <td>
                    <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${s.progress}%` }} /></div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.progress}%</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
