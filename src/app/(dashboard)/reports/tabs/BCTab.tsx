"use client";

// BCTab — Business Center detail with per-store cards + phase matrix.
// Permission: any authenticated user. Dropdown lists only BCs the user can access.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/context";
import { getStatusLabel, STATUS_COLORS } from "@/lib/utils";
import KPICard from "../components/KPICard";
import DoughnutChart from "../components/DoughnutChart";
import PhaseMatrix from "../components/PhaseMatrix";
import type { PhaseMatrixRow } from "../components/PhaseMatrix";
import { STATUS_PALETTE, COLORS } from "@/lib/charts/theme";

type BCSummary = {
  id: string; code: string; name: string;
  branch: { id: string; code: string; name: string };
  storeCount: number; avgProgress: number;
};

type BCDetail = {
  bc: { id: string; code: string; name: string; address: string | null; branch: { id: string; code: string; name: string } };
  kpis: { storeCount: number; avgProgress: number };
  statusBreakdown: Record<string, number>;
  phaseMatrix: PhaseMatrixRow[];
  storeCards: {
    id: string; code: string; name: string; status: string; progress: number;
    totalTasks: number; doneTasks: number; issueCount: number;
    daysToOpen: number | null;
    activePhase: { number: number; name: string } | null;
  }[];
};

export default function BCTab() {
  const t = useT();
  const { locale } = useLocale();
  const [bcs, setBcs] = useState<BCSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<BCDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports/by-bc")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((list: BCSummary[]) => {
        setBcs(list);
        if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetail(null);
    fetch(`/api/reports/bc/${selectedId}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [selectedId]);

  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#fca5a5", fontSize: 14 }}>⚠️ {error}</div>;

  if (bcs === null) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
      <div className="spinner" style={{ margin: "0 auto 12px" }} /> {t.reportsPage.loading}
    </div>
  );
  if (bcs.length === 0) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
      📭 {t.reportsPage.emptyProjects}
    </div>
  );

  const statusLabels = detail ? Object.keys(detail.statusBreakdown) : [];
  const statusValues = statusLabels.map((k) => detail!.statusBreakdown[k]);
  const statusColors = statusLabels.map((k) => STATUS_PALETTE[k] || COLORS.muted);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* BC selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          {t.reportsPage.selectBC}:
        </label>
        <select
          className="input"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: "6px 12px", fontSize: 13, width: "auto", minWidth: 280 }}
        >
          {bcs.map((bc) => (
            <option key={bc.id} value={bc.id}>
              {bc.branch.code} · {bc.code} — {bc.name} · {bc.storeCount} tiendas
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
          {/* BC header card */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                🏪 {detail.bc.code} — {detail.bc.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                🏢 {detail.bc.branch.code} {detail.bc.branch.name}
                {detail.bc.address && <> · 📍 {detail.bc.address}</>}
              </div>
            </div>
          </div>

          {/* KPIs + status doughnut */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
            <KPICard icon="🏬" label={t.reportsPage.kpiTotalStores} value={detail.kpis.storeCount} color={COLORS.primary} />
            <KPICard icon="📊" label={t.reportsPage.kpiAvgProgress} value={`${detail.kpis.avgProgress}%`} color={COLORS.secondary} />
            <DoughnutChart
              title={t.reportsPage.chartStatusBreakdown}
              labels={statusLabels}
              values={statusValues}
              colors={statusColors}
              centerText={`${detail.kpis.storeCount}`}
            />
          </div>

          {/* Per-store cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {detail.storeCards.map((s) => {
              const pct = s.totalTasks > 0 ? Math.round((s.doneTasks / s.totalTasks) * 100) : 0;
              return (
                <Link key={s.id} href={`/stores/${s.id}`} style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 8,
                  textDecoration: "none", color: "inherit",
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{s.code}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f4ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name}
                      </div>
                    </div>
                    <span className={`badge ${STATUS_COLORS[s.status]}`} style={{ fontSize: 10, whiteSpace: "nowrap" }}>
                      {getStatusLabel(s.status, locale)}
                    </span>
                  </div>

                  {s.activePhase && (
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      ▶ F{s.activePhase.number}: {s.activePhase.name}
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    📋 {s.doneTasks}/{s.totalTasks} tasks · {s.issueCount > 0 && <span style={{ color: "#fcd34d" }}>⚠️ {s.issueCount}</span>}
                  </div>

                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-bar-fill" style={{ width: `${s.progress}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
                    <span>{s.progress}% project</span>
                    {s.daysToOpen != null && (
                      <span style={{ color: s.daysToOpen <= 7 ? "#fca5a5" : "var(--text-muted)" }}>
                        🎯 {s.daysToOpen}d
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Phase matrix */}
          <PhaseMatrix rows={detail.phaseMatrix} />
        </>
      )}
    </div>
  );
}
