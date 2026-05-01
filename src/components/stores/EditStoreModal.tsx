"use client";

import { useState, useEffect } from "react";

const REGIONS = ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng", "Biên Hòa", "Bình Dương"];
const STATUS_OPTIONS = [
  { value: "PLANNING",    label: "Lên kế hoạch" },
  { value: "IN_PROGRESS", label: "Đang thực hiện" },
  { value: "ON_HOLD",     label: "Tạm dừng" },
  { value: "COMPLETED",   label: "Đã khai trương" },
  { value: "CANCELLED",   label: "Đã huỷ" },
];

function toDateInput(val: string | null | undefined) {
  if (!val) return "";
  return new Date(val).toISOString().split("T")[0];
}

export default function EditStoreModal({
  store,
  onClose,
  onUpdated,
}: {
  store: any;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState({
    name:           store.name ?? "",
    address:        store.address ?? "",
    region:         store.region ?? "Hồ Chí Minh",
    status:         store.status ?? "PLANNING",
    targetOpenDate: toDateInput(store.targetOpenDate),
    actualOpenDate: toDateInput(store.actualOpenDate),
    budget:         store.budget != null ? String(store.budget) : "",
    latitude:       store.latitude  != null ? String(store.latitude)  : "",
    longitude:      store.longitude != null ? String(store.longitude) : "",
    pmId:           store.pmId ?? "",
    notes:          store.notes ?? "",
  });
  const [pmList, setPmList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((users) => setPmList(users.filter((u: any) => ["ADMIN", "AREA_MANAGER", "PM"].includes(u.role))))
      .catch(() => {});
  }, []);

  const set = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:           form.name,
          address:        form.address,
          region:         form.region,
          status:         form.status,
          budget:         form.budget !== "" ? Number(form.budget) : null,
          targetOpenDate: form.targetOpenDate || null,
          actualOpenDate: form.actualOpenDate || null,
          latitude:       form.latitude  !== "" ? Number(form.latitude)  : null,
          longitude:      form.longitude !== "" ? Number(form.longitude) : null,
          pmId:           form.pmId || null,
          notes:          form.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Lỗi cập nhật");
      }
      onUpdated();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
      {children}
    </label>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff" }}>✏️ Chỉnh Sửa Cửa Hàng</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Mã dự án — read-only */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px", marginBottom: 20, fontSize: 13, color: "var(--text-secondary)" }}>
          🔖 Mã dự án: <strong style={{ color: "#f0f4ff" }}>{store.code}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Tên cửa hàng */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>Tên cửa hàng *</Label>
              <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>

            {/* Địa chỉ */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>Địa chỉ</Label>
              <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Số nhà, đường, phường, quận, tỉnh/thành" />
            </div>

            {/* Vùng */}
            <div>
              <Label>Vùng / Tỉnh thành</Label>
              <select className="input" value={form.region} onChange={(e) => set("region", e.target.value)}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Trạng thái */}
            <div>
              <Label>Trạng thái</Label>
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* PM */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>PM phụ trách</Label>
              <select className="input" value={form.pmId} onChange={(e) => set("pmId", e.target.value)}>
                <option value="">— Chưa phân công —</option>
                {pmList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === "ADMIN" ? "Admin" : u.role === "AREA_MANAGER" ? "Quản lý vùng" : "PM"}) — {u.region || "Toàn quốc"}
                  </option>
                ))}
              </select>
            </div>

            {/* Ngân sách */}
            <div>
              <Label>Ngân sách (VNĐ)</Label>
              <input className="input" type="number" placeholder="VD: 800000000"
                value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            </div>

            {/* KH khai trương */}
            <div>
              <Label>Ngày khai trương dự kiến</Label>
              <input className="input" type="date" value={form.targetOpenDate} onChange={(e) => set("targetOpenDate", e.target.value)} />
            </div>

            {/* Thực tế khai trương */}
            <div>
              <Label>Ngày khai trương thực tế</Label>
              <input className="input" type="date" value={form.actualOpenDate} onChange={(e) => set("actualOpenDate", e.target.value)} />
            </div>

            {/* Toạ độ */}
            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <Label>Vĩ độ (Latitude)</Label>
                <input className="input" type="number" step="any" placeholder="VD: 10.7769"
                  value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
              </div>
              <div>
                <Label>Kinh độ (Longitude)</Label>
                <input className="input" type="number" step="any" placeholder="VD: 106.7009"
                  value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
              </div>
            </div>

            {/* Preview bản đồ nếu có toạ độ */}
            {form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude)) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Label>Xem trước vị trí</Label>
                <a
                  href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "var(--accent-blue)", textDecoration: "none" }}
                >
                  📍 {form.latitude}, {form.longitude} — Mở Google Maps ↗
                </a>
              </div>
            )}

            {/* Ghi chú */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>Ghi chú</Label>
              <textarea className="input" rows={3} style={{ resize: "vertical" }}
                placeholder="Thông tin bổ sung về dự án..."
                value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginTop: 16, color: "#fca5a5", fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "11px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}>Hủy</button>
            <button type="submit" disabled={loading} className="gradient-btn" style={{
              flex: 2, padding: "11px", borderRadius: 10, border: "none",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Đang lưu...</> : "✓ Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
