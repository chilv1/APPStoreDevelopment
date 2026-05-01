"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/utils";

const ROLES = ["ADMIN", "AREA_MANAGER", "PM", "SURVEY_STAFF"];

const emptyForm = { name: "", email: "", password: "", role: "SURVEY_STAFF", branchId: "" };

function UserModal({
  title, form, setForm, branches, onSubmit, onClose, loading, error, isEdit,
}: {
  title: string;
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  branches: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  loading: boolean;
  error: string;
  isEdit: boolean;
}) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={onSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Họ tên *</label>
              <input className="input" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Email *</label>
              <input className="input" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@telecom.vn" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Vai trò</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Chi nhánh phụ trách</label>
              <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="">— Không thuộc chi nhánh —</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {isEdit ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu mặc định"}
              </label>
              <input className="input" type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEdit ? "Nhập mật khẩu mới..." : "123456"} />
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8, padding: "10px 14px", marginTop: 12,
              color: "#fca5a5", fontSize: 13,
            }}>⚠️ {error}</div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "10px", borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
            }}>Hủy</button>
            <button type="submit" disabled={loading} className="gradient-btn" style={{
              flex: 2, padding: "10px", borderRadius: 8, border: "none",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{isEdit ? "Đang lưu..." : "Đang tạo..."}</>
                : isEdit ? "✓ Lưu thay đổi" : "✓ Tạo tài khoản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyForm, password: "123456" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      Promise.all([
        fetch("/api/users").then((r) => r.json()),
        fetch("/api/branches").then((r) => r.json()),
      ]).then(([usersData, branchesData]) => {
        setUsers(Array.isArray(usersData) ? usersData : []);
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setLoading(false);
      });
    }
  }, [currentUser]);

  if (currentUser?.role !== "ADMIN") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Chỉ Admin mới có quyền truy cập trang này</p>
    </div>
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) return;
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...createForm, branchId: createForm.branchId || null }),
    });
    if (res.ok) {
      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setShowCreate(false);
      setCreateForm({ ...emptyForm, password: "123456" });
    } else {
      const err = await res.json().catch(() => ({}));
      setCreateError(err.error || "Lỗi tạo tài khoản");
    }
    setCreating(false);
  };

  const openEdit = (u: any) => {
    setEditTarget(u);
    setEditForm({ name: u.name, email: u.email, password: "", role: u.role, branchId: u.branchId || "" });
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim()) return;
    setEditing(true);
    setEditError("");
    const payload: any = { name: editForm.name, email: editForm.email, role: editForm.role, branchId: editForm.branchId || null };
    if (editForm.password) payload.password = editForm.password;

    const res = await fetch(`/api/users/${editTarget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
      setEditTarget(null);
    } else {
      const err = await res.json().catch(() => ({}));
      setEditError(err.error || "Lỗi cập nhật");
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  const getBranchLabel = (u: any) => {
    if (u.branch) return `${u.branch.code} — ${u.branch.name}`;
    if (u.role === "ADMIN") return "Toàn hệ thống";
    return "—";
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>👥 Quản Lý User</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{users.length} tài khoản trong hệ thống</p>
        </div>
        <button onClick={() => { setCreateError(""); setShowCreate(true); }} className="gradient-btn" style={{
          padding: "10px 20px", borderRadius: 10, border: "none",
          color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>+ Thêm user mới</button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><div className="spinner" /></div>
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Chi nhánh phụ trách</th>
                <th style={{ width: 100, textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span style={{ color: "#f0f4ff", fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{u.email}</td>
                  <td><span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                  <td style={{ fontSize: 13, color: u.branch ? "#f0f4ff" : "var(--text-secondary)" }}>
                    {getBranchLabel(u)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => openEdit(u)} style={{
                        padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)",
                        background: "rgba(59,130,246,0.1)", color: "#93c5fd",
                        fontSize: 12, fontWeight: 500, cursor: "pointer",
                      }}>Sửa</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => setDeleteTarget(u)} style={{
                          padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)",
                          background: "rgba(239,68,68,0.1)", color: "#fca5a5",
                          fontSize: 12, fontWeight: 500, cursor: "pointer",
                        }}>Xóa</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <UserModal
          title="➕ Thêm User Mới"
          form={createForm}
          setForm={setCreateForm}
          branches={branches}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          loading={creating}
          error={createError}
          isEdit={false}
        />
      )}

      {editTarget && (
        <UserModal
          title={`✏️ Chỉnh sửa: ${editTarget.name}`}
          form={editForm}
          setForm={setEditForm}
          branches={branches}
          onSubmit={handleEdit}
          onClose={() => setEditTarget(null)}
          loading={editing}
          error={editError}
          isEdit={true}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f0f4ff", marginBottom: 12 }}>Xác nhận xóa tài khoản</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
              Bạn có chắc muốn xóa tài khoản <strong style={{ color: "#f0f4ff" }}>{deleteTarget.name}</strong> ({deleteTarget.email})?
              <br />Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                flex: 1, padding: "10px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
              }}>Hủy</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, padding: "10px", borderRadius: 8,
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                color: "#fca5a5", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {deleting ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Đang xóa...</> : "Xóa tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
