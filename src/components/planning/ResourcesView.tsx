"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";

interface Resource {
  id: string;
  name: string;
  kind: "WORK" | "MATERIAL" | "COST";
  email: string | null;
  group: string | null;
  maxUnits: number;
  standardRate: number;
  storeId: string | null;
  user: { id: string; name: string; role: string; region: string | null } | null;
  _count: { assignments: number };
}

interface Props { storeId: string }

const KIND_META: Record<string, { label: string; color: string; bg: string }> = {
  WORK:     { label: "Work",     color: "#1d4ed8", bg: "rgba(59,130,246,0.1)" },
  MATERIAL: { label: "Material", color: "#7c3aed", bg: "rgba(139,92,246,0.1)" },
  COST:     { label: "Cost",     color: "#92400e", bg: "rgba(245,158,11,0.1)" },
};

export default function ResourcesView({ storeId }: Props) {
  const t = useT();
  const [list, setList] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "WORK" as "WORK" | "MATERIAL" | "COST", maxUnits: 100, standardRate: 0, group: "" });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/resources?storeId=${storeId}`);
      if (r.ok) setList(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [storeId]);

  const create = async () => {
    if (!form.name.trim()) return;
    setAdding(true); setError(null);
    try {
      const r = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, storeId }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error ?? "Save failed");
      }
      setForm({ name: "", kind: "WORK", maxUnits: 100, standardRate: 0, group: "" });
      await load();
    } catch (e: any) { setError(String(e.message ?? e)); }
    finally { setAdding(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    const r = await fetch(`/api/resources/${id}`, { method: "DELETE" });
    if (r.ok) load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Add resource form */}
      <div className="glass" style={{ borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          + Add resource
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Civil crew / Architect / Generator" style={{ fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Kind</label>
            <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as any })} style={{ fontSize: 13 }}>
              <option value="WORK">Work</option>
              <option value="MATERIAL">Material</option>
              <option value="COST">Cost</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Max %</label>
            <input className="input" type="number" value={form.maxUnits} onChange={(e) => setForm({ ...form, maxUnits: Number(e.target.value) })} style={{ width: 80, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Rate / hr</label>
            <input className="input" type="number" value={form.standardRate} onChange={(e) => setForm({ ...form, standardRate: Number(e.target.value) })} style={{ width: 100, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Group</label>
            <input className="input" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} placeholder="(optional)" style={{ fontSize: 13, width: 140 }} />
          </div>
          <button className="gradient-btn" onClick={create} disabled={!form.name.trim() || adding} style={{ padding: "8px 16px", borderRadius: 6, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: adding ? "not-allowed" : "pointer" }}>
            {adding ? "..." : "+ Add"}
          </button>
        </div>
        {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>⚠ {error}</div>}
      </div>

      {/* Sheet */}
      <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>{t.common.loadingData}</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>👥 No resources yet — use the form above to add the first one.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th style={{ width: 100 }}>Kind</th>
                <th style={{ width: 90 }}>Max %</th>
                <th style={{ width: 110 }}>Rate / hr</th>
                <th style={{ width: 130 }}>Group</th>
                <th style={{ width: 110 }}>Assignments</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const m = KIND_META[r.kind];
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.user ? `${r.user.name} (${r.user.role})` : r.email ?? "—"}</div>
                    </td>
                    <td><span className="badge" style={{ background: m.bg, color: m.color, borderColor: "transparent" }}>{m.label}</span></td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.maxUnits}%</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>{r.standardRate.toLocaleString()}</td>
                    <td style={{ fontSize: 12 }}>{r.group ?? "—"}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r._count.assignments}</td>
                    <td>
                      <button onClick={() => remove(r.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
