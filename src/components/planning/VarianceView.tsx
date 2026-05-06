"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";

interface VarianceRow {
  id: string; phaseNumber: number; name: string; status: string;
  currentStart: string | null; currentEnd: string | null;
  baselineStart: string | null; baselineEnd: string | null;
  actualStart: string | null;   actualEnd: string | null;
  startDelta: number | null; finishDelta: number | null;
  varianceStatus: "ON_TRACK" | "EARLY" | "LATE" | "UNKNOWN";
  currentCost: number; baselineCost: number; costDelta: number;
  currentWork: number; baselineWork: number; workDelta: number;
  progressPct: number; baselineProgress: number; progressDelta: number;
}

interface VarianceResp {
  baseline: { id: string; name: string; createdAt: string; creator: { name: string } | null } | null;
  rows: VarianceRow[];
  summary: {
    avgFinishDelta: number; maxLate: number; maxEarly: number;
    lateCount: number; earlyCount: number; onTrackCount: number; unknownCount: number; totalPhases: number;
    totalCostBaseline: number; totalCostCurrent: number; totalCostDelta: number;
    totalWorkBaseline: number; totalWorkCurrent: number; totalWorkDelta: number;
  } | null;
}

interface Props { storeId: string }

function fmt(d: string | null) { return d ? new Date(d).toLocaleDateString() : "—"; }
function deltaLabel(d: number | null): { text: string; color: string } {
  if (d === null) return { text: "—", color: "var(--text-muted)" };
  if (d === 0)    return { text: "0d", color: "var(--text-secondary)" };
  if (d > 0)      return { text: `+${d}d`, color: "#dc2626" };
  return { text: `${d}d`, color: "#10b981" };
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  ON_TRACK: { label: "On track", bg: "rgba(16,185,129,0.1)",  color: "#047857" },
  EARLY:    { label: "Early",    bg: "rgba(59,130,246,0.1)",  color: "#1d4ed8" },
  LATE:     { label: "Late",     bg: "rgba(239,68,68,0.1)",   color: "#dc2626" },
  UNKNOWN:  { label: "—",         bg: "rgba(15,23,42,0.05)",   color: "var(--text-muted)" },
};

export default function VarianceView({ storeId }: Props) {
  const t = useT();
  const [data, setData] = useState<VarianceResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/stores/${storeId}/variance`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId]);

  if (loading) {
    return <div className="glass" style={{ borderRadius: 14, padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>{t.common.loadingData}</div>;
  }
  if (!data || !data.baseline) {
    return (
      <div className="glass" style={{ borderRadius: 14, padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
        📍 No baseline saved yet — go to <strong>Cronograma</strong> tab and click <strong>+ Save</strong> to capture a baseline first.
      </div>
    );
  }

  const s = data.summary!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary cards */}
      <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>BASELINE</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{data.baseline.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {new Date(data.baseline.createdAt).toLocaleString()} · {data.baseline.creator?.name ?? "system"}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg slip</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.avgFinishDelta > 0 ? "#dc2626" : s.avgFinishDelta < 0 ? "#10b981" : "var(--text-primary)" }}>
              {s.avgFinishDelta > 0 ? "+" : ""}{s.avgFinishDelta}d
            </div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Max late</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#dc2626" }}>+{s.maxLate}d</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Max early</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>{s.maxEarly}d</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Late phases</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
              {s.lateCount}<span style={{ fontSize: 14, color: "var(--text-muted)" }}>/{s.totalPhases}</span>
            </div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cost Δ</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.totalCostDelta > 0 ? "#dc2626" : s.totalCostDelta < 0 ? "#10b981" : "var(--text-primary)" }}>
              {s.totalCostDelta > 0 ? "+" : ""}{s.totalCostDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.totalCostBaseline.toLocaleString(undefined, { maximumFractionDigits: 0 })} → {s.totalCostCurrent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Work Δ</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.totalWorkDelta > 0 ? "#dc2626" : s.totalWorkDelta < 0 ? "#10b981" : "var(--text-primary)" }}>
              {s.totalWorkDelta > 0 ? "+" : ""}{s.totalWorkDelta.toFixed(0)}h
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.totalWorkBaseline.toFixed(0)}h → {s.totalWorkCurrent.toFixed(0)}h</div>
          </div>
        </div>
      </div>

      {/* Per-phase table */}
      <div className="glass" style={{ borderRadius: 14, overflow: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Phase</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 90, textAlign: "right" }}>Start Δ</th>
              <th style={{ width: 90, textAlign: "right" }}>Finish Δ</th>
              <th style={{ width: 110, textAlign: "right" }}>Cost Δ</th>
              <th style={{ width: 90, textAlign: "right" }}>Work Δ</th>
              <th style={{ width: 90, textAlign: "right" }}>Progress Δ</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const m = STATUS_META[r.varianceStatus];
              const sd = deltaLabel(r.startDelta);
              const fd = deltaLabel(r.finishDelta);
              const cdColor = r.costDelta > 0 ? "#dc2626" : r.costDelta < 0 ? "#10b981" : "var(--text-muted)";
              const wdColor = r.workDelta > 0 ? "#dc2626" : r.workDelta < 0 ? "#10b981" : "var(--text-muted)";
              const pdColor = r.progressDelta > 0 ? "#10b981" : r.progressDelta < 0 ? "#dc2626" : "var(--text-muted)";
              return (
                <tr key={r.id}>
                  <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontWeight: 600 }}>{r.phaseNumber}</td>
                  <td><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.name}</div></td>
                  <td><span className="badge" style={{ background: m.bg, color: m.color, borderColor: "transparent" }}>{m.label}</span></td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: sd.color, fontWeight: 600 }}>{sd.text}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: fd.color, fontWeight: 700 }}>{fd.text}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: cdColor, fontWeight: 600 }}>
                    {r.costDelta === 0 ? "—" : (r.costDelta > 0 ? "+" : "") + r.costDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: wdColor, fontWeight: 600 }}>
                    {r.workDelta === 0 ? "—" : (r.workDelta > 0 ? "+" : "") + r.workDelta.toFixed(0) + "h"}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: pdColor, fontWeight: 600 }}>
                    {r.progressDelta === 0 ? "—" : (r.progressDelta > 0 ? "+" : "") + r.progressDelta + "pp"}
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
