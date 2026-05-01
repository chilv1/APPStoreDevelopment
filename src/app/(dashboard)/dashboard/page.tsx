"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate, getStatusLabel, STATUS_COLORS } from "@/lib/utils";
import { useT, useLocale } from "@/lib/i18n/context";

interface DashboardData {
  totalStores: number;
  statusCounts: Record<string, number>;
  regionProgress: Record<string, { total: number; progress: number }>;
  overdueStores: number;
  overdueTasks: number;
  avgProgress: number;
  recentActivities: any[];
  stores: any[];
}

export default function DashboardPage() {
  const t = useT();
  const { locale, intlCode } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    // Poll every 30 seconds for real-time feel
    const interval = setInterval(() => {
      fetch("/api/dashboard").then((r) => r.json()).then(setData);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t.common.loadingData}</p>
    </div>
  );

  if (!data) return null;

  const statusData = [
    { key: "PLANNING",    label: t.status.planning,   color: "#6b7280", icon: "📋" },
    { key: "IN_PROGRESS", label: t.status.inProgress, color: "#3b82f6", icon: "🔄" },
    { key: "COMPLETED",   label: t.status.completed,  color: "#10b981", icon: "✅" },
    { key: "ON_HOLD",     label: t.status.onHold,     color: "#f59e0b", icon: "⏸️" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
          📊 {t.dashboard.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {t.dashboard.subtitle}
        </p>
      </div>

      {/* Alert if overdue */}
      {(data.overdueStores > 0 || data.overdueTasks > 0) && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 12, padding: "14px 20px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ color: "#fca5a5", fontWeight: 600, fontSize: 14 }}>{t.dashboard.overdueAlertTitle}</div>
            <div style={{ color: "#f87171", fontSize: 13, marginTop: 2 }}>
              {data.overdueStores > 0 && `${t.dashboard.overdueStores.replace("{n}", String(data.overdueStores))} `}
              {data.overdueTasks > 0 && `• ${t.dashboard.overdueTasks.replace("{n}", String(data.overdueTasks))}`}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard icon="🏪" label={t.dashboard.statTotal}        value={data.totalStores} color="#3b82f6" />
        <StatCard icon="🔄" label={t.dashboard.statInProgress}   value={data.statusCounts["IN_PROGRESS"] || 0} color="#8b5cf6" />
        <StatCard icon="✅" label={t.dashboard.statCompleted}    value={data.statusCounts["COMPLETED"] || 0}  color="#10b981" />
        <StatCard icon="⏸️" label={t.dashboard.statOnHold}       value={data.statusCounts["ON_HOLD"] || 0}    color="#f59e0b" />
        <StatCard icon="📈" label={t.dashboard.statAvgProgress}  value={`${data.avgProgress}%`}              color="#f59e0b" />
      </div>

      {/* Main content grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 20 }}>
        {/* Store List */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff" }}>{t.dashboard.storeListTitle}</h2>
            <Link href="/stores" style={{ fontSize: 13, color: "var(--accent-blue)", textDecoration: "none" }}>{t.common.seeAll} →</Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.dashboard.tableStore}</th>
                  <th>{t.dashboard.tableBranch}</th>
                  <th>{t.dashboard.tableStatus}</th>
                  <th>{t.dashboard.tableProgress}</th>
                  <th>{t.dashboard.tableTargetOpen}</th>
                </tr>
              </thead>
              <tbody>
                {data.stores.slice(0, 8).map((store) => (
                  <tr key={store.id}>
                    <td>
                      <Link href={`/stores/${store.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontWeight: 600, color: "#f0f4ff", fontSize: 13 }}>{store.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{store.code}</div>
                      </Link>
                    </td>
                    <td>
                      <span style={{ fontSize: 13 }}>{store.bc ? `${store.bc.branch?.name || ""}` : store.region || "—"}</span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[store.status]}`}>
                        {getStatusLabel(store.status, locale)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-bar-fill" style={{ width: `${store.progress}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 30 }}>
                          {store.progress}%
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{formatDate(store.targetOpenDate, intlCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff" }}>{t.dashboard.activityFeedTitle}</h2>
          </div>
          <div style={{ padding: "8px 16px", maxHeight: 380, overflowY: "auto" }}>
            {data.recentActivities.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, padding: 16, textAlign: "center" }}>{t.dashboard.noActivity}</p>
            ) : data.recentActivities.map((act: any, i: number) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" style={{ background: "#3b82f6" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ color: "#f0f4ff", fontWeight: 600 }}>{act.user?.name || "System"}</span>
                    {" "}{act.details}
                  </div>
                  {act.store && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      📍 {act.store.name}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(act.createdAt).toLocaleString(intlCode)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status breakdown + Region Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Status cards */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 16 }}>{t.dashboard.statusBreakdownTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {statusData.map((s) => (
              <div key={s.key} style={{
                background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}30`,
                borderRadius: 10, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>
                  {data.statusCounts[s.key] || 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Region Progress */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 16 }}>{t.dashboard.branchProgressTitle}</h2>
          {Object.entries(data.regionProgress).length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{t.common.noData}</p>
          ) : Object.entries(data.regionProgress).map(([region, info]) => (
            <div key={region} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#f0f4ff" }}>{region}</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {t.dashboard.branchAvg.replace("{n}", String(info.total)).replace("{p}", String(Math.round(info.progress / info.total)))}
                </span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-bar-fill" style={{ width: `${Math.round(info.progress / info.total)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18,
        }}>{icon}</div>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#f0f4ff", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</div>
    </div>
  );
}
