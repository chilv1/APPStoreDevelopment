"use client";

// Executive Tab — HQ-level overview. ADMIN only (parent ReportsTabs hides for others).
// Fetches /api/reports/executive on mount; renders KPIs + 3 charts + 2 tables.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/context";
import { formatCurrency, formatCurrencyShort, formatDate } from "@/lib/utils";
import KPICard from "../components/KPICard";
import DoughnutChart from "../components/DoughnutChart";
import BarChart from "../components/BarChart";
import LineChart from "../components/LineChart";
import { STATUS_PALETTE, COLORS } from "@/lib/charts/theme";

type ExecutiveData = {
  kpis: {
    totalStores: number;
    inProgress: number;
    completed: number;
    onHold: number;
    overdue: number;
    openingThisMonth: number;
    totalCapex: number;
    avgProgress: number;
    totalBranches: number;
    totalBCs: number;
  };
  statusBreakdown: Record<string, number>;
  branchStats: { branchId: string; name: string; code: string; total: number; avgProgress: number }[];
  openings: { label: string; ymKey: string; count: number }[];
  cumulative: { label: string; ymKey: string; count: number; cum: number }[];
  topRisk: { id: string; name: string; code: string; branch: string; score: number; overdueDays: number; openIssues: number }[];
  closestOpening: { id: string; name: string; code: string; branch: string; targetOpenDate: string; progress: number; daysToOpen: number | null }[];
};

export default function ExecutiveTab() {
  const t = useT();
  const { intlCode } = useLocale();
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports/executive")
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

  if (error) return (
    <div style={{ padding: 40, textAlign: "center", color: "#fca5a5", fontSize: 14 }}>
      ⚠️ {error}
    </div>
  );
  if (!data) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
      <div className="spinner" style={{ margin: "0 auto 12px" }} /> {t.reportsPage.loading}
    </div>
  );

  // Prepare chart data
  const statusLabels = Object.keys(data.statusBreakdown);
  const statusValues = statusLabels.map((k) => data.statusBreakdown[k]);
  const statusColors = statusLabels.map((k) => STATUS_PALETTE[k] || COLORS.muted);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Export PDF button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <a
          href="/api/reports/executive/pdf"
          download
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", fontSize: 12, fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {t.reportsPage.exportPdf}
        </a>
      </div>

      {/* KPI grid — 5 cols × 2 rows */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <KPICard icon="🏪" label={t.reportsPage.kpiTotalStores} value={data.kpis.totalStores} color={COLORS.primary} />
        <KPICard icon="🔵" label={t.reportsPage.kpiInProgress} value={data.kpis.inProgress} color={COLORS.primary} />
        <KPICard icon="✅" label={t.reportsPage.kpiCompleted} value={data.kpis.completed} color={COLORS.success} />
        <KPICard icon="⏸️" label={t.reportsPage.kpiOnHold} value={data.kpis.onHold} color={COLORS.warning} />
        <KPICard icon="⚠️" label={t.reportsPage.kpiOverdue} value={data.kpis.overdue} color={COLORS.danger} />
        <KPICard icon="🎯" label={t.reportsPage.kpiOpeningThisMonth} value={data.kpis.openingThisMonth} color={COLORS.cyan} />
        <KPICard icon="💰" label={t.reportsPage.kpiTotalCapex} value={formatCurrencyShort(data.kpis.totalCapex)} color={COLORS.warning} />
        <KPICard icon="📊" label={t.reportsPage.kpiAvgProgress} value={`${data.kpis.avgProgress}%`} color={COLORS.secondary} />
        <KPICard icon="🏢" label={t.reportsPage.kpiTotalBranches} value={data.kpis.totalBranches} color={COLORS.muted} />
        <KPICard icon="🏪" label={t.reportsPage.kpiTotalBCs} value={data.kpis.totalBCs} color={COLORS.muted} />
      </div>

      {/* Charts row — 3 cols */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <DoughnutChart
          title={t.reportsPage.chartStatusBreakdown}
          labels={statusLabels}
          values={statusValues}
          colors={statusColors}
          centerText={`${data.kpis.totalStores}`}
        />
        <BarChart
          title={t.reportsPage.chartTopBranches}
          labels={data.branchStats.map((b) => `${b.code} (${b.total})`)}
          datasets={[{
            label: t.reportsPage.kpiAvgProgress,
            data: data.branchStats.map((b) => b.avgProgress),
            backgroundColor: data.branchStats.map((_, i) => i === 0 ? COLORS.success : COLORS.primary),
          }]}
          horizontal
        />
        <LineChart
          title={t.reportsPage.chartOpeningsTimeline}
          labels={data.openings.map((o) => o.label)}
          datasets={[
            { label: t.reportsPage.seriesMonthly, data: data.openings.map((o) => o.count), color: COLORS.primary, fill: false },
            { label: t.reportsPage.seriesCumulative, data: data.cumulative.map((o) => o.cum), color: COLORS.secondary, fill: true },
          ]}
        />
      </div>

      {/* Tables row — 2 cols */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Top risk */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{t.reportsPage.sectionTopRisk}</div>
          {data.topRisk.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
              {t.reportsPage.emptyRisks}
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th>{t.reportsPage.tableStoreName}</th>
                  <th>{t.reportsPage.colRiskScore}</th>
                  <th>{t.reportsPage.colOverdueDays}</th>
                  <th>{t.reportsPage.colOpenIssues}</th>
                </tr>
              </thead>
              <tbody>
                {data.topRisk.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/stores/${r.id}`} style={{ color: COLORS.primary, textDecoration: "none" }}>
                        <strong>{r.code}</strong> · {r.name}
                      </Link>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{r.branch}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: r.score > 30 ? "#fca5a5" : "#fcd34d" }}>{r.score}</td>
                    <td style={{ color: r.overdueDays > 0 ? "#fca5a5" : "var(--text-muted)" }}>{r.overdueDays || "—"}</td>
                    <td style={{ color: r.openIssues > 0 ? "#fcd34d" : "var(--text-muted)" }}>{r.openIssues || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Closest opening */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{t.reportsPage.sectionClosestOpening}</div>
          {data.closestOpening.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
              {t.reportsPage.emptyOpening}
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th>{t.reportsPage.tableStoreName}</th>
                  <th>{t.reportsPage.tableTargetOpen}</th>
                  <th>{t.reportsPage.colDaysToOpen}</th>
                  <th>{t.reportsPage.tableProgress}</th>
                </tr>
              </thead>
              <tbody>
                {data.closestOpening.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/stores/${s.id}`} style={{ color: COLORS.primary, textDecoration: "none" }}>
                        <strong>{s.code}</strong> · {s.name}
                      </Link>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.branch}</div>
                    </td>
                    <td>{formatDate(s.targetOpenDate, intlCode)}</td>
                    <td style={{
                      fontWeight: 700,
                      color: s.daysToOpen != null && s.daysToOpen <= 7 ? "#fca5a5" : COLORS.primary,
                    }}>
                      {s.daysToOpen != null ? `${s.daysToOpen}d` : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="progress-bar" style={{ width: 50, height: 5 }}>
                          <div className="progress-bar-fill" style={{ width: `${s.progress}%` }} />
                        </div>
                        <span>{s.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
