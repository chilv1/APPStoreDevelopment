"use client";
// MilestonesTab — answers "Khi nào tất cả store hoàn thành phase X?"
// Three views: by Phase, by BC, by PM. Filters by branch/BC/PM apply to all views.
// Click a phase row → drill-down modal with clickable status filters.

import { useEffect, useMemo, useState } from "react";
import MilestonesDrillDown from "../components/MilestonesDrillDown";

type PhaseMilestone = {
  order: number;
  name: string;
  done: number; active: number; todo: number; late: number;
  earliestDone: string | null;
  latestPlanned: string | null;
  etaAllDone: string | null;
  atRiskCount: number;
  health: "green" | "yellow" | "red";
};
type BCMilestone = {
  id: string; code: string; name: string;
  branch: string; branchId: string | null;
  storeCount: number; avgProgress: number;
  milestones: Record<string, { done: number; total: number }>;
  eta: string | null;
  health: "green" | "yellow" | "red";
};
type PMMilestone = {
  id: string; name: string; email: string; branch: string;
  storeCount: number; avgProgress: number;
  activePhases: number; capacity: number; overdue: number;
  f6: { done: number; total: number };
  f8: { done: number; total: number };
  eta: string | null;
  status: "green" | "yellow" | "red";
};

type ApiResponse = {
  summary: {
    totalStores: number;
    f1Done: number; f6Done: number; f8Done: number; f13Done: number;
    bottleneckPhase: PhaseMilestone | null;
  };
  byPhase: PhaseMilestone[];
  byBC:    BCMilestone[];
  byPM:    PMMilestone[];
};

