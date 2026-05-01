"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/context";

export default function CreateStoreModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const { data: session } = useSession();
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [form, setForm] = useState({
    name: "", code: "", address: "", businessCenterId: "",
    projectStartDate: todayStr,
    budget: "", latitude: "", longitude: "", notes: "",
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalProjectDays, setTotalProjectDays] = useState<number | null>(null);

  // Compute targetOpenDate from projectStartDate + totalProjectDays (read-only, derived)
  // Parse YYYY-MM-DD as LOCAL date (not UTC) to avoid timezone-shift off-by-one bugs.
  const targetOpenDate = (() => {
    if (!form.projectStartDate || totalProjectDays == null) return "";
    const [yy, mo, dd] = form.projectStartDate.split("-").map(Number);
    if (!yy || !mo || !dd) return "";
    const d = new Date(yy, mo - 1, dd);
    d.setDate(d.getDate() + totalProjectDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  useEffect(() => {
    fetch("/api/branches").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setBranches(list);
      if (list.length > 0) {
        setSelectedBranchId(list[0].id);
        if (list[0].businessCenters?.length > 0) setForm(f => ({ ...f, businessCenterId: list[0].businessCenters[0].id }));
      }
    });

    // Fetch phase templates to compute total project days
    fetch("/api/phase-templates").then(r => r.json()).then(d => {
      if (!Array.isArray(d) || d.length === 0) return;
      const totalDays = d.reduce((sum: number, t: any) => sum + (Number(t.durationDays) || 0), 0);
      setTotalProjectDays(totalDays);
    }).catch(() => {});
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
          targetOpenDate,                     // computed from projectStartDate + totalDays
          budget:    form.budget    ? Number(form.budget)    : null,
          latitude:  form.latitude  ? Number(form.latitude)  : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          businessCenterId: form.businessCenterId || null,
        }),
      });

      if (!res.ok) {
        let msg = `${t.common.errorSave} (${res.status})`;
        try { const err = await res.json(); msg = err.error || err.message || msg; } catch {}
        throw new Error(msg);
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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff" }}>{t.modal.createTitle}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.storeName}
              </label>
              <input className="input" required placeholder={t.modal.storeNamePh}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.projectCode}
              </label>
              <input className="input" required placeholder={t.modal.projectCodePh}
                value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.branch}</label>
              <select className="input" value={selectedBranchId}
                onChange={e => {
                  setSelectedBranchId(e.target.value);
                  const branch = branches.find(b => b.id === e.target.value);
                  setForm(f => ({ ...f, businessCenterId: branch?.businessCenters?.[0]?.id || "" }));
                }}>
                <option value="">{t.modal.selectBranch}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{t.modal.bc}</label>
              <select className="input" value={form.businessCenterId} onChange={e => setForm(f => ({ ...f, businessCenterId: e.target.value }))}>
                <option value="">{t.modal.selectBC}</option>
                {(branches.find(b => b.id === selectedBranchId)?.businessCenters || []).map((bc: any) => (
                  <option key={bc.id} value={bc.id}>{bc.code} — {bc.name}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.address}
              </label>
              <input className="input" required placeholder={t.modal.addressPh}
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            {/* Project start date — admin chooses */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.projectStartDate}
              </label>
              <input className="input" type="date" required
                value={form.projectStartDate}
                onChange={(e) => setForm({ ...form, projectStartDate: e.target.value })} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {t.modal.projectStartHint}
              </div>
            </div>

            {/* Target opening date — auto-computed, READ ONLY */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.targetOpenAuto}
              </label>
              <input className="input" type="date" disabled readOnly tabIndex={-1}
                value={targetOpenDate}
                style={{
                  cursor: "not-allowed",
                  background: "rgba(59,130,246,0.06)",
                  borderColor: "rgba(59,130,246,0.25)",
                  color: "#93c5fd", fontWeight: 600,
                }} />
              {totalProjectDays != null ? (
                <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 4 }}>
                  {t.modal.targetOpenHintComputed
                    .replace("{days}", String(totalProjectDays))
                    .replace("{months}", String(Math.round(totalProjectDays / 30 * 10) / 10))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {t.modal.targetOpenHintLoading}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.budget}
              </label>
              <input className="input" type="number" placeholder={t.modal.budgetPh}
                value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.latitude}
              </label>
              <input className="input" type="number" step="any" placeholder={t.modal.latPh}
                value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.longitude}
              </label>
              <input className="input" type="number" step="any" placeholder={t.modal.lngPh}
                value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </div>

            {form.latitude && form.longitude && !isNaN(Number(form.latitude)) && !isNaN(Number(form.longitude)) && (
              <div style={{ gridColumn: "1 / -1" }}>
                <a href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "var(--accent-blue)", textDecoration: "none" }}>
                  {t.modal.openMaps.replace("{lat}", form.latitude).replace("{lng}", form.longitude)}
                </a>
              </div>
            )}

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {t.modal.notesField}
              </label>
              <textarea className="input" placeholder={t.modal.notesPh} rows={3}
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
              {t.common.cancel}
            </button>
            <button type="submit" disabled={loading} className="gradient-btn" style={{
              flex: 2, padding: "11px", borderRadius: 10, border: "none",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {t.modal.creating}</> : t.modal.createBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
