"use client";

import { useEffect, useState } from "react";
import { formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";

export default function ReportsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stores").then((r) => r.json()).then((d) => { setStores(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const totalPhases = stores.reduce((s, st) => s + (st.phases?.length || 0), 0);
  const completedPhases = stores.reduce((s, st) => s + (st.phases?.filter((p: any) => p.status === "COMPLETED").length || 0), 0);
  const avgProgress = stores.length > 0 ? Math.round(stores.reduce((s, st) => s + st.progress, 0) / stores.length) : 0;

  const storesByRegion = stores.reduce((acc, s) => {
    if (!acc[s.region]) acc[s.region] = [];
    acc[s.region].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>📈 Báo Cáo Tiến Độ</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Tổng hợp {stores.length} dự án cửa hàng</p>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 20px", borderRadius: 10, cursor: "pointer",
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 500,
          }}>
          🖨️ In báo cáo
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { icon: "🏪", label: "Tổng dự án", value: stores.length, color: "#3b82f6" },
          { icon: "✅", label: "Giai đoạn hoàn thành", value: `${completedPhases}/${totalPhases}`, color: "#10b981" },
          { icon: "📊", label: "Tiến độ trung bình", value: `${avgProgress}%`, color: "#8b5cf6" },
          { icon: "🚀", label: "Đã khai trương", value: stores.filter(s => s.status === "COMPLETED").length, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} className="stat-card">
            <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* By Region */}
      {Object.entries(storesByRegion).map(([region, regionStores]) => (
        <div key={region} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", marginBottom: 16 }}>
            📍 Vùng: {region}
            <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 10, fontWeight: 400 }}>
              {regionStores.length} cửa hàng · TB {Math.round(regionStores.reduce((s: number, st: any) => s + st.progress, 0) / regionStores.length)}%
            </span>
          </h2>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã dự án</th>
                  <th>Tên cửa hàng</th>
                  <th>PM phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Tiến độ</th>
                  <th>Giai đoạn hiện tại</th>
                  <th>KH khai trương</th>
                </tr>
              </thead>
              <tbody>
                {(regionStores as any[]).map((store: any) => {
                  const activePhase = store.phases?.find((p: any) => p.status === "IN_PROGRESS");
                  return (
                    <tr key={store.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{store.code}</td>
                      <td style={{ color: "#f0f4ff", fontWeight: 500 }}>{store.name}</td>
                      <td>{store.pm?.name || "—"}</td>
                      <td><span className={`badge ${STATUS_COLORS[store.status]}`}>{STATUS_LABELS[store.status]}</span></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className="progress-bar-fill" style={{ width: `${store.progress}%` }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#f0f4ff" }}>{store.progress}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {activePhase ? `GĐ ${activePhase.phaseNumber}: ${activePhase.name}` : "—"}
                      </td>
                      <td style={{ fontSize: 13 }}>{formatDate(store.targetOpenDate)}</td>
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
          Chưa có dự án nào
        </div>
      )}
    </div>
  );
}