const STAR_PHASES = new Set([1, 6, 8, 13]); // milestones especially highlighted
const PHASE_QUESTIONS: Record<number, string> = {
  1:  "Khi nào tất cả vị trí xong?",
  2:  "Khi nào TTR duyệt xong tất cả?",
  3:  "Khi nào Legal duyệt xong tất cả?",
  4:  "Khi nào ký HĐ thuê xong tất cả?",
  5:  "Khi nào tất cả có code bán hàng?",
  6:  "⭐ Khi nào THUÊ XONG hết?",
  7:  "Khi nào tất cả store đã được khảo sát?",
  8:  "⭐ Khi nào XD XONG hết?",
  9:  "Khi nào nhân sự sẵn sàng hết?",
  10: "Khi nào TTR nhận bàn giao xong?",
  11: "Khi nào hoá đơn SUNAT xong?",
  12: "Khi nào có giấy phép tất cả?",
  13: "⭐ Khi nào TẤT CẢ KHAI TRƯƠNG?",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

const KPI = ({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) => (
  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px" }}>
    <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>{sub}</div>}
  </div>
);

const HEALTH_LABEL: Record<string, string> = { green: "🟢 ON-TRACK", yellow: "🟡 AT-RISK", red: "🔴 CRITICAL" };

export default function MilestonesTab() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"phase" | "bc" | "pm">("phase");
  const [branchId, setBranchId] = useState("");
  const [bcId, setBcId] = useState("");
  const [pmId, setPmId] = useState("");
  const [drillOrder, setDrillOrder] = useState<number | null>(null);

  // Lookup options for filter dropdowns (branches, BCs, PMs visible to this user)
  const [opts, setOpts] = useState<{ branches: any[]; bcs: any[]; pms: any[] }>({ branches: [], bcs: [], pms: [] });

  useEffect(() => {
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);
    if (bcId)     params.set("bcId", bcId);
    if (pmId)     params.set("pmId", pmId);
    setLoading(true);
    fetch(`/api/reports/milestones?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [branchId, bcId, pmId]);

  // Populate filter dropdowns from initial unfiltered fetch
  useEffect(() => {
    if (data) {
      const branches = Array.from(new Map(data.byBC.map((bc) => [bc.branchId, { id: bc.branchId, code: bc.branch }])).values()).filter((b) => b.id);
      const bcs = data.byBC.map((bc) => ({ id: bc.id, code: bc.code, name: bc.name }));
      const pms = data.byPM.map((pm) => ({ id: pm.id, name: pm.name }));
      setOpts({ branches, bcs, pms });
    }
  }, [data]);

  if (loading || !data) return (
    <div style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>
      <div className="spinner" style={{ margin: "0 auto 12px", width: 32, height: 32 }} />
      Đang tải Phase Milestones…
    </div>
  );

  const totalStores = data.summary.totalStores;

  return (
    <div>
      {/* Notice */}
      <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
        💡 <strong>Portfolio Milestones</strong>: Trả lời các câu hỏi "Khi nào tất cả {totalStores} stores hoàn thành phase X?" — thuê xong, vị trí xong, xây dựng xong, khai trương xong.
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
        <KPI label="Vị trí xong (F.1)"  value={`${data.summary.f1Done}/${totalStores}`} color="#3fb950" sub={data.byPhase[0]?.etaAllDone ? `ETA: ${fmtDate(data.byPhase[0].etaAllDone)}` : "—"} />
        <KPI label="Thuê xong (F.6)"    value={`${data.summary.f6Done}/${totalStores}`} color="#d29922" sub={`ETA: ${fmtDate(data.byPhase[5]?.etaAllDone ?? null)} ⚠`} />
        <KPI label="XD xong (F.8)"      value={`${data.summary.f8Done}/${totalStores}`} color="#f85149" sub={`ETA: ${fmtDate(data.byPhase[7]?.etaAllDone ?? null)} 🔴`} />
        <KPI label="Khai trương (F.13)" value={`${data.summary.f13Done}/${totalStores}`} color="#388bfd" sub={`ETA: ${fmtDate(data.byPhase[12]?.etaAllDone ?? null)}`} />
        <KPI label="Bottleneck"          value={data.summary.bottleneckPhase ? `F.${data.summary.bottleneckPhase.order}` : "—"} color="#a371f7" sub={data.summary.bottleneckPhase ? `${data.summary.bottleneckPhase.late} stores trễ` : "0 trễ"} />
      </div>

      {/* Filter row */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>FILTROS:</div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
            Branch
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)} style={{ padding: "4px 8px", fontSize: 12 }}>
              <option value="">Tất cả ({opts.branches.length})</option>
              {opts.branches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
            BC
            <select className="input" value={bcId} onChange={(e) => setBcId(e.target.value)} style={{ padding: "4px 8px", fontSize: 12 }}>
              <option value="">Tất cả ({opts.bcs.length})</option>
              {opts.bcs.map((bc) => <option key={bc.id} value={bc.id}>{bc.code}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
            PM
            <select className="input" value={pmId} onChange={(e) => setPmId(e.target.value)} style={{ padding: "4px 8px", fontSize: 12 }}>
              <option value="">Tất cả ({opts.pms.length})</option>
              {opts.pms.map((pm) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
            </select>
          </label>
          <button
            onClick={() => { setBranchId(""); setBcId(""); setPmId(""); }}
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "4px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}
          >↺ Reset</button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 0, background: "rgba(15,23,42,.03)", borderRadius: 6, padding: 3, width: "fit-content" }}>
        {([
          ["phase", "📅 By Phase (across portfolio)"],
          ["bc",    "🏢 By BC (Business Center)"],
          ["pm",    "👤 By PM (Project Manager)"],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} style={{
            background: view === k ? "#388bfd" : "transparent",
            border: "none", color: view === k ? "#fff" : "var(--text-secondary)",
            padding: "6px 14px", fontSize: 11, cursor: "pointer", borderRadius: 4, fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      {/* Tables */}
      {view === "phase" && <PhaseTable data={data.byPhase} onClick={setDrillOrder} />}
      {view === "bc"    && <BCTableView data={data.byBC} />}
      {view === "pm"    && <PMTableView data={data.byPM} />}

      {/* Drill-down modal */}
      {drillOrder !== null && (
        <MilestonesDrillDown
          order={drillOrder}
          phaseName={data.byPhase.find((p) => p.order === drillOrder)?.name ?? ""}
          question={PHASE_QUESTIONS[drillOrder] ?? ""}
          branchId={branchId} bcId={bcId} pmId={pmId}
          onClose={() => setDrillOrder(null)}
        />
      )}
    </div>
  );
}

// ---------------- Phase view ----------------
function PhaseTable({ data, onClick }: { data: PhaseMilestone[]; onClick: (order: number) => void }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginTop: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📅 Milestone Timeline — When will each phase be done across the portfolio?</h3>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 14 }}>💡 <strong>Click vào hàng phase</strong> để xem list stores đang ở phase đó. ETA = forecast khi nào store cuối cùng xong.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(15,23,42,0.03)" }}>
              <Th w={50}>Phase</Th>
              <Th w={300}>Câu hỏi quản lý</Th>
              <Th w={70}>✓ Done</Th>
              <Th w={70}>▶ Active</Th>
              <Th w={70}>○ Todo</Th>
              <Th w={110}>Earliest</Th>
              <Th w={110}>Latest planned</Th>
              <Th w={120}>ETA all done</Th>
              <Th>At-risk</Th>
              <Th w={110}>Health</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => {
              const isStarred = STAR_PHASES.has(p.order);
              const etaColor = p.health === "green" ? "#3fb950" : p.health === "yellow" ? "#d29922" : "#f85149";
              return (
                <tr key={p.order}
                  onClick={() => onClick(p.order)}
                  style={{ cursor: "pointer", background: isStarred ? "rgba(56,139,253,.04)" : "transparent", borderBottom: "1px solid rgba(15,23,42,0.04)" }}
                >
                  <Td><strong>F.{p.order}</strong></Td>
                  <Td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{PHASE_QUESTIONS[p.order]}</div>
                  </Td>
                  <Td><span style={{ color: "#3fb950", fontWeight: 700 }}>{p.done}</span></Td>
                  <Td><span style={{ color: "#388bfd", fontWeight: 700 }}>{p.active}</span></Td>
                  <Td><span style={{ color: "var(--text-secondary)" }}>{p.todo}</span></Td>
                  <Td>{fmtDate(p.earliestDone)}</Td>
                  <Td>{fmtDate(p.latestPlanned)}</Td>
                  <Td><span style={{ color: etaColor, fontWeight: 600 }}>{fmtDate(p.etaAllDone)}</span></Td>
                  <Td>{p.atRiskCount > 0
                    ? <span style={{ background: "rgba(248,81,73,.15)", color: "#f85149", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{p.atRiskCount} stores ▸</span>
                    : <span style={{ color: "#3fb950", fontWeight: 600 }}>0</span>}</Td>
                  <Td>{HEALTH_LABEL[p.health]}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- BC view ----------------
function BCTableView({ data }: { data: BCMilestone[] }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginTop: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>🏢 Phase Milestones theo Business Center</h3>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 14 }}>Mỗi hàng = 1 BC. Cột F.1/F.6/F.8/F.13 hiện trạng thái cụ thể.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(15,23,42,0.03)" }}>
              <Th>BC</Th><Th>Branch</Th><Th>Stores</Th><Th>Avg Progress</Th>
              <Th>F.1 Vị trí</Th><Th>F.6 Thuê</Th><Th>F.8 XD</Th><Th>F.13 Mở</Th>
              <Th>ETA all open</Th><Th>Health</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((bc) => (
              <tr key={bc.id} style={{ borderBottom: "1px solid rgba(15,23,42,0.04)" }}>
                <Td><span style={{ background: "rgba(56,139,253,.15)", color: "#388bfd", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{bc.code}</span></Td>
                <Td>{bc.branch}</Td>
                <Td><strong>{bc.storeCount}</strong></Td>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 6, background: "rgba(15,23,42,.05)", borderRadius: 3, overflow: "hidden", maxWidth: 100 }}>
                      <div style={{ width: `${bc.avgProgress}%`, height: "100%", background: "#3fb950" }} />
                    </div>
                    <span>{bc.avgProgress}%</span>
                  </div>
                </Td>
                <Td>{bc.milestones.f1.done}/{bc.milestones.f1.total}{bc.milestones.f1.done === bc.milestones.f1.total ? " ✓" : ""}</Td>
                <Td>{bc.milestones.f6.done}/{bc.milestones.f6.total}</Td>
                <Td>{bc.milestones.f8.done}/{bc.milestones.f8.total}</Td>
                <Td>{bc.milestones.f13.done}/{bc.milestones.f13.total}</Td>
                <Td>{fmtDate(bc.eta)}</Td>
                <Td>{HEALTH_LABEL[bc.health]}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- PM view ----------------
function PMTableView({ data }: { data: PMMilestone[] }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginTop: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>👤 Phase Milestones theo Project Manager (Workload)</h3>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 14 }}>Mỗi hàng = 1 PM. Capacity % = active phases / 5 (soft limit).</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(15,23,42,0.03)" }}>
              <Th>PM</Th><Th>Branch</Th><Th>Stores</Th><Th>Progress</Th>
              <Th>Active</Th><Th>Capacity</Th><Th>Overdue</Th>
              <Th>F.6 Thuê</Th><Th>F.8 XD</Th><Th>ETA all open</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => {
              const capColor = p.capacity > 100 ? "#f85149" : p.capacity > 80 ? "#d29922" : "#3fb950";
              const statusLabel = p.status === "green" ? "🟢 OK" : p.status === "yellow" ? "🟡 BUSY" : "🔴 OVERLOAD";
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(15,23,42,0.04)" }}>
                  <Td><strong>{p.name}</strong></Td>
                  <Td>{p.branch}</Td>
                  <Td>{p.storeCount}</Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 6, background: "rgba(15,23,42,.05)", borderRadius: 3, overflow: "hidden", maxWidth: 80 }}>
                        <div style={{ width: `${p.avgProgress}%`, height: "100%", background: "#3fb950" }} />
                      </div>
                      <span>{p.avgProgress}%</span>
                    </div>
                  </Td>
                  <Td><strong>{p.activePhases}</strong></Td>
                  <Td><span style={{ color: capColor, fontWeight: 700 }}>{p.capacity}%</span></Td>
                  <Td>{p.overdue > 5
                    ? <span style={{ color: "#f85149", fontWeight: 700 }}>{p.overdue}</span>
                    : p.overdue > 0 ? <span style={{ color: "#d29922" }}>{p.overdue}</span> : <span style={{ color: "#3fb950" }}>0</span>}</Td>
                  <Td>{p.f6.done}/{p.f6.total}</Td>
                  <Td>{p.f8.done}/{p.f8.total}</Td>
                  <Td>{fmtDate(p.eta)}</Td>
                  <Td>{statusLabel}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Th = ({ children, w }: { children: React.ReactNode; w?: number }) => (
  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", width: w }}>{children}</th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{children}</td>
);
