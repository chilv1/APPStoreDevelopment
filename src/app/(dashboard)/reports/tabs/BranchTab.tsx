"use client";

// BranchTab — branch dropdown + drill-down view.
// Admins pick from all branches; AreaManagers auto-filter to their branch (only 1 in dropdown).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/context";
import { formatDate, formatCurrencyShort, getStatusLabel, STATUS_COLORS } from "@/lib/utils";
import KPICard from "../components/KPICard";
import DoughnutChart from "../components/DoughnutChart";
import BarChart from "../components/BarChart";
import { STATUS_PALETTE, COLORS } from "@/lib/charts/theme";

type BranchSummary = { id: string; name: string; code: string; storeCount: number; avgProgress: number; bcCount: number };

type BranchDetail = {
  branch: { id: string; code: string; name: string; description: string | null; userCount: number };
  kpis: { totalStores: number; avgProgress: number; totalCapex: number; bcCount: number };
  statusBreakdown: Record<string, number>;
  bcStats: { id: string; code: string; name: string; storeCount: number; avgProgress: number }[];
  phasesInProgress: Record<string, number>;
  stores: {
    id: string; code: string; name: string; pm: string | null;
    bc: { id: string; code: string; name: string } | null;
    status: string; progress: number; targetOpenDate: string | null;
    activePhase: { number: number; name: string; status: string } | null;
  }[];
};

export default function BranchTab() {
  const t = useT();
  const { locale, intlCode } = useLocale();
  const [branches, setBranches] = useState<BranchSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<BranchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial: load branch list. Use null for "not loaded yet" so we can distinguish
  // "still fetching" from "fetched but empty" in the UI below.
  useEffect(() => {
    fetch("/api/reports/by-branch")
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 403) throw new Error(t.reportsPage.forbidden);
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((list: BranchSummary[]) => {
        setBranches(list);
        if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, [t.reportsPage.forbidden]);

  // Fetch detail when selection changes
  useEffect(() => {
    if (!selectedId) return;
    setDetail(null);
    fetch(`/api/reports/branch/${selectedId}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [selectedId]);

  if (error) return (
    <div style={{ padding: 40, textAlign: "center", color: "#fca5a5", fontSize: 14 }}>⚠️ {error}</div>
  );

  // null = still fetching; [] = fetched but empty
  if (branches === null) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
      <div className="spinner" style={{ margin: "0 auto 12px" }} /> {t.reportsPage.loading}
    </div>
  );
  if (branches.length === 0) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
      📭 {t.reportsPage.emptyProjects}
    </div>
  );

  // Status breakdown for doughnut — keep raw keys for color lookup, render
  // localized labels in the legend.
  const statusKeys = detail ? Object.keys(detail.statusBreakdown) : [];
  const statusLabels = statusKeys.map((k) => getStatusLabel(k, locale));
  const statusValues = statusKeys.map((k) => detail!.statusBreakdown[k]);
  const statusColors = statusKeys.map((k) => STATUS_PALETTE[k] || COLORS.muted);

  // Phases in progress for stacked bar (phase 1-11 across stores in branch)
  const phaseLabels = Array.from({ length: 11 }, (_, i) => `F${i + 1}`);
  const phaseValues = phaseLabels.map((_, i) => Number(detail?.phasesInProgress[i + 1] || 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Branch selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          {t.reportsPage.selectBranch}:
        </label>
        <select
          className="input"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: "6px 12px", fontSize: 13, width: "auto", minWidth: 240 }}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name} · {b.storeCount} tiendas
            </option>
          ))}
        </select>
      </div>

      {!detail ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} /> {t.reportsPage.loading}
        </div>
      ) : (
        <>
          {/* Branch KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KPICard icon="🏪" label={t.reportsPage.kpiTotalStores} value={detail.kpis.totalStores} color={COLORS.primary} />
            <KPICard icon="📊" label={t.reportsPage.kpiAvgProgress} value={`${detail.kpis.avgProgress}%`} color={COLORS.secondary} />
            <KPICard icon="🏢" label={t.reportsPage.kpiTotalBCs} value={detail.kpis.bcCount} color={COLORS.cyan} />
            <KPICard icon="💰" label={t.reportsPage.kpiTotalCapex} value={formatCurrencyShort(detail.kpis.totalCapex)} color={COLORS.warning} />
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <DoughnutChart
              title={t.reportsPage.chartStatusBreakdown}
              labels={statusLabels}
              values={statusValues}
              colors={statusColors}
              centerText={`${detail.kpis.totalStores}`}
              centerSubtext={t.reportsPage.kpiTotalStores}
            />
            <BarChart
              title={t.reportsPage.chartBCsInBranch}
              labels={detail.bcStats.map((b) => b.code)}
              datasets={[{
                label: t.reportsPage.kpiAvgProgress,
                data: detail.bcStats.map((b) => b.avgProgress),
                backgroundColor: COLORS.primary,
              }]}
            />
            <BarChart
              title={t.reportsPage.chartPhasesInBranch}
              labels={phaseLabels}
              datasets={[{
                label: t.reportsPage.kpiInProgress,
                data: phaseValues,
                backgroundColor: phaseValues.map((v) => v > 0 ? COLORS.primary : COLORS.muted),
              }]}
            />
          </div>

          {/* Stores list */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              📋 {detail.stores.length} {t.reportsPage.kpiTotalStores.toLowerCase()}
            </div>
            <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th>{t.reportsPage.tableProjectCode}</th>
                  <th>{t.reportsPage.tableStoreName}</th>
                  <th>BC</th>
                  <th>{t.reportsPage.tableStatus}</th>
                  <th>{t.reportsPage.tableProgress}</th>
                  <th>{t.reportsPage.tableActivePhase}</th>
                  <th>{t.reportsPage.tableTargetOpen}</th>
                </tr>
              </thead>
              <tbody>
                {detail.stores.map((s) => (
                  <tr key={s.id}>
                    <td><Link href={`/stores/${s.id}`} style={{ color: COLORS.primary, textDecoration: "none" }}><strong>{s.code}</strong></Link></td>
                    <td>{s.name}</td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.bc?.code || "—"}</td>
                    <td><span className={`badge ${STATUS_COLORS[s.status]}`}>{getStatusLabel(s.status, locale)}</span></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="progress-bar" style={{ width: 60, height: 5 }}>
                          <div className="progress-bar-fill" style={{ width: `${s.progress}%` }} />
                        </div>
                        <span>{s.progress}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {s.activePhase ? `F${s.activePhase.number}: ${s.activePhase.name}` : "—"}
                    </td>
                    <td style={{ fontSize: 11 }}>{formatDate(s.targetOpenDate, intlCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
