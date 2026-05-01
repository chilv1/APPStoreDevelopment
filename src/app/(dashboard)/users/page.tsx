"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/utils";

const ROLES = ["ADMIN", "AREA_MANAGER", "PM", "SURVEY_STAFF"];
const REGIONS = ["Toàn quốc", "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng", "Biên Hòa", "Bình Dương"];

export default function UsersPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "123456", role: "SURVEY_STAFF", region: "Hồ Chí Minh" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetch("/api/users").then((r) => r.json()).then((d) => { setUsers(Array.isArray(d) ? d : []); setLoading(false); });
    }
  }, [user]);

  if (user?.role !== "ADMIN") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Chỉ Admin mới có quyền truy cập trang này</p>
    </div>
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setShowCreate(false);
      setForm({ name: "", email: "", password: "123456", role: "SURVEY_STAFF", region: "Hồ Chí Minh" });
    }
    setCreating(false);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>👥 Quản Lý User</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{users.length} tài khoản trong hệ thống</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="gradient-btn" style={{
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
                        fontSize: 12, fontWeight: 700, color: "#fff",
                      }}>
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span style={{ color: "#f0f4ff", fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{u.email}</td>
                  <td><span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                  <td style={{ fontSize: 13 }}>{u.region || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-content" onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>➕ Thêm User Mới</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Họ tên *</label>
                  <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Email *</label>
                  <input className="input" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@telecom.vn" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Vai trò</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Chi nhánh phụ trách</label>
                  <select className="input" value={form.region || ""} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                    {REGIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Mật khẩu mặc định</label>
                  <input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="123456" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{
                  flex: 1, padding: "10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
                }}>Hủy</button>
                <button type="submit" disabled={creating} className="gradient-btn" style={{
                  flex: 2, padding: "10px", borderRadius: 8, border: "none",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {creating ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Đang tạo...</> : "✓ Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
