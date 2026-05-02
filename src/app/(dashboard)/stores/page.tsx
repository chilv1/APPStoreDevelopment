"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatDate, getStatusLabel, STATUS_COLORS } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useT, useLocale } from "@/lib/i18n/context";

// Lazy-load: only fetched when the user actually clicks "+ Crear tienda".
const CreateStoreModal = dynamic(() => import("@/components/stores/CreateStoreModal"), { ssr: false });

export default function StoresPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const t = useT();
  const { locale, intlCode } = useLocale();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const fetchStores = () => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => { setStores(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { fetchStores(); }, []);

  const getBranchLabel = (s: any) => s.bc?.branch?.name || s.region || "—";
  const regions = [...new Set(stores.map(getBranchLabel))];
  const filtered = stores.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchRegion = filterRegion === "all" || getBranchLabel(s) === filterRegion;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchRegion && matchStatus;
  });

  const canCreate = ["ADMIN", "AREA_MANAGER"].includes(user?.role);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>{t.storesList.title}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {t.storesList.subtitle.replace("{n}", String(stores.length))}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="gradient-btn"
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {t.storesList.createButton}
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder={t.storesList.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <select className="input" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="all">{t.storesList.filterAllBranch}</option>
          {regions.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="all">{t.storesList.filterAllStatus}</option>
          <option value="PLANNING">{t.status.planning}</option>
          <option value="IN_PROGRESS">{t.status.inProgress}</option>
          <option value="COMPLETED">{t.status.completed}</option>
          <option value="ON_HOLD">{t.status.onHold}</option>
        </select>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", alignSelf: "center", marginLeft: "auto" }}>
          {filtered.length}/{stores.length} {t.common.results}
        </div>
      </div>

      {/* Store Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {filtered.map((store) => (
            <StoreCard key={store.id} store={store} t={t} locale={locale} intlCode={intlCode} />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", paddingTop: 60, color: "var(--text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p>{t.storesList.emptyResult}</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateStoreModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchStores(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function StoreCard({ store, t, locale, intlCode }: { store: any; t: any; locale: any; intlCode: string }) {
  const activePhase = store.phases?.find((p: any) => p.status === "IN_PROGRESS");
  const completedPhases = store.phases?.filter((p: any) => p.status === "COMPLETED").length || 0;
  const issueCount = store._count?.issues || 0;

  return (
    <Link href={`/stores/${store.id}`} style={{ textDecoration: "none" }}>
      <div className="glass glass-hover" style={{ borderRadius: 14, padding: 20, cursor: "pointer", height: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f4ff", marginBottom: 4, lineHeight: 1.3 }}>
              {store.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{store.code}</div>
          </div>
          <span className={`badge ${STATUS_COLORS[store.status]}`}>
            {getStatusLabel(store.status, locale)}
          </span>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t.storesList.progressLabel.replace("{done}", String(completedPhases))}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: store.progress >= 80 ? "#10b981" : "#3b82f6" }}>
              {store.progress}%
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${store.progress}%` }} />
          </div>
        </div>

        {/* Active phase */}
        {activePhase && (
          <div style={{
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#f0f4ff",
          }}>
            {t.storesList.activePhase
              .replace("{n}", String(activePhase.phaseNumber))
              .replace("{name}", activePhase.name)}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {store.bc
              ? <span>🏢 <strong>{store.bc.branch?.code}</strong> · {store.bc.code}</span>
              : <span>📍 {store.region || "—"}</span>
            }
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {issueCount > 0 && (
              <span style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "2px 8px", borderRadius: 999 }}>
                {t.storesList.issuesCount.replace("{n}", String(issueCount))}
              </span>
            )}
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {store.pm ? `👤 ${store.pm.name}` : t.storesList.notAssignedPM}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
          {t.storesList.targetOpen.replace("{date}", formatDate(store.targetOpenDate, intlCode))}
        </div>
      </div>
    </Link>
  );
}
