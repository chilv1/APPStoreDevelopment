"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/context";
import MasterGanttView from "@/components/planning/MasterGanttView";
import ResourcesView from "@/components/planning/ResourcesView";
import CalendarView from "@/components/planning/CalendarView";
import VarianceView from "@/components/planning/VarianceView";
import CostView from "@/components/planning/CostView";
import SnapshotsPanel from "@/components/planning/SnapshotsPanel";
import AIPanel from "@/components/planning/AIPanel";
import ApprovalsPanel from "@/components/planning/ApprovalsPanel";
import ReportSchedulesPanel from "@/components/planning/ReportSchedulesPanel";
import PhaseDrawer from "@/components/planning/PhaseDrawer";
import type { PlanningStore, ScheduleResp, View } from "@/components/planning/types";

const VIEWS: View[] = ["gantt", "variance", "cost", "resources", "calendar"];

export default function PlanningClient() {
  const t = useT();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id ?? null;
  const [stores, setStores] = useState<PlanningStore[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [view, setView] = useState<View>("gantt");
  const [schedule, setSchedule] = useState<ScheduleResp | null>(null);
  const [schedulesByStore, setSchedulesByStore] = useState<Map<string, ScheduleResp>>(new Map());
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedStoreIdForPhase, setSelectedStoreIdForPhase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputedAt, setRecomputedAt] = useState<number | null>(null);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const refreshStores = () => {
    fetch("/api/planning?status=all&limit=200")
      .then((r) => r.json())
      .then((d) => setStores(d.stores ?? []))
      .catch(() => {});
  };

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/planning?status=all&limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setStores(d.stores ?? []);
        setStoreId((prev) => prev ?? d.stores?.[0]?.id ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // Schedule fetch for active store (used by single-store tabs + critical-path summary header).
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    fetch(`/api/stores/${storeId}/schedule`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (cancelled || !d) return;
        setSchedule(d);
        setSchedulesByStore((prev) => {
          const next = new Map(prev);
          next.set(storeId, d);
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeId, recomputedAt]);

  const requestSchedule = (sid: string) => {
    if (schedulesByStore.has(sid)) return;
    fetch(`/api/stores/${sid}/schedule`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setSchedulesByStore((prev) => {
          const next = new Map(prev);
          next.set(sid, d);
          return next;
        });
      })
      .catch(() => {});
  };

  const activeStore = useMemo(() => stores.find((s) => s.id === storeId) ?? null, [stores, storeId]);

  // Phase → store lookup spans ALL stores (for master Gantt selection).
  const selectedPhaseInfo = useMemo(() => {
    if (!selectedPhaseId) return { phase: null, store: null, schedule: null };
    const sid = selectedStoreIdForPhase;
    const store = sid ? stores.find((s) => s.id === sid) : stores.find((s) => s.phases.some((p) => p.id === selectedPhaseId));
    const phase = store?.phases.find((p) => p.id === selectedPhaseId) ?? null;
    const sched = store ? schedulesByStore.get(store.id) ?? null : null;
    return { phase, store: store ?? null, schedule: sched };
  }, [selectedPhaseId, selectedStoreIdForPhase, stores, schedulesByStore]);

  const handleRecompute = async () => {
    if (!storeId) return;
    setRecomputing(true);
    try {
      const r = await fetch(`/api/stores/${storeId}/schedule`, { method: "POST" });
      if (r.ok) setRecomputedAt(Date.now());
    } finally {
      setRecomputing(false);
    }
  };

  const isMasterView = view === "gantt";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
          🗂️ {t.planning.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t.planning.subtitle}</p>
      </div>

      {/* Controls row: project picker + view tabs + recompute */}
      <div className="glass" style={{ borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        {/* Tienda dropdown is hidden in master Gantt (shows all). Visible for variance/cost/recursos/calendario. */}
        {!isMasterView && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t.planning.pickProject}
            </label>
            <select
              className="input"
              style={{ minWidth: 320 }}
              value={storeId ?? ""}
              onChange={(e) => { setStoreId(e.target.value || null); setSelectedPhaseId(null); }}
              disabled={loading}
            >
              {loading && <option>{t.common.loadingData}</option>}
              {!loading && stores.length === 0 && <option>{t.planning.noProject}</option>}
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
        )}
        {isMasterView && !loading && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Master Gantt</span>
            <span>· {stores.length} tiendas</span>
          </div>
        )}

        {/* View tabs */}
        <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(15,23,42,0.04)", borderRadius: 10, border: "1px solid var(--border)" }}>
          {VIEWS.map((v) => {
            const labels: Record<View, string> = {
              gantt: t.planning.viewGantt,
              variance: "Variance",
              cost: "Cost",
              resources: t.planning.viewResources,
              calendar: t.planning.viewCalendar,
            };
            const icons: Record<View, string> = { gantt: "📊", variance: "📈", cost: "💰", resources: "👥", calendar: "📅" };
            const active = view === v;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? "var(--gradient-brand)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                {icons[v]} {labels[v]}
              </button>
            );
          })}
        </div>

        {/* Right: action buttons. Critical-path badge only relevant in single-store views. */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          {!isMasterView && schedule && schedule.criticalPath.length > 0 && (
            <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", borderColor: "rgba(239,68,68,0.3)" }}>
              {t.planning.criticalPathBadge} · {schedule.criticalPath.length} {t.planning.phases}
            </span>
          )}
          {!isMasterView && schedule && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t.planning.finishLabel}: <strong style={{ color: "var(--text-primary)" }}>{new Date(schedule.projectFinish).toLocaleDateString()}</strong>
            </span>
          )}
          <button
            onClick={() => setApprovalsOpen(true)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)", color: "#92400e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            📥 Approvals
          </button>
          <button
            onClick={() => setReportsOpen(true)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            📧 Reports
          </button>
          <button
            onClick={() => setAiOpen(true)}
            disabled={!storeId}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.05)", color: "#1d4ed8", fontSize: 12, fontWeight: 600, cursor: storeId ? "pointer" : "not-allowed" }}
          >
            🤖 AI risks
          </button>
          <button
            onClick={() => setSnapshotsOpen(true)}
            disabled={!storeId}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: storeId ? "pointer" : "not-allowed" }}
          >
            📸 Snapshots
          </button>
          {!isMasterView && (
            <button
              className="gradient-btn"
              onClick={handleRecompute}
              disabled={recomputing || !storeId}
              style={{ padding: "8px 14px", borderRadius: 8, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {recomputing ? t.common.loading : `🔄 ${t.planning.recompute}`}
            </button>
          )}
        </div>
      </div>

      {/* Master Gantt: shows all stores at once. */}
      {view === "gantt" && !loading && stores.length > 0 && (
        <MasterGanttView
          stores={stores}
          selectedPhaseId={selectedPhaseId}
          onSelectPhase={(pid, sid) => {
            setSelectedPhaseId(pid);
            setSelectedStoreIdForPhase(sid);
            if (sid && sid !== storeId) setStoreId(sid);
          }}
          onMutate={() => { setRecomputedAt(Date.now()); refreshStores(); }}
          schedulesByStore={schedulesByStore}
          onRequestSchedule={requestSchedule}
          currentUserId={currentUserId}
        />
      )}

      {/* Single-store views need an active store. */}
      {!isMasterView && !activeStore && !loading && (
        <div className="glass" style={{ borderRadius: 14, padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
          {t.planning.noProject}
        </div>
      )}

      {activeStore && view === "variance" && (
        <VarianceView storeId={activeStore.id} />
      )}
      {activeStore && view === "cost" && (
        <CostView storeId={activeStore.id} />
      )}
      {activeStore && view === "resources" && (
        <ResourcesView storeId={activeStore.id} />
      )}
      {activeStore && view === "calendar" && (
        <CalendarView
          store={activeStore}
          schedule={schedule}
          selectedPhaseId={selectedPhaseId}
          onSelectPhase={setSelectedPhaseId}
        />
      )}

      {/* Phase detail drawer */}
      <PhaseDrawer
        phase={selectedPhaseInfo.phase}
        store={selectedPhaseInfo.store}
        schedule={selectedPhaseInfo.schedule}
        onClose={() => { setSelectedPhaseId(null); setSelectedStoreIdForPhase(null); }}
        onMutate={() => { setRecomputedAt(Date.now()); refreshStores(); }}
      />

      {/* Snapshots panel */}
      {snapshotsOpen && activeStore && (
        <SnapshotsPanel storeId={activeStore.id} onClose={() => setSnapshotsOpen(false)} />
      )}

      {/* AI risks panel */}
      {aiOpen && activeStore && (
        <AIPanel storeId={activeStore.id} onClose={() => setAiOpen(false)} onSelectPhase={(id) => setSelectedPhaseId(id)} />
      )}

      {/* Approvals panel — global, no store needed */}
      {approvalsOpen && (
        <ApprovalsPanel onClose={() => setApprovalsOpen(false)} />
      )}

      {/* Reports panel — global */}
      {reportsOpen && (
        <ReportSchedulesPanel onClose={() => setReportsOpen(false)} />
      )}
    </div>
  );
}
