"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function CreateStoreModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: session } = useSession();
  const [form, setForm] = useState({
    name: "", code: "", address: "", businessCenterId: "",
    targetOpenDate: "", budget: "", latitude: "", longitude: "", notes: "",
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/branches").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setBranches(list);
      if (list.length > 0) {
        setSelectedBranchId(list[0].id);
        if (list[0].businessCenters?.length > 0) setForm(f => ({ ...f, businessCenterId: list[0].businessCenters[0].id }));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget:    form.budget    ? Number(form.budget)    : null,
          latitude:  form.latitude  ? Number(form.latitude)  : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          businessCenterId: form.businessCenterId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Lỗi tạo cửa hàng");
      }

      onCreated();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff" }}>🏪 Tạo Cửa Hàng Mới</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Tên cửa hàng *
              </label>
              <input className="input" required placeholder="VD: Cửa Hàng Quận 3 - Lý Tự Trọng"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Mã dự án *
              </label>
              <input className="input" required placeholder="VD: HCM-Q3-003"
                value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Chi nhánh</label>
              <select className="input" value={selectedBranchId}
                onChange={e => {
                  setSelectedBranchId(e.target.value);
                  const branch = branches.find(b => b.id === e.target.value);
                  setForm(f => ({ ...f, businessCenterId: branch?.businessCenters?.[0]?.id || "" }));
                }}>
                <option value="">— Chọn chi nhánh —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Business Center</label>
              <select className="input" value={form.businessCenterId} onChange={e => setForm(f => ({ ...f, businessCenterId: e.target.value }))}>
                <option value="">— Chọn BC —</option>
                {(branches.find(b => b.id === selectedBranchId)?.businessCenters || []).map((bc: any) => (
                  <option key={bc.id} value={bc.id}>{bc.code} — {bc.name}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Địa chỉ *
              </label>
              <input className="input" required placeholder="Số nhà, đường, phường, quận, tỉnh/thành"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Ngày khai trương dự kiến
              </label>
              <input className="input" type="date"
                value={form.targetOpenDate} onChange={(e) => setForm({ ...form, targetOpenDate: e.target.value })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Ngân sách (VNĐ)
              </label>
              <input className="input" type="number" placeholder="VD: 800000000"
                value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Vĩ độ (Latitude)
              </label>
              <input className="input" type="number" step="any" placeholder="VD: 10.7769"
                value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Kinh độ (Longitude)
              </label>
              <input className="input" type="number" step="any" placeholder="VD: 106.7009"
                value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </div>

            {form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude)) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <a href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "var(--accent-blue)", textDecoration: "none" }}>
                  📍 {form.latitude}, {form.longitude} — Mở Google Maps ↗
                </a>
              </div>
            )}

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Ghi chú
              </label>
              <textarea className="input" placeholder="Thông tin bổ sung về dự án..." rows={3}
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ resize: "vertical" }} />
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8, padding: "10px 14px", marginTop: 16,
              color: "#fca5a5", fontSize: 13,
            }}>⚠️ {error}</div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "11px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}>
              Hủy
            </button>
            <button type="submit" disabled={loading} className="gradient-btn" style={{
              flex: 2, padding: "11px", borderRadius: 10, border: "none",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang tạo...</> : "✓ Tạo cửa hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
