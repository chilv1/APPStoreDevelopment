"use client";

// RisksTab — at-risk store list + open issues breakdown by severity/type +
// top 5 critical issues. Available to all authenticated users (scoped to their stores).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import KPICard from "../components/KPICard";
import BarChart from "../components/BarChart";
import { COLORS } from "@/lib/charts/theme";

type RisksData = {
  summary: { totalAtRisk: number; totalOverdue: number; phasesBlocked: number; openIssuesTotal: number };
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  ranked: {
    storeId: string; storeCode: string; storeName: string; branch: string;
    score: number; overdueDays: number; openIssues: number; blockedPhases: number;
  }[];
  topIssues: {
    id: string; title: string; severity: string; type: string;
    storeId: string; storeCode: string; storeName: string;
  }[];
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: COLORS.danger,
  HIGH: COLORS.warning,
  MEDIUM: COLORS.cyan,
  LOW: COLORS.muted,
};

const TYPE_COLORS: Record<string, string> = {
  ISSUE: COLORS.danger,
  RISK: COLORS.warning,
  BLOCKER: COLORS.secondary,
};

export default function RisksTab() {
  const t = useT();
  const [data, setData] = useState<RisksData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports/risks")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#fca5a5", fontSize: 14 }}>⚠️ {error}</div>;
  if (!data) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
      <div className="spinner" style={{ margin: "0 auto 12px" }} /> {t.reportsPage.loading}
    </div>
  );

  const sevLabels = Object.keys(data.bySeverity);
  const typeLabels = Object.keys(data.byType);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KPICard icon="🚨" label={t.reportsPage.risksAtRiskTitle} value={data.summary.totalAtRisk} color={COLORS.danger} />
        <KPICard icon="⏰" label={t.reportsPage.kpiOverdue} value={data.summary.totalOverdue} color={COLORS.warning} />
        <KPICard icon="🚫" label={t.reportsPage.risksBlockedPhases.replace("{n}", "")} value={data.summary.phasesBlocked} color={COLORS.secondary} />
        <KPICard icon="⚠️" label={t.reportsPage.risksOpenIssues} value={data.summary.openIssuesTotal} color={COLORS.cyan} />
      </div>

      {/* Charts: severity + type breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <BarChart
          title={t.reportsPage.risksBySeverity}
          labels={sevLabels}
          datasets={[{
            label: t.reportsPage.risksOpenIssues,
            data: sevLabels.map((k) => data.bySeverity[k]),
            backgroundColor: sevLabels.map((k) => SEVERITY_COLORS[k] || COLORS.muted),
          }]}
        />
        <BarChart
          title={t.reportsPage.risksByType}
          labels={typeLabels}
          datasets={[{
            label: t.reportsPage.risksOpenIssues,
            data: typeLabels.map((k) => data.byType[k]),
            backgroundColor: typeLabels.map((k) => TYPE_COLORS[k] || COLORS.muted),
          }]}
        />
      </div>

      {/* At-risk stores ranked */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          🚨 {t.reportsPage.risksAtRiskTitle} ({data.ranked.length})
        </div>
        {data.ranked.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
            ✅ {t.reportsPage.emptyRisks}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.ranked.map((r) => (
              <Link key={r.storeId} href={`/stores/${r.storeId}`} style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "10px 14px",
                display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 14,
                alignItems: "center",
                textDecoration: "none", color: "inherit",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {r.storeCode} · {r.storeName}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                    {r.branch}
                  </div>
                  {/* Risk reasons */}
                  <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {r.overdueDays > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: "rgba(239,68,68,0.2)", color: "#fca5a5",
                        border: "1px solid rgba(239,68,68,0.4)",
                        borderRadius: 99, padding: "2px 8px",
                      }}>⏰ {r.overdueDays}d atraso</span>
                    )}
                    {r.openIssues > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: "rgba(245,158,11,0.2)", color: "#fcd34d",
                        border: "1px solid rgba(245,158,11,0.4)",
                        borderRadius: 99, padding: "2px 8px",
                      }}>⚠️ {r.openIssues} problemas</span>
                    )}
                    {r.blockedPhases > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: "rgba(139,92,246,0.2)", color: "#c4b5fd",
                        border: "1px solid rgba(139,92,246,0.4)",
                        borderRadius: 99, padding: "2px 8px",
                      }}>🚫 {r.blockedPhases} fases bloq.</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: r.score > 50 ? "#fca5a5" : "#fcd34d" }}>{r.score}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{t.reportsPage.colRiskScore}</div>
                </div>
                <div style={{ fontSize: 18, color: COLORS.primary }}>→</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Top 5 critical issues */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          🔥 Top 5 problemas críticos
        </div>
        {data.topIssues.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
            ✅ Sin problemas críticos
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.topIssues.map((i) => (
              <Link key={i.id} href={`/stores/${i.storeId}`} style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6,
                textDecoration: "none", color: "inherit",
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  background: SEVERITY_COLORS[i.severity] + "33",
                  color: SEVERITY_COLORS[i.severity],
                  border: `1px solid ${SEVERITY_COLORS[i.severity]}66`,
                  borderRadius: 4, padding: "2px 7px",
                  textTransform: "uppercase",
                }}>{i.severity}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{i.title}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{i.storeCode} · {i.storeName}</div>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{i.type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
