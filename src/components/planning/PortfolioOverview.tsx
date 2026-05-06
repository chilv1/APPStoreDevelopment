"use client";

/**
 * Portfolio overview — cross-store summary computed client-side from the
 * existing /api/planning data already loaded by PlanningClient. No new
 * endpoint needed; this is a "view mode" that switches the rest of the
 * Planning tabs into a portfolio-wide aggregate.
 */
import { useMemo, useState } from "react";
import type { PlanningStore } from "./types";

const MS_PER_DAY = 86_400_000;

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

      {/* Cross-store mini-Gantt — Stream 8 P2 */}
      <PortfolioGantt stores={stores} onPickStore={onPickStore} />

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

// ── Portfolio Gantt — cross-store timeline lane ───────────────────────────
// Each row is one store; each phase becomes a colored segment. Hover/click
// jumps the user into Planning detail for that store.

function PortfolioGantt({ stores, onPickStore }: { stores: PlanningStore[]; onPickStore: (id: string) => void }) {
  const [zoom, setZoom] = useState<"month" | "quarter">("month");
  const pxPerDay = zoom === "month" ? 4 : 1.6;
  const ROW_H = 30;
  const NAME_W = 200;

  const { rangeStart, totalDays, rows } = useMemo(() => {
    let minMs = Infinity, maxMs = -Infinity;
    const decorated = stores.map((s) => {
      const phases = s.phases.filter((p) => p.plannedStart && p.plannedEnd);
      const sStart = phases.reduce<number>((acc, p) => Math.min(acc, new Date(p.plannedStart!).getTime()), Infinity);
      const sEnd   = phases.reduce<number>((acc, p) => Math.max(acc, new Date(p.plannedEnd!).getTime()),   -Infinity);
      if (Number.isFinite(sStart) && sStart < minMs) minMs = sStart;
      if (Number.isFinite(sEnd)   && sEnd   > maxMs) maxMs = sEnd;
      return { store: s, sStart, sEnd, phases };
    });
    if (!Number.isFinite(minMs)) minMs = Date.now();
    if (!Number.isFinite(maxMs)) maxMs = minMs + 90 * MS_PER_DAY;
    const start = new Date(Date.UTC(new Date(minMs).getUTCFullYear(), new Date(minMs).getUTCMonth(), 1));
    const end   = new Date(maxMs + 30 * MS_PER_DAY);
    const days  = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
    return { rangeStart: start, totalDays: days, rows: decorated };
  }, [stores]);

  const W = totalDays * pxPerDay;
  const todayX = ((Date.now() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;

  // Month tick labels.
  const ticks: { x: number; label: string }[] = [];
  let cursor = new Date(rangeStart);
  while (cursor.getTime() < rangeStart.getTime() + totalDays * MS_PER_DAY) {
    const x = ((cursor.getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;
    ticks.push({ x, label: cursor.toLocaleDateString(undefined, { month: "short", year: "2-digit" }) });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>📊 Cross-store Gantt</h2>
        <div style={{ display: "flex", gap: 2, padding: 2, background: "rgba(15,23,42,0.04)", borderRadius: 6 }}>
          {(["month", "quarter"] as const).map((z) => (
            <button key={z} onClick={() => setZoom(z)} style={{
              padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
              background: zoom === z ? "var(--gradient-brand)" : "transparent",
              color: zoom === z ? "#fff" : "var(--text-secondary)",
            }}>{z}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", maxHeight: 480 }}>
        <div style={{ width: NAME_W, borderRight: "1px solid var(--border)", flexShrink: 0, overflow: "hidden", background: "var(--bg-card)" }}>
          <div style={{ height: 32, padding: "0 12px", display: "flex", alignItems: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>
            Store
          </div>
          {rows.map(({ store }) => (
            <div key={store.id} onClick={() => onPickStore(store.id)} style={{ height: ROW_H, padding: "0 12px", display: "flex", alignItems: "center", fontSize: 12, cursor: "pointer", borderBottom: "1px solid rgba(15,23,42,0.04)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{store.code}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{store.region ?? "—"}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ width: W, position: "relative" }}>
            {/* Header */}
            <div style={{ height: 32, position: "sticky", top: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border)", zIndex: 2 }}>
              {ticks.map((tk, i) => (
                <div key={i} style={{ position: "absolute", left: tk.x, top: 0, height: 32, borderLeft: "1px solid var(--border-hover)", paddingLeft: 4, fontSize: 10, color: "var(--text-secondary)", display: "flex", alignItems: "flex-end", paddingBottom: 6, fontWeight: 600 }}>{tk.label}</div>
              ))}
            </div>
            {/* Today line */}
            {todayX >= 0 && todayX <= W && (
              <div style={{ position: "absolute", left: todayX, top: 32, bottom: 0, width: 1, background: "#ef4444", zIndex: 1, pointerEvents: "none" }} />
            )}
            {/* Rows */}
            {rows.map(({ store, phases }, ri) => {
              const top = 32 + ri * ROW_H;
              return (
                <div key={store.id}>
                  <div style={{ position: "absolute", left: 0, right: 0, top, height: ROW_H, borderBottom: "1px solid rgba(15,23,42,0.04)" }} />
                  {phases.map((p) => {
                    const sx = ((new Date(p.plannedStart!).getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;
                    const ex = ((new Date(p.plannedEnd!).getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;
                    const w = Math.max(2, ex - sx);
                    const color =
                      p.status === "COMPLETED"   ? "#10b981" :
                      p.status === "IN_PROGRESS" ? "#3b82f6" :
                      p.status === "BLOCKED"     ? "#f59e0b" :
                      p.status === "NOT_STARTED" ? "#94a3b8" : "#6b7280";
                    return (
                      <div
                        key={p.id}
                        title={`${store.code} · F.${p.phaseNumber} ${p.name} · ${p.plannedStart?.slice(0, 10)} → ${p.plannedEnd?.slice(0, 10)}`}
                        onClick={() => onPickStore(store.id)}
                        style={{
                          position: "absolute",
                          left: sx, top: top + 5, width: w, height: ROW_H - 10,
                          background: color, borderRadius: 3, opacity: 0.9, cursor: "pointer",
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
            <div style={{ height: 32 + rows.length * ROW_H }} />
          </div>
        </div>
      </div>
    </div>
  );
}
