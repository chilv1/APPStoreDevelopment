"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/context";

const StoreMapClient = dynamic(() => import("@/components/map/StoreMapClient"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 520, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid var(--border)" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Cargando mapa...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const t = useT();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stores")
      .then(r => r.json())
      .then(data => { setStores(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const withCoords = stores.filter(s => s.latitude != null && s.longitude != null).length;
  const noCoords   = stores.length - withCoords;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t.mapPage.loadingData}</p>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
          {t.mapPage.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {t.mapPage.subtitle}
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: t.mapPage.statTotal, value: stores.length, color: "#3b82f6", icon: "🏪" },
          { label: t.mapPage.statWithCoords, value: withCoords, color: "#10b981", icon: "📍" },
          { label: t.mapPage.statNoCoords, value: noCoords, color: "#f59e0b", icon: "⚠️" },
          { label: t.mapPage.statBranches, value: new Set(stores.map(s => s.bc?.branch?.name || s.region || "—")).size, color: "#8b5cf6", icon: "🏢" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      {stores.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
          {t.mapPage.emptyStores}
        </div>
      ) : withCoords === 0 ? (
        <div style={{
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 14, padding: 40, textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fcd34d", marginBottom: 8 }}>
            {t.mapPage.noCoordsTitle}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {t.mapPage.noCoordsHint}
          </div>
        </div>
      ) : (
        <StoreMapClient stores={stores} />
      )}
    </div>
  );
}
