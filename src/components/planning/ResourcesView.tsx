"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";

interface Resource {
  user: { id: string; name: string; email: string; role: string; region: string | null };
  total: number;
  active: number;
  done: number;
  utilization: number;
  tasks: { id: string; status: string; phase: { name: string; phaseNumber: number } }[];
}

interface Props {
  storeId: string;
}

function utilizationColor(u: number): string {
  if (u >= 60) return "#ef4444";
  if (u >= 30) return "#f59e0b";
  if (u >= 1)  return "#10b981";
  return "#94a3b8";
}

export default function ResourcesView({ storeId }: Props) {
  const t = useT();
  const [data, setData] = useState<{ rows: Resource[]; totalActive: number; totalAssignments: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/planning/resources?storeId=${storeId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId]);

  if (loading) {
    return (
      <div className="glass" style={{ borderRadius: 14, padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
        {t.common.loadingData}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="glass" style={{ borderRadius: 14, padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
        👥 No hay recursos asignados a este proyecto todavía
      </div>
    );
  }

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 24, fontSize: 12, color: "var(--text-secondary)" }}>
          <div><strong style={{ fontSize: 16, color: "var(--text-primary)" }}>{data.rows.length}</strong> resources</div>
          <div><strong style={{ fontSize: 16, color: "var(--text-primary)" }}>{data.totalActive}</strong> active</div>
          <div><strong style={{ fontSize: 16, color: "var(--text-primary)" }}>{data.totalAssignments}</strong> total assignments</div>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th style={{ width: 120 }}>Role</th>
            <th style={{ width: 130 }}>Region</th>
            <th style={{ width: 90 }}>Active</th>
            <th style={{ width: 90 }}>Done</th>
            <th style={{ width: 220 }}>Utilization</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.user.id}>
              <td>
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.user.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.user.email}</div>
              </td>
              <td>
                <span className="badge" style={{ background: "rgba(59,130,246,0.1)", color: "#1d4ed8", borderColor: "rgba(59,130,246,0.3)" }}>{r.user.role}</span>
              </td>
              <td style={{ fontSize: 12 }}>{r.user.region ?? "—"}</td>
              <td style={{ fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{r.active}</td>
              <td style={{ color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{r.done}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 8, background: "rgba(15,23,42,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, r.utilization)}%`, height: "100%", background: utilizationColor(r.utilization), borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {r.utilization}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
