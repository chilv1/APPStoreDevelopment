"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { DepRow, DepsResp, PlanningPhase, PlanningStore, ScheduleResp } from "./types";

interface Props {
  phase: PlanningPhase | null;
  store: PlanningStore | null;
  schedule: ScheduleResp | null;
  onClose: () => void;
  onMutate: () => void;
}

const DEP_TYPES = ["FS", "SS", "FF", "SF"] as const;

export default function PhaseDrawer({ phase, store, schedule, onClose, onMutate }: Props) {
  const t = useT();
  const [deps, setDeps] = useState<DepsResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newPredId, setNewPredId] = useState("");
  const [newType, setNewType] = useState<"FS" | "SS" | "FF" | "SF">("FS");
  const [newLag, setNewLag] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!phase) { setDeps(null); return; }
    setLoading(true);
    setError(null);
    fetch(`/api/phases/${phase.id}/dependencies`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d) => setDeps(d))
      .catch(() => setDeps(null))
      .finally(() => setLoading(false));
  }, [phase?.id]);

  if (!phase || !store) return null;

  const task = schedule?.tasks.find((tx) => tx.id === phase.id);
  const isCritical = schedule?.criticalPath.includes(phase.id) ?? false;

  const candidatePreds = store.phases.filter((p) => {
    if (p.id === phase.id) return false;
    if (deps?.predecessors.some((d) => d.predecessorId === p.id)) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!newPredId) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predecessorId: newPredId, successorId: phase.id, type: newType, lagDays: newLag }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error");
      setNewPredId(""); setNewLag(0); setNewType("FS");
      // reload deps
      const r2 = await fetch(`/api/phases/${phase.id}/dependencies`);
      if (r2.ok) setDeps(await r2.json());
      onMutate();
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (depId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/dependencies/${depId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      const r2 = await fetch(`/api/phases/${phase.id}/dependencies`);
      if (r2.ok) setDeps(await r2.json());
      onMutate();
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  };

  const handleUpdate = async (dep: DepRow, patch: Partial<DepRow>) => {
    try {
      const res = await fetch(`/api/dependencies/${dep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      const r2 = await fetch(`/api/phases/${phase.id}/dependencies`);
      if (r2.ok) setDeps(await r2.json());
      onMutate();
    } catch {}
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(15,23,42,0.25)",
          zIndex: 49,
          backdropFilter: "blur(2px)",
        }}
      />
      {/* Drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: 460,
          background: "#fff",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-12px 0 32px rgba(15,23,42,0.12)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          animation: "fadeIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              F.{phase.phaseNumber} · {t.planning.detailTitle}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>{phase.name}</h2>
            {isCritical && (
              <span className="badge" style={{ marginTop: 6, background: "rgba(239,68,68,0.1)", color: "#dc2626", borderColor: "rgba(239,68,68,0.3)" }}>
                {t.planning.criticalPathBadge}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "18px 22px" }}>
          {/* Dates section */}
          <section style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {t.planning.detailDates}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.planning.colStart}</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{phase.plannedStart ? new Date(phase.plannedStart).toLocaleDateString() : "—"}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.planning.colFinish}</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{phase.plannedEnd ? new Date(phase.plannedEnd).toLocaleDateString() : "—"}</div>
              </div>
              {task && (
                <>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.planning.durationLabel}</div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{task.duration} {t.planning.days}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.planning.floatLabel}</div>
                    <div style={{ color: task.totalFloat <= 0 ? "#dc2626" : "var(--text-primary)", fontWeight: 600 }}>{task.totalFloat}</div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Dependencies section */}
          <section>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {t.planning.detailDeps}
            </h3>

            {loading && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.common.loadingData}</div>}

            {!loading && deps && deps.predecessors.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 10 }}>{t.planning.noDeps}</div>
            )}

            {!loading && deps && deps.predecessors.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {deps.predecessors.map((d) => (
                  <div key={d.id} className="task-item" style={{ padding: 10, gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        F.{d.predecessor?.phaseNumber} {d.predecessor?.name}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                        <select
                          value={d.type}
                          onChange={(e) => handleUpdate(d, { type: e.target.value as "FS" | "SS" | "FF" | "SF" })}
                          style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", fontFamily: "monospace" }}
                        >
                          {DEP_TYPES.map((tt) => <option key={tt}>{tt}</option>)}
                        </select>
                        <input
                          type="number"
                          defaultValue={d.lagDays}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isNaN(n) && n !== d.lagDays) handleUpdate(d, { lagDays: n });
                          }}
                          style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", width: 64, fontVariantNumeric: "tabular-nums" }}
                          aria-label={t.planning.lagDays}
                        />
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.planning.days}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(d.id)}
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}
                    >
                      {t.planning.deleteEdge}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new */}
            <div className="task-item" style={{ flexDirection: "column", padding: 10, gap: 8, alignItems: "stretch" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t.planning.addPredecessor}
              </div>
              <select
                className="input"
                style={{ fontSize: 13 }}
                value={newPredId}
                onChange={(e) => setNewPredId(e.target.value)}
              >
                <option value="">—</option>
                {candidatePreds.map((p) => (
                  <option key={p.id} value={p.id}>F.{p.phaseNumber} {p.name}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <select className="input" value={newType} onChange={(e) => setNewType(e.target.value as "FS" | "SS" | "FF" | "SF")} style={{ flex: 1, fontSize: 13 }}>
                  <option value="FS">{t.planning.typeFS}</option>
                  <option value="SS">{t.planning.typeSS}</option>
                  <option value="FF">{t.planning.typeFF}</option>
                  <option value="SF">{t.planning.typeSF}</option>
                </select>
                <input
                  type="number"
                  className="input"
                  value={newLag}
                  onChange={(e) => setNewLag(Number(e.target.value))}
                  style={{ width: 100, fontSize: 13 }}
                  placeholder={t.planning.lagDays}
                />
              </div>
              {error && <div style={{ fontSize: 12, color: "#dc2626" }}>⚠ {error}</div>}
              <button
                className="gradient-btn"
                onClick={handleAdd}
                disabled={!newPredId || adding}
                style={{ padding: "8px 12px", borderRadius: 6, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: newPredId && !adding ? "pointer" : "not-allowed", opacity: newPredId && !adding ? 1 : 0.5 }}
              >
                {adding ? t.common.loading : t.planning.saveEdge}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
