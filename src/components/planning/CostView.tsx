"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";

interface CostRow {
  id: string; phaseNumber: number; name: string; status: string; progressPct: number;
  fixedCost: number; workCost: number; totalCost: number; actualCost: number;
  bcws: number; bcwp: number; acwp: number;
  assignments: { id: string; resourceName: string; units: number; workHours: number; cost: number }[];
}
interface CostResp {
  rows: CostRow[];
  totals: { fixedCost: number; workCost: number; totalCost: number; actualCost: number;
    bcws: number; bcwp: number; acwp: number; cpi: number | null; spi: number | null };
}

interface Props { storeId: string }

function fmt(v: number) { return v.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

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

  const StatCard = ({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) => (
    <div className="stat-card">
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? "var(--text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );

  const cpiColor = totals.cpi == null ? "var(--text-muted)" : totals.cpi >= 1 ? "#10b981" : "#dc2626";
  const spiColor = totals.spi == null ? "var(--text-muted)" : totals.spi >= 1 ? "#10b981" : "#dc2626";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard label="Total Cost" value={fmt(totals.totalCost)} sub={`Fixed ${fmt(totals.fixedCost)} · Work ${fmt(totals.workCost)}`} />
        <StatCard label="BCWS · planned" value={fmt(totals.bcws)} />
        <StatCard label="BCWP · earned" value={fmt(totals.bcwp)} />
        <StatCard label="ACWP · actual" value={fmt(totals.acwp)} />
        <StatCard label="CPI" value={totals.cpi == null ? "—" : totals.cpi.toFixed(2)} color={cpiColor} sub={totals.cpi == null ? "" : totals.cpi >= 1 ? "Under budget" : "Over budget"} />
        <StatCard label="SPI" value={totals.spi == null ? "—" : totals.spi.toFixed(2)} color={spiColor} sub={totals.spi == null ? "" : totals.spi >= 1 ? "Ahead" : "Behind"} />
      </div>

      {/* Per-phase table */}
      <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th>Phase</th>
              <th style={{ width: 100, textAlign: "right" }}>Fixed</th>
              <th style={{ width: 100, textAlign: "right" }}>Work</th>
              <th style={{ width: 100, textAlign: "right" }}>Total</th>
              <th style={{ width: 100, textAlign: "right" }}>BCWS</th>
              <th style={{ width: 100, textAlign: "right" }}>BCWP</th>
              <th style={{ width: 100, textAlign: "right" }}>ACWP</th>
              <th style={{ width: 70, textAlign: "right" }}>Resources</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontWeight: 600 }}>{r.phaseNumber}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.progressPct}% complete</div>
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
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{fmt(r.totalCost)}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(r.bcws)}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(r.bcwp)}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12, color: r.acwp > r.totalCost ? "#dc2626" : "var(--text-secondary)" }}>{fmt(r.acwp)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{r.assignments.length}</td>
              </tr>
            ))}
            <tr style={{ background: "rgba(15,23,42,0.03)" }}>
              <td></td>
              <td style={{ fontWeight: 700 }}>TOTAL</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.fixedCost)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.workCost)}</td>
              <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.totalCost)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.bcws)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.bcwp)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.acwp)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
