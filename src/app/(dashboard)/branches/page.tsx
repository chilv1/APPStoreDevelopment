"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type BC = { id: string; name: string; code: string; description?: string; address?: string; _count: { stores: number } };
type Branch = { id: string; name: string; code: string; description?: string; businessCenters: BC[]; _count: { users: number } };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)",
  color: "#f0f4ff", fontSize: 13,
};
const Label = ({ children }: { children: React.ReactNode }) => (
  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 5 }}>{children}</label>
);

export default function BranchesPage() {
  const { data: session } = useSession();
  const user = (session?.user as any);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Branch modal
  const [branchModal, setBranchModal] = useState<{ open: boolean; edit?: Branch }>({ open: false });
  const [branchForm, setBranchForm] = useState({ name: "", code: "", description: "" });
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchError, setBranchError] = useState("");

  // BC modal
  const [bcModal, setBcModal] = useState<{ open: boolean; branchId?: string; edit?: BC }>({ open: false });
  const [bcForm, setBcForm] = useState({ name: "", code: "", description: "", address: "", branchId: "" });
  const [bcSaving, setBcSaving] = useState(false);
  const [bcError, setBcError] = useState("");

  const load = () =>
    fetch("/api/branches").then(r => r.json()).then(d => { setBranches(Array.isArray(d) ? d : []); setLoading(false); });

  useEffect(() => { load(); }, []);

  const isAdmin = user?.role === "ADMIN";
  const totalStores = branches.reduce((s, b) => s + b.businessCenters.reduce((ss, bc) => ss + bc._count.stores, 0), 0);
  const totalBCs    = branches.reduce((s, b) => s + b.businessCenters.length, 0);

  // --- Branch CRUD ---
  const openCreateBranch = () => { setBranchForm({ name: "", code: "", description: "" }); setBranchError(""); setBranchModal({ open: true }); };
  const openEditBranch   = (b: Branch) => { setBranchForm({ name: b.name, code: b.code, description: b.description || "" }); setBranchError(""); setBranchModal({ open: true, edit: b }); };

  const saveBranch = async (e: React.FormEvent) => {
    e.preventDefault(); setBranchSaving(true); setBranchError("");
    try {
      const url    = branchModal.edit ? `/api/branches/${branchModal.edit.id}` : "/api/branches";
      const method = branchModal.edit ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(branchForm) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Lỗi"); }
      await load();
      setBranchModal({ open: false });
    } catch (e: any) { setBranchError(e.message); }
    setBranchSaving(false);
  };

  const deleteBranch = async (id: string, name: string) => {
    if (!confirm(`Xoá chi nhánh "${name}"?`)) return;
    const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); alert(e.error); return; }
    await load();
  };

  // --- BC CRUD ---
  const openCreateBC = (branchId: string) => { setBcForm({ name: "", code: "", description: "", address: "", branchId }); setBcError(""); setBcModal({ open: true, branchId }); };
  const openEditBC   = (bc: BC, branchId: string) => { setBcForm({ name: bc.name, code: bc.code, description: bc.description || "", address: bc.address || "", branchId }); setBcError(""); setBcModal({ open: true, branchId, edit: bc }); };

  const saveBC = async (e: React.FormEvent) => {
    e.preventDefault(); setBcSaving(true); setBcError("");
    try {
      const url    = bcModal.edit ? `/api/business-centers/${bcModal.edit.id}` : "/api/business-centers";
      const method = bcModal.edit ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(bcForm) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Lỗi"); }
      await load();
      setBcModal({ open: false });
    } catch (e: any) { setBcError(e.message); }
    setBcSaving(false);
  };

  const deleteBC = async (id: string, name: string) => {
    if (!confirm(`Xoá Business Center "${name}"?`)) return;
    const res = await fetch(`/api/business-centers/${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); alert(e.error); return; }
    await load();
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Đang tải...</p>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>🏢 Chi Nhánh & Business Center</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Quản lý cấu trúc tổ chức mạng lưới cửa hàng</p>
        </div>
        {isAdmin && (
          <button onClick={openCreateBranch} className="gradient-btn" style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>+ Tạo chi nhánh</button>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Chi nhánh", value: branches.length, color: "#8b5cf6", icon: "🏢" },
          { label: "Business Center", value: totalBCs, color: "#3b82f6", icon: "🏪" },
          { label: "Cửa hàng", value: totalStores, color: "#10b981", icon: "🏬" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Branch list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {branches.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
            <div style={{ marginBottom: 6 }}>Chưa có chi nhánh nào.</div>
            {isAdmin && <div style={{ fontSize: 13 }}>Nhấn "+ Tạo chi nhánh" để bắt đầu.</div>}
          </div>
        ) : branches.map(branch => (
          <div key={branch.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            {/* Branch header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "rgba(139,92,246,0.06)" }}>
              <span style={{
                background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", color: "#fff",
                borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 800, letterSpacing: 1,
              }}>{branch.code}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff" }}>{branch.name}</div>
                {branch.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{branch.description}</div>}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 8 }}>
                {branch.businessCenters.length} BC · {branch.businessCenters.reduce((s, bc) => s + bc._count.stores, 0)} cửa hàng
              </div>
              {isAdmin && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openCreateBC(branch.id)} style={{
                    padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(59,130,246,0.4)",
                    background: "rgba(59,130,246,0.1)", color: "#60a5fa", fontSize: 12, cursor: "pointer",
                  }}>+ BC</button>
                  <button onClick={() => openEditBranch(branch)} style={{
                    padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)",
                    background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                  }}>✏️</button>
                  <button onClick={() => deleteBranch(branch.id, branch.name)} style={{
                    padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontSize: 12, cursor: "pointer",
                  }}>🗑️</button>
                </div>
              )}
            </div>

            {/* BC list */}
            {branch.businessCenters.length === 0 ? (
              <div style={{ padding: "16px 20px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
                Chưa có Business Center. {isAdmin && 'Nhấn "+ BC" để thêm.'}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 1, padding: 1, background: "var(--border)" }}>
                {branch.businessCenters.map(bc => (
                  <div key={bc.id} style={{ background: "var(--bg-card)", padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{
                            background: "rgba(59,130,246,0.15)", color: "#60a5fa",
                            border: "1px solid rgba(59,130,246,0.3)",
                            borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                          }}>{bc.code}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff" }}>{bc.name}</div>
                        {bc.address && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {bc.address}</div>}
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                          🏬 {bc._count.stores} cửa hàng
                        </div>
                      </div>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 4, marginLeft: 8, flexShrink: 0 }}>
                          <button onClick={() => openEditBC(bc, branch.id)} style={{
                            padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)",
                            background: "transparent", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                          }}>✏️</button>
                          <button onClick={() => deleteBC(bc.id, bc.name)} style={{
                            padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)",
                            background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontSize: 11, cursor: "pointer",
                          }}>🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Branch Modal */}
      {branchModal.open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBranchModal({ open: false })}>
          <div className="modal-content" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>🏢 {branchModal.edit ? "Sửa" : "Tạo"} Chi Nhánh</h2>
              <button onClick={() => setBranchModal({ open: false })} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={saveBranch}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <Label>Tên chi nhánh *</Label>
                  <input style={inputStyle} required value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Chi Nhánh Hồ Chí Minh" />
                </div>
                <div>
                  <Label>Mã chi nhánh * (đúng 3 ký tự, VD: AMA)</Label>
                  <input style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}
                    required maxLength={3} value={branchForm.code}
                    onChange={e => setBranchForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="AMA" />
                </div>
                <div>
                  <Label>Mô tả</Label>
                  <input style={inputStyle} value={branchForm.description} onChange={e => setBranchForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả ngắn về chi nhánh..." />
                </div>
              </div>
              {branchError && <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 13 }}>⚠️ {branchError}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setBranchModal({ open: false })} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>Hủy</button>
                <button type="submit" disabled={branchSaving} className="gradient-btn" style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {branchSaving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Đang lưu...</> : "✓ Lưu chi nhánh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BC Modal */}
      {bcModal.open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBcModal({ open: false })}>
          <div className="modal-content" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>🏪 {bcModal.edit ? "Sửa" : "Tạo"} Business Center</h2>
              <button onClick={() => setBcModal({ open: false })} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={saveBC}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label>Tên Business Center *</Label>
                  <input style={inputStyle} required value={bcForm.name} onChange={e => setBcForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: BC Quận 1" />
                </div>
                <div>
                  <Label>Mã BC * (đúng 7 ký tự, VD: AMABC01)</Label>
                  <input style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}
                    required maxLength={7} value={bcForm.code}
                    onChange={e => setBcForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="AMABC01" />
                </div>
                <div>
                  <Label>Chi nhánh *</Label>
                  <select style={inputStyle} value={bcForm.branchId} onChange={e => setBcForm(f => ({ ...f, branchId: e.target.value }))}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label>Địa chỉ</Label>
                  <input style={inputStyle} value={bcForm.address} onChange={e => setBcForm(f => ({ ...f, address: e.target.value }))} placeholder="Địa chỉ BC..." />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label>Mô tả</Label>
                  <input style={inputStyle} value={bcForm.description} onChange={e => setBcForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả BC..." />
                </div>
              </div>
              {bcError && <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 13 }}>⚠️ {bcError}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setBcModal({ open: false })} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>Hủy</button>
                <button type="submit" disabled={bcSaving} className="gradient-btn" style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {bcSaving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Đang lưu...</> : "✓ Lưu Business Center"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
