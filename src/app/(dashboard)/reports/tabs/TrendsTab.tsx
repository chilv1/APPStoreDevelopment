"use client";

// TrendsTab — time-series analysis. Cumulative + monthly openings, phase duration
// (planned vs actual), time-to-open by branch.
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import LineChart from "../components/LineChart";
import BarChart from "../components/BarChart";
import { COLORS } from "@/lib/charts/theme";

type TrendsData = {
  openings: { label: string; ymKey: string; count: number }[];
  cumulative: { label: string; ymKey: string; count: number; cum: number }[];
  phaseDuration: { phase: number; avgPlanned: number; avgActual: number; n: number }[];
  timeToOpen: { branchName: string; avgMonths: number; sampleSize: number }[];
};

export default function TrendsTab() {
  const t = useT();
  const [data, setData] = useState<TrendsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports/trends")
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 403) throw new Error(t.reportsPage.forbidden);
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [t.reportsPage.forbidden]);

  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#fca5a5", fontSize: 14 }}>⚠️ {error}</div>;
  if (!data) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
      <div className="spinner" style={{ margin: "0 auto 12px" }} /> {t.reportsPage.loading}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cumulative + monthly openings (full width row) */}
      <LineChart
        title={t.reportsPage.trendsOpeningsCumulative}
        labels={data.cumulative.map((o) => o.label)}
        datasets={[
          { label: t.reportsPage.seriesCumulative, data: data.cumulative.map((o) => o.cum), color: COLORS.success, fill: true },
        ]}
        height={280}
      />

      {/* Monthly + phase duration side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <BarChart
          title={t.reportsPage.trendsOpeningsMonthly}
          labels={data.openings.map((o) => o.label)}
          datasets={[{
            label: t.reportsPage.seriesMonthly,
            data: data.openings.map((o) => o.count),
            backgroundColor: COLORS.primary,
          }]}
        />
        <BarChart
          title={t.reportsPage.trendsPhaseDuration}
          labels={data.phaseDuration.map((p) => `F${p.phase}`)}
          datasets={[
            {
              label: "Planificado (días)",
              data: data.phaseDuration.map((p) => p.avgPlanned),
              backgroundColor: COLORS.muted,
            },
            {
              label: "Real (días)",
              data: data.phaseDuration.map((p) => p.avgActual),
              backgroundColor: data.phaseDuration.map((p) =>
                p.avgActual === 0 ? "transparent" :
                p.avgActual > p.avgPlanned * 1.2 ? COLORS.danger :
                p.avgActual > p.avgPlanned ? COLORS.warning :
                COLORS.success
              ),
            },
          ]}
        />
      </div>

      {/* Time-to-open by branch */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{t.reportsPage.trendsTimeToOpen}</div>
        {data.timeToOpen.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
            — Aún sin datos suficientes (necesita stores completados)
          </div>
        ) : (
          <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th>Sucursal</th>
                <th>Tiempo promedio (meses)</th>
                <th>Tiendas analizadas</th>
              </tr>
            </thead>
            <tbody>
              {data.timeToOpen.map((b) => (
                <tr key={b.branchName}>
                  <td>{b.branchName}</td>
                  <td style={{ fontWeight: 700, color: b.avgMonths > 8 ? "#fca5a5" : "#6ee7b7" }}>
                    {b.avgMonths} meses
                  </td>
                  <td>{b.sampleSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
