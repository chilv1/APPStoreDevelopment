// Server Component — fetches data on the server and streams the rendered table to the
// client. No client-side fetch waterfall, no useState/useEffect, no extra JS to hydrate
// for the table. Only the print button stays as a tiny client island.
//
// Win vs the previous client-only version:
//   - Data is in the initial HTML response → no spinner flash, no /api/stores round trip.
//   - Less JS to parse: the table rendering logic runs once on the server.
//   - Locale comes from the cookie (same source as the rest of the app), so SSR matches
//     the user's preference without hydration reconciliation.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStoresForUser } from "@/lib/queries/stores";
import { getServerDict } from "@/lib/i18n/server";
import { formatDate, STATUS_COLORS, getStatusLabel } from "@/lib/utils";
import PrintButton from "./PrintButton";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user as any;

  const { t, locale, intlCode } = await getServerDict();
  const stores = await getStoresForUser(user);

  const totalPhases = stores.reduce((s, st) => s + (st.phases?.length || 0), 0);
  const completedPhases = stores.reduce(
    (s, st) => s + (st.phases?.filter((p: any) => p.status === "COMPLETED").length || 0),
    0
  );
  const avgProgress =
    stores.length > 0 ? Math.round(stores.reduce((s, st) => s + st.progress, 0) / stores.length) : 0;

  const getBranch = (s: any) => s.bc?.branch?.name || s.region || t.reportsPage.notAssignedBranch;
  const storesByRegion = stores.reduce((acc, s) => {
    const key = getBranch(s);
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
            {t.reportsPage.title}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {t.reportsPage.subtitle.replace("{n}", String(stores.length))}
          </p>
        </div>
        <PrintButton label={t.reportsPage.print} />
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { icon: "🏪", label: t.reportsPage.statTotalProjects, value: String(stores.length), color: "#3b82f6" },
          { icon: "✅", label: t.reportsPage.statCompletedPhases, value: `${completedPhases}/${totalPhases}`, color: "#10b981" },
          { icon: "📊", label: t.reportsPage.statAvgProgress, value: `${avgProgress}%`, color: "#8b5cf6" },
          { icon: "🚀", label: t.reportsPage.statOpened, value: String(stores.filter((s) => s.status === "COMPLETED").length), color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} className="stat-card">
            <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* By Region */}
      {(Object.entries(storesByRegion) as [string, any[]][]).map(([region, regionStores]) => (
        <div key={region} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", marginBottom: 16 }}>
            {t.reportsPage.regionHeader.replace("{name}", region)}
            <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 10, fontWeight: 400 }}>
              {t.reportsPage.regionSummary
                .replace("{n}", String(regionStores.length))
                .replace(
                  "{p}",
                  String(
                    Math.round(
                      regionStores.reduce((s: number, st: any) => s + st.progress, 0) / regionStores.length
                    )
                  )
                )}
            </span>
          </h2>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.reportsPage.tableProjectCode}</th>
                  <th>{t.reportsPage.tableStoreName}</th>
                  <th>{t.reportsPage.tablePM}</th>
                  <th>{t.reportsPage.tableStatus}</th>
                  <th>{t.reportsPage.tableProgress}</th>
                  <th>{t.reportsPage.tableActivePhase}</th>
                  <th>{t.reportsPage.tableTargetOpen}</th>
                </tr>
              </thead>
              <tbody>
                {regionStores.map((store: any) => {
                  const activePhase = store.phases?.find((p: any) => p.status === "IN_PROGRESS");
                  return (
                    <tr key={store.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{store.code}</td>
                      <td style={{ color: "#f0f4ff", fontWeight: 500 }}>{store.name}</td>
                      <td>{store.pm?.name || "—"}</td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[store.status]}`}>
                          {getStatusLabel(store.status, locale)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className="progress-bar-fill" style={{ width: `${store.progress}%` }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#f0f4ff" }}>{store.progress}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {activePhase
                          ? t.reportsPage.activePhaseFmt
                              .replace("{n}", String(activePhase.phaseNumber))
                              .replace("{name}", activePhase.name)
                          : "—"}
                      </td>
                      <td style={{ fontSize: 13 }}>{formatDate(store.targetOpenDate, intlCode)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {stores.length === 0 && (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontSize: 14 }}>
          {t.reportsPage.emptyProjects}
        </div>
      )}
    </div>
  );
}
