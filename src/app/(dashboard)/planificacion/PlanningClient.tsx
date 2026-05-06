"use client";

import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n/context";
import WBSGrid from "@/components/planning/WBSGrid";
import GanttView from "@/components/planning/GanttView";
import ResourcesView from "@/components/planning/ResourcesView";
import CalendarView from "@/components/planning/CalendarView";
import VarianceView from "@/components/planning/VarianceView";
import PhaseDrawer from "@/components/planning/PhaseDrawer";
import type { PlanningStore, ScheduleResp, View } from "@/components/planning/types";

const VIEWS: View[] = ["wbs", "gantt", "variance", "resources", "calendar"];

export default function PlanningClient() {
  const t = useT();
  const [stores, setStores] = useState<PlanningStore[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [view, setView] = useState<View>("wbs");
  const [schedule, setSchedule] = useState<ScheduleResp | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputedAt, setRecomputedAt] = useState<number | null>(null);

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

  // Schedule fetch when store changes or after a mutation.
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    fetch(`/api/stores/${storeId}/schedule`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d) setSchedule(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeId, recomputedAt]);

  const activeStore = useMemo(() => stores.find((s) => s.id === storeId) ?? null, [stores, storeId]);
  const selectedPhase = useMemo(() => {
    if (!selectedPhaseId || !activeStore) return null;
    return activeStore.phases.find((p) => p.id === selectedPhaseId) ?? null;
  }, [activeStore, selectedPhaseId]);

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

        {/* View tabs */}
        <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(15,23,42,0.04)", borderRadius: 10, border: "1px solid var(--border)" }}>
          {VIEWS.map((v) => {
            const labels: Record<View, string> = {
              wbs: t.planning.viewWBS,
              gantt: t.planning.viewGantt,
              variance: "Variance",
              resources: t.planning.viewResources,
              calendar: t.planning.viewCalendar,
            };
            const icons: Record<View, string> = { wbs: "🧱", gantt: "📊", variance: "📈", resources: "👥", calendar: "📅" };
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

        {/* Right: critical path summary + recompute */}
        {schedule && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            {schedule.criticalPath.length > 0 && (
              <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", borderColor: "rgba(239,68,68,0.3)" }}>
                {t.planning.criticalPathBadge} · {schedule.criticalPath.length} {t.planning.phases}
              </span>
            )}
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t.planning.finishLabel}: <strong style={{ color: "var(--text-primary)" }}>{new Date(schedule.projectFinish).toLocaleDateString()}</strong>
            </span>
            <button
              className="gradient-btn"
              onClick={handleRecompute}
              disabled={recomputing || !storeId}
              style={{ padding: "8px 14px", borderRadius: 8, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {recomputing ? t.common.loading : `🔄 ${t.planning.recompute}`}
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      {!activeStore && !loading && (
        <div className="glass" style={{ borderRadius: 14, padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
          {t.planning.noProject}
        </div>
      )}

      {activeStore && view === "wbs" && (
        <WBSGrid
          store={activeStore}
          schedule={schedule}
          selectedPhaseId={selectedPhaseId}
          onSelectPhase={setSelectedPhaseId}
          onMutate={() => { setRecomputedAt(Date.now()); refreshStores(); }}
        />
      )}
      {activeStore && view === "gantt" && (
        <GanttView
          store={activeStore}
          schedule={schedule}
          selectedPhaseId={selectedPhaseId}
          onSelectPhase={setSelectedPhaseId}
          onMutate={() => { setRecomputedAt(Date.now()); refreshStores(); }}
        />
      )}
      {activeStore && view === "variance" && (
        <VarianceView storeId={activeStore.id} />
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
        phase={selectedPhase}
        store={activeStore}
        schedule={schedule}
        onClose={() => setSelectedPhaseId(null)}
        onMutate={() => { setRecomputedAt(Date.now()); refreshStores(); }}
      />
    </div>
  );
}
