"use client";
// Drill-down modal: click a phase row → opens this modal showing stores at that phase.
// Filter chips (All/Done/Active/Todo/Late) are clickable to refine the list.

import { useEffect, useState } from "react";

type StoreRow = {
  storeId: string;
  storeCode: string;
  storeName: string;
  bcCode: string;
  branchCode: string;
  pmName: string;
  status: "done" | "active" | "todo";
  late: boolean;
  lateDays: number;
  plannedEnd: string | null;
  actualEnd: string | null;
};

type ApiResponse = {
  rows: StoreRow[];
  counts: { all: number; done: number; active: number; todo: number; late: number };
};

interface Props {
  order: number;
  phaseName: string;
  question: string;
  branchId?: string;
  bcId?: string;
  pmId?: string;
  onClose: () => void;
}

type FilterKey = "all" | "done" | "active" | "todo" | "late";

const CHIPS: { key: FilterKey; label: string; bg: string; color: string }[] = [
  { key: "all",    label: "◐ Tất cả", bg: "rgba(56,139,253,.15)",  color: "#388bfd" },
  { key: "done",   label: "✓ Done",   bg: "rgba(63,185,80,.15)",   color: "#3fb950" },
  { key: "active", label: "▶ Active", bg: "rgba(56,139,253,.15)",  color: "#388bfd" },
  { key: "todo",   label: "○ Todo",   bg: "rgba(139,148,158,.15)", color: "#8b949e" },
  { key: "late",   label: "⚠ Late",   bg: "rgba(248,81,73,.15)",   color: "#f85149" },
];

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" });
  } catch { return "—"; }
}

export default function MilestonesDrillDown({ order, phaseName, question, branchId, bcId, pmId, onClose }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("order", String(order));
    params.set("filter", filter);
    if (branchId) params.set("branchId", branchId);
    if (bcId)     params.set("bcId", bcId);
    if (pmId)     params.set("pmId", pmId);
    setLoading(true);
    fetch(`/api/reports/milestones/stores?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [order, filter, branchId, bcId, pmId]);

  const exportLabel =
    filter === "all"  ? "tất cả" :
    filter === "late" ? `${data?.counts.late ?? 0} stores trễ` :
    `${data?.rows.length ?? 0} stores ${filter.toUpperCase()}`;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
    >
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 22, width: "min(900px, 95vw)", maxHeight: "92vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>F.{order} — {phaseName}</h3>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        {/* Question banner */}
        <div style={{ background: "rgba(56,139,253,.08)", border: "1px solid rgba(56,139,253,.2)", borderRadius: 6, padding: "8px 12px", fontSize: 12, marginBottom: 14 }}>
          📌 {question}
        </div>

        {/* Filter chips */}
        <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
          Filter (click để lọc):
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {CHIPS.map((c) => {
            const isActive = filter === c.key;
            const count = data?.counts[c.key] ?? 0;
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                style={{
                  background: isActive ? c.color : c.bg,
                  color: isActive ? "#000" : c.color,
                  border: `1px solid ${isActive ? c.color : "transparent"}`,
                  boxShadow: isActive ? `0 0 0 2px ${c.color}` : "none",
                  padding: "5px 12px", borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}
              >
                {c.label}: {count}
              </button>
            );
          })}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-secondary)" }}>
            Hiển thị <strong style={{ color: "var(--text-primary)" }}>{data?.rows.length ?? 0}</strong>/{data?.counts.all ?? 0} stores
          </span>
        </div>

        {/* Stores table */}
        <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>
              <div className="spinner" style={{ margin: "0 auto 8px" }} /> Đang tải…
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>Không có store nào phù hợp</div>
          ) : (
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)" }}>
                <tr>
                  <Th>Store</Th><Th>BC</Th><Th>Branch</Th><Th>PM</Th><Th>Status</Th>
                  <Th>Planned end</Th><Th>Actual</Th><Th>Variance</Th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((s) => {
                  const stTag = s.status === "done"
                    ? <span style={{ background: "rgba(63,185,80,.15)", color: "#3fb950", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>✓ DONE</span>
                    : s.status === "active"
                    ? <span style={{ background: "rgba(56,139,253,.15)", color: "#388bfd", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>▶ ACTIVE</span>
                    : <span style={{ background: "rgba(139,148,158,.15)", color: "#8b949e", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>○ TODO</span>;
                  const varTag = s.late
                    ? <span style={{ background: "rgba(248,81,73,.15)", color: "#f85149", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>+{s.lateDays}d ⚠</span>
                    : s.status === "done"
                    ? <span style={{ background: "rgba(63,185,80,.15)", color: "#3fb950", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>on time</span>
                    : <span style={{ color: "var(--text-secondary)" }}>—</span>;
                  return (
                    <tr key={s.storeId} style={{ borderBottom: "1px solid rgba(15,23,42,0.04)" }}>
                      <Td><strong>{s.storeCode}</strong></Td>
                      <Td>{s.bcCode}</Td>
                      <Td>{s.branchCode}</Td>
                      <Td>{s.pmName}</Td>
                      <Td>{stTag}</Td>
                      <Td>{fmtDate(s.plannedEnd)}</Td>
                      <Td>{fmtDate(s.actualEnd)}</Td>
                      <Td>{varTag}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
          <button
            onClick={() => exportCSV(data?.rows ?? [], `phase-F${order}-${filter}.csv`)}
            disabled={!data || data.rows.length === 0}
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "6px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
          >📥 Export CSV ({exportLabel})</button>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-secondary)" }}>💡 Click chip ở trên để đổi filter</span>
        </div>
      </div>
    </div>
  );
}

function exportCSV(rows: StoreRow[], filename: string) {
  if (!rows.length) return;
  const headers = ["Store Code", "Store Name", "BC", "Branch", "PM", "Status", "Planned End", "Actual End", "Late Days"];
  const data = rows.map((r) => [
    r.storeCode, `"${r.storeName.replace(/"/g, '""')}"`, r.bcCode, r.branchCode, r.pmName,
    r.status, r.plannedEnd ?? "", r.actualEnd ?? "", r.lateDays,
  ]);
  const csv = "﻿" + [headers, ...data].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 9, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{children}</th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{children}</td>
);
