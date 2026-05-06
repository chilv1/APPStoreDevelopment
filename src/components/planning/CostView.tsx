"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";

interface CostRow {
  id: string; phaseNumber: number; name: string; status: string; progressPct: number;
  fixedCost: number; workCost: number; totalCost: number; actualCost: number;
  bcws: number; bcwp: number; acwp: number;
  cv: number; sv: number; cpi: number | null; spi: number | null;
  varianceStatus: "ON_BUDGET" | "OVER_BUDGET" | "UNDER_BUDGET" | "NEUTRAL";
  assignments: { id: string; resourceName: string; units: number; workHours: number; actualWork: number; cost: number }[];
}
interface CostResp {
  rows: CostRow[];
  totals: { fixedCost: number; workCost: number; totalCost: number; actualCost: number;
    bcws: number; bcwp: number; acwp: number; cpi: number | null; spi: number | null };
}

interface Props { storeId: string }

function fmt(v: number) { return v.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ON_BUDGET:    { label: "On budget",    color: "var(--text-secondary)", bg: "rgba(15,23,42,0.05)" },
  UNDER_BUDGET: { label: "Under",        color: "#047857", bg: "rgba(16,185,129,0.1)" },
  OVER_BUDGET:  { label: "Over",         color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  NEUTRAL:      { label: "—",            color: "var(--text-muted)", bg: "rgba(15,23,42,0.05)" },
};

export default function CostView({ storeId }: Props) {
  const t = useT();
  const [data, setData] = useState<CostResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await fetch(`/api/stores/${storeId}/cost`); if (r.ok) setData(await r.json()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [storeId]);

  const saveFixed = async (phaseId: string, value: string) => {
    setEditing(null);
    const v = Math.max(0, Number(value) || 0);
    const r = await fetch(`/api/phases/${phaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixedCost: v }),
    });
    if (r.ok) load();
  };

  if (loading || !data) {
    return <div className="glass" style={{ borderRadius: 14, padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>{t.common.loadingData}</div>;
  }

  const { totals } = data;
  // Aggregate variance
  const cv = totals.bcwp - totals.acwp;
  const sv = totals.bcwp - totals.bcws;

  const StatCard = ({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) => (
    <div className="stat-card">
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? "var(--text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );

  const cpiColor = totals.cpi == null ? "var(--text-muted)" : totals.cpi >= 1 ? "#10b981" : "#dc2626";
  const spiColor = totals.spi == null ? "var(--text-muted)" : totals.spi >= 1 ? "#10b981" : "#dc2626";
  const cvColor  = cv > 0 ? "#10b981" : cv < 0 ? "#dc2626" : "var(--text-primary)";
  const svColor  = sv > 0 ? "#10b981" : sv < 0 ? "#dc2626" : "var(--text-primary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stream 6 P3 — EVM trend chart */}
      <EVMTrendChart storeId={storeId} />

      {/* Top KPIs — totals + variance */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <StatCard label="Total Cost" value={fmt(totals.totalCost)} sub={`Fixed ${fmt(totals.fixedCost)} · Work ${fmt(totals.workCost)}`} />
        <StatCard label="BCWS · planned" value={fmt(totals.bcws)} />
        <StatCard label="BCWP · earned" value={fmt(totals.bcwp)} />
        <StatCard label="ACWP · actual" value={fmt(totals.acwp)} />
        <StatCard label="CV (BCWP-ACWP)" value={(cv > 0 ? "+" : "") + fmt(cv)} color={cvColor} sub={cv > 0 ? "Under budget" : cv < 0 ? "Over budget" : ""} />
        <StatCard label="SV (BCWP-BCWS)" value={(sv > 0 ? "+" : "") + fmt(sv)} color={svColor} sub={sv > 0 ? "Ahead" : sv < 0 ? "Behind" : ""} />
        <StatCard label="CPI" value={totals.cpi == null ? "—" : totals.cpi.toFixed(2)} color={cpiColor} />
        <StatCard label="SPI" value={totals.spi == null ? "—" : totals.spi.toFixed(2)} color={spiColor} />
      </div>

      {/* Per-phase table */}
      <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Phase</th>
              <th style={{ width: 100, textAlign: "right" }}>Fixed</th>
              <th style={{ width: 90,  textAlign: "right" }}>Work</th>
              <th style={{ width: 90,  textAlign: "right" }}>BCWS</th>
              <th style={{ width: 90,  textAlign: "right" }}>BCWP</th>
              <th style={{ width: 90,  textAlign: "right" }}>ACWP</th>
              <th style={{ width: 80,  textAlign: "right" }}>CV</th>
              <th style={{ width: 80,  textAlign: "right" }}>SV</th>
              <th style={{ width: 60,  textAlign: "right" }}>CPI</th>
              <th style={{ width: 60,  textAlign: "right" }}>SPI</th>
              <th style={{ width: 90 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const m = STATUS_META[r.varianceStatus];
              return (
                <tr key={r.id}>
                  <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontWeight: 600 }}>{r.phaseNumber}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.progressPct}% · {r.assignments.length} resources</div>
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {editing?.id === r.id ? (
                      <input
                        autoFocus type="number" min={0}
                        className="input" style={{ width: 90, padding: "4px 6px", fontSize: 12 }}
                        value={editing.value}
                        onChange={(e) => setEditing({ id: r.id, value: e.target.value })}
                        onBlur={() => saveFixed(r.id, editing.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveFixed(r.id, editing.value); if (e.key === "Escape") setEditing(null); }}
                      />
                    ) : (
                      <span onDoubleClick={() => setEditing({ id: r.id, value: String(r.fixedCost) })} style={{ cursor: "pointer", borderBottom: "1px dashed transparent" }} title="Double-click to edit">
                        {fmt(r.fixedCost)}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>{fmt(r.workCost)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(r.bcws)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(r.bcwp)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12, color: r.acwp > r.totalCost ? "#dc2626" : "var(--text-secondary)" }}>{fmt(r.acwp)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.cv > 0 ? "#10b981" : r.cv < 0 ? "#dc2626" : "var(--text-muted)", fontWeight: 600 }}>
                    {r.cv === 0 ? "—" : (r.cv > 0 ? "+" : "") + fmt(r.cv)}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.sv > 0 ? "#10b981" : r.sv < 0 ? "#dc2626" : "var(--text-muted)", fontWeight: 600 }}>
                    {r.sv === 0 ? "—" : (r.sv > 0 ? "+" : "") + fmt(r.sv)}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.cpi == null ? "var(--text-muted)" : r.cpi >= 1 ? "#10b981" : "#dc2626", fontWeight: 600 }}>
                    {r.cpi == null ? "—" : r.cpi.toFixed(2)}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.spi == null ? "var(--text-muted)" : r.spi >= 1 ? "#10b981" : "#dc2626", fontWeight: 600 }}>
                    {r.spi == null ? "—" : r.spi.toFixed(2)}
                  </td>
                  <td><span className="badge" style={{ background: m.bg, color: m.color, borderColor: "transparent" }}>{m.label}</span></td>
                </tr>
              );
            })}
            <tr style={{ background: "rgba(15,23,42,0.03)" }}>
              <td></td>
              <td style={{ fontWeight: 700 }}>TOTAL</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.fixedCost)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.workCost)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.bcws)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.bcwp)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.acwp)}</td>
              <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: cvColor }}>{(cv > 0 ? "+" : "") + fmt(cv)}</td>
              <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: svColor }}>{(sv > 0 ? "+" : "") + fmt(sv)}</td>
              <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: cpiColor }}>{totals.cpi == null ? "—" : totals.cpi.toFixed(2)}</td>
              <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: spiColor }}>{totals.spi == null ? "—" : totals.spi.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── EVM trend chart (Stream 6 P3) ──────────────────────────────────────────

function EVMTrendChart({ storeId }: { storeId: string }) {
  const [points, setPoints] = useState<{ date: string; bcws: number; bcwp: number; acwp: number }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/stores/${storeId}/cost/trend`)
      .then((r) => r.ok ? r.json() : { points: [] })
      .then((d) => { setPoints(d.points ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [storeId]);

  if (loading) return <div className="glass" style={{ borderRadius: 14, padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>Loading trend…</div>;
  if (points.length < 2) return null;

  const W = 1100, H = 220, PAD = { l: 60, r: 20, t: 16, b: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = Math.max(1, ...points.flatMap((p) => [p.bcws, p.bcwp, p.acwp]));
  const xAt = (i: number) => PAD.l + (i / Math.max(1, points.length - 1)) * innerW;
  const yAt = (v: number) => PAD.t + innerH - (v / max) * innerH;
  const series: [string, string, "bcws" | "bcwp" | "acwp"][] = [
    ["BCWS",  "#3b82f6", "bcws"],
    ["BCWP",  "#10b981", "bcwp"],
    ["ACWP",  "#ef4444", "acwp"],
  ];

  // Today line.
  const todayIdx = points.findIndex((p) => new Date(p.date).getTime() >= Date.now());

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>📈 EVM trend</h3>
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)" }}>
          {series.map(([label, color]) => (
            <span key={label}><span style={{ display: "inline-block", width: 10, height: 10, background: color, borderRadius: 2, marginRight: 4 }} />{label}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {/* y-axis grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => {
            const y = PAD.t + innerH - g * innerH;
            return <g key={g}>
              <line x1={PAD.l} x2={PAD.l + innerW} y1={y} y2={y} stroke="rgba(15,23,42,0.06)" strokeDasharray="2,4" />
              <text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)">{Math.round(max * g).toLocaleString()}</text>
            </g>;
          })}
          {/* Today line */}
          {todayIdx > 0 && (
            <line x1={xAt(todayIdx)} x2={xAt(todayIdx)} y1={PAD.t} y2={PAD.t + innerH} stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" />
          )}
          {/* Series */}
          {series.map(([, color, key]) => {
            const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p[key]).toFixed(1)}`).join(" ");
            return <path key={key} d={path} fill="none" stroke={color} strokeWidth="2" />;
          })}
          {/* x-axis labels */}
          {points.length > 0 && [0, Math.floor(points.length / 2), points.length - 1].map((i) => (
            <text key={i} x={xAt(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{points[i].date}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}
