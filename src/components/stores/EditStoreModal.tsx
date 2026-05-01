"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n/types";

const STATUS_OPTIONS: { value: string; labelKey: keyof Dict["status"] }[] = [
  { value: "PLANNING",    labelKey: "planning" },
  { value: "IN_PROGRESS", labelKey: "inProgress" },
  { value: "ON_HOLD",     labelKey: "onHold" },
  { value: "COMPLETED",   labelKey: "completed" },
  { value: "CANCELLED",   labelKey: "cancelled" },
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
  const t = useT();
  const [form, setForm] = useState({
    name:             store.name ?? "",
    address:          store.address ?? "",
    status:           store.status ?? "PLANNING",
    targetOpenDate:   toDateInput(store.targetOpenDate),
    actualOpenDate:   toDateInput(store.actualOpenDate),
    budget:           store.budget != null ? String(store.budget) : "",
    latitude:         store.latitude  != null ? String(store.latitude)  : "",
    longitude:        store.longitude != null ? String(store.longitude) : "",
    pmId:             store.pmId ?? "",
    businessCenterId: store.businessCenterId ?? "",
    notes:            store.notes ?? "",
  });
  const [pmList, setPmList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState(store.bc?.branchId ?? store.bc?.branch?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((users) => setPmList(users.filter((u: any) => ["ADMIN", "AREA_MANAGER", "PM"].includes(u.role))))
      .catch(() => {});
    fetch("/api/branches")
      .then(r => r.json())
      .then(d => setBranches(Array.isArray(d) ? d : []))
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
          name:             form.name,
          address:          form.address,
          status:           form.status,
          budget:           form.budget !== "" ? Number(form.budget) : null,
          targetOpenDate:   form.targetOpenDate || null,
          actualOpenDate:   form.actualOpenDate || null,
          latitude:         form.latitude  !== "" ? Number(form.latitude)  : null,
          longitude:        form.longitude !== "" ? Number(form.longitude) : null,
          pmId:             form.pmId || null,
          businessCenterId: form.businessCenterId || null,
          notes:            form.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t.common.errorUpdate);
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

  const getRoleLabel = (role: string) => {
    if (role === "ADMIN") return t.role.admin;
    if (role === "AREA_MANAGER") return t.role.areaManager;
    if (role === "PM") return t.role.pm;
    if (role === "SURVEY_STAFF") return t.role.surveyStaff;
    return role;
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff" }}>{t.modal.editTitle}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Mã dự án — read-only */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px", marginBottom: 20, fontSize: 13, color: "var(--text-secondary)" }}>
          🔖 {t.modal.projectCode.replace(" *", "")}: <strong style={{ color: "#f0f4ff" }}>{store.code}</strong>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Tên cửa hàng */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>{t.modal.storeName}</Label>
              <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>

            {/* Địa chỉ */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>{t.modal.address.replace(" *", "")}</Label>
              <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder={t.modal.addressPh} />
            </div>

            {/* Chi nhánh */}
            <div>
              <Label>{t.modal.branch}</Label>
              <select className="input" value={selectedBranchId}
                onChange={e => {
                  setSelectedBranchId(e.target.value);
                  const br = branches.find(b => b.id === e.target.value);
                  set("businessCenterId", br?.businessCenters?.[0]?.id || "");
                }}>
                <option value="">{t.modal.selectBranch}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
              </select>
            </div>

            {/* Business Center */}
            <div>
              <Label>{t.modal.bc}</Label>
              <select className="input" value={form.businessCenterId} onChange={e => set("businessCenterId", e.target.value)}>
                <option value="">{t.modal.selectBC}</option>
                {(branches.find(b => b.id === selectedBranchId)?.businessCenters || []).map((bc: any) => (
                  <option key={bc.id} value={bc.id}>{bc.code} — {bc.name}</option>
                ))}
              </select>
            </div>

            {/* Trạng thái */}
            <div>
              <Label>{t.modal.editStatus}</Label>
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{t.status[s.labelKey]}</option>)}
              </select>
            </div>

            {/* PM */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>{t.modal.editPM}</Label>
              <select className="input" value={form.pmId} onChange={(e) => set("pmId", e.target.value)}>
                <option value="">— {t.common.notAssigned} —</option>
                {pmList.map((u) => {
                  const roleLabel = getRoleLabel(u.role);
                  const branchLabel = u.branch
                    ? `${u.branch.code} — ${u.branch.name}`
                    : u.role === "ADMIN" ? t.sidebar.admin : t.common.notAssigned;
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} ({roleLabel}) · {branchLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Ngân sách */}
            <div>
              <Label>{t.modal.budget}</Label>
              <input className="input" type="number" placeholder={t.modal.budgetPh}
                value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            </div>

            {/* KH khai trương */}
            <div>
              <Label>{t.modal.targetOpenAuto.replace("🔒 ", "").replace(" (automático)", "").replace(" (tự động)", "")}</Label>
              <input className="input" type="date" value={form.targetOpenDate} onChange={(e) => set("targetOpenDate", e.target.value)} />
            </div>

            {/* Thực tế khai trương */}
            <div>
              <Label>{t.modal.actualOpenDate}</Label>
              <input className="input" type="date" value={form.actualOpenDate} onChange={(e) => set("actualOpenDate", e.target.value)} />
            </div>

            {/* Toạ độ */}
            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <Label>{t.modal.latitude}</Label>
                <input className="input" type="number" step="any" placeholder={t.modal.latPh}
                  value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
              </div>
              <div>
                <Label>{t.modal.longitude}</Label>
                <input className="input" type="number" step="any" placeholder={t.modal.lngPh}
                  value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
              </div>
            </div>

            {/* Preview bản đồ nếu có toạ độ */}
            {form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude)) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <a
                  href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "var(--accent-blue)", textDecoration: "none" }}
                >
                  {t.modal.openMaps.replace("{lat}", form.latitude).replace("{lng}", form.longitude)}
                </a>
              </div>
            )}

            {/* Ghi chú */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>{t.modal.notesField}</Label>
              <textarea className="input" rows={3} style={{ resize: "vertical" }}
                placeholder={t.modal.notesPh}
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
            }}>{t.common.cancel}</button>
            <button type="submit" disabled={loading} className="gradient-btn" style={{
              flex: 2, padding: "11px", borderRadius: 10, border: "none",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{t.modal.saving}</> : t.modal.saveBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
