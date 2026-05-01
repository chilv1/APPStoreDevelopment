"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = Math.min(1, Math.sqrt(a)); // clamp to avoid NaN from floating-point
  return R * 2 * Math.asin(c);
}

const STATUS_COLOR: Record<string, string> = {
  PLANNING:    "#6b7280",
  IN_PROGRESS: "#3b82f6",
  COMPLETED:   "#10b981",
  ON_HOLD:     "#f59e0b",
  CANCELLED:   "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  PLANNING:    "Lên kế hoạch",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED:   "Hoàn thành",
  ON_HOLD:     "Tạm dừng",
  CANCELLED:   "Đã huỷ",
};

function FitBounds({ stores }: { stores: any[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = stores.filter(s => s.latitude && s.longitude).map(s => [s.latitude, s.longitude] as [number, number]);
    if (coords.length === 1) { map.setView(coords[0], 14); return; }
    if (coords.length > 1) {
      const L = require("leaflet");
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }
  }, [stores]);
  return null;
}

export default function StoreMapClient({ stores }: { stores: any[] }) {
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [threshold, setThreshold] = useState(500);

  const getBranch = (s: any) => s.bc?.branch?.name || s.region || "—";
  const branches = Array.from(new Set(stores.map(getBranch))).sort();
  const withCoords = stores.filter(s => s.latitude != null && s.longitude != null && isFinite(s.latitude) && isFinite(s.longitude));
  const noCoords   = stores.filter(s => s.latitude == null || s.longitude == null);

  const filtered = withCoords.filter(s =>
    (filterStatus === "ALL" || s.status === filterStatus) &&
    (filterBranch === "ALL" || getBranch(s) === filterBranch)
  );

  // Proximity pairs — computed on ALL stores with coords, regardless of filter
  const proximityAlerts: { a: any; b: any; dist: number }[] = [];
  for (let i = 0; i < withCoords.length; i++) {
    for (let j = i + 1; j < withCoords.length; j++) {
      const d = haversine(withCoords[i].latitude, withCoords[i].longitude, withCoords[j].latitude, withCoords[j].longitude);
      if (d < threshold) proximityAlerts.push({ a: withCoords[i], b: withCoords[j], dist: Math.round(d) });
    }
  }
  proximityAlerts.sort((a, b) => a.dist - b.dist);

  // IDs of stores involved in any alert (for map highlight)
  const alertIds = new Set(proximityAlerts.flatMap(p => [p.a.id, p.b.id]));

  const center: [number, number] = withCoords.length > 0
    ? [withCoords.reduce((s, x) => s + x.latitude, 0) / withCoords.length,
       withCoords.reduce((s, x) => s + x.longitude, 0) / withCoords.length]
    : [16.047, 108.206];

  const inputStyle: React.CSSProperties = {
    padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.05)", color: "#f0f4ff", fontSize: 13, cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Lọc:</span>
        <select style={inputStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={inputStyle} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
          <option value="ALL">Tất cả chi nhánh</option>
          {branches.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-secondary)" }}>
          Hiển thị <strong style={{ color: "#f0f4ff" }}>{filtered.length}</strong> / {withCoords.length} cửa hàng có tọa độ
        </span>
      </div>

      {/* Map */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", height: 520 }}>
        <MapContainer center={center} zoom={withCoords.length > 0 ? 6 : 5} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds stores={filtered} />
          {filtered.map(store => {
            const isAlert = alertIds.has(store.id);
            return (
              <CircleMarker
                key={store.id}
                center={[store.latitude, store.longitude]}
                radius={isAlert ? 14 : 11}
                pathOptions={{
                  color: isAlert ? "#ef4444" : (STATUS_COLOR[store.status] || "#6b7280"),
                  fillColor: STATUS_COLOR[store.status] || "#6b7280",
                  fillOpacity: 0.85,
                  weight: isAlert ? 3 : 2,
                  dashArray: isAlert ? "4 2" : undefined,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    {isAlert && (
                      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 8px", marginBottom: 8, fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
                        ⚠️ Trong vùng cảnh báo gần {threshold}m
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{store.name}</div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>{store.code} · {getBranch(store)}</div>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>📍 {store.address}</div>
                    {store.pm && <div style={{ fontSize: 12, marginBottom: 4 }}>👤 PM: {store.pm.name}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{
                        background: STATUS_COLOR[store.status] + "33",
                        color: STATUS_COLOR[store.status],
                        border: `1px solid ${STATUS_COLOR[store.status]}55`,
                        borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                      }}>
                        {STATUS_LABEL[store.status]}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{store.progress}%</span>
                    </div>
                    <a href={`/stores/${store.id}`} style={{
                      display: "block", textAlign: "center", padding: "5px 10px",
                      background: "#3b82f6", color: "#fff", borderRadius: 6, fontSize: 12,
                      textDecoration: "none", fontWeight: 500,
                    }}>
                      Xem chi tiết →
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: STATUS_COLOR[k] }} />
            {v}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px dashed #ef4444", background: "transparent" }} />
          Cảnh báo gần
        </div>
      </div>

      {/* Bottom panels */}
      <div style={{ display: "grid", gridTemplateColumns: noCoords.length > 0 ? "1fr 1fr" : "1fr", gap: 16 }}>

        {/* Proximity alerts — always visible */}
        <div style={{
          background: proximityAlerts.length > 0 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.04)",
          border: `1px solid ${proximityAlerts.length > 0 ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.2)"}`,
          borderRadius: 12, padding: 16,
        }}>
          {/* Header with threshold slider */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: proximityAlerts.length > 0 ? "#fca5a5" : "#6ee7b7", margin: 0 }}>
              {proximityAlerts.length > 0 ? `⚠️ Cảnh báo quá gần (${proximityAlerts.length} cặp)` : "✓ Không có cửa hàng nào quá gần"}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
              <span>Ngưỡng:</span>
              <input
                type="range" min={100} max={2000} step={50} value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                style={{ width: 100, accentColor: "#3b82f6", cursor: "pointer" }}
              />
              <span style={{ color: "#f0f4ff", fontWeight: 600, minWidth: 50 }}>{threshold}m</span>
            </div>
          </div>

          {proximityAlerts.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              Đã kiểm tra {withCoords.length} cửa hàng — không có cặp nào trong phạm vi {threshold}m.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {proximityAlerts.map((p, i) => (
                <div key={i} style={{
                  background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "10px 12px",
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600, color: "#f0f4ff", marginBottom: 3 }}>
                    {p.a.name} ↔ {p.b.name}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#fca5a5" }}>
                      Khoảng cách: <strong>{p.dist}m</strong>
                    </span>
                    <div style={{
                      height: 4, width: 80, borderRadius: 2,
                      background: `linear-gradient(to right, #ef4444 ${Math.round((p.dist / threshold) * 100)}%, rgba(255,255,255,0.1) 0%)`,
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {p.a.code} ({getBranch(p.a)}) · {p.b.code} ({getBranch(p.b)})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing coordinates */}
        {noCoords.length > 0 && (
          <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fcd34d", marginBottom: 12 }}>
              📍 Chưa có tọa độ ({noCoords.length} cửa hàng)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
              {noCoords.map(store => (
                <div key={store.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "rgba(245,158,11,0.06)", borderRadius: 8, padding: "8px 12px",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff" }}>{store.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{store.code} · {getBranch(store)}</div>
                  </div>
                  <Link href={`/stores/${store.id}`} style={{
                    fontSize: 12, color: "#f59e0b", textDecoration: "none",
                    padding: "4px 10px", border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: 6, whiteSpace: "nowrap",
                  }}>
                    Cập nhật →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
