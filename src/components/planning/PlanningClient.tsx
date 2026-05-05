"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type {
  PlanningState, PlanTask, PlanResource, ApiStore,
  ViewMode, ZoomMode, DepType, RibbonTab,
} from "./types";
import Ribbon from "./Ribbon";
import WBSGrid from "./WBSGrid";
import GanttPane from "./GanttPane";
import DetailPane from "./DetailPane";
import ResourceSheet from "./views/ResourceSheet";
import CalendarView from "./views/CalendarView";
import NetworkDiagram from "./views/NetworkDiagram";
import TaskUsage from "./views/TaskUsage";
import AddTaskModal from "./AddTaskModal";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

const DAY = 86_400_000;

// ── REDUCER ──────────────────────────────────────────────────────────────────
type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "delete"; task: PlanTask };

type Action =
  | { type: "LOADED"; tasks: PlanTask[]; resources: PlanResource[] }
  | { type: "SET_VIEW"; view: ViewMode }
  | { type: "SET_ZOOM"; zoom: ZoomMode }
  | { type: "SET_RIBBON"; tab: RibbonTab }
  | { type: "SELECT"; id: string | null }
  | { type: "TOGGLE_EXPAND"; id: string }
  | { type: "TOGGLE_CRITICAL" }
  | { type: "TOGGLE_BASELINE" }
  | { type: "TOGGLE_ARROWS" }
  | { type: "TOGGLE_DETAIL" }
  | { type: "SAVE_BASELINE" }
  | { type: "FILTER"; status: string }
  | { type: "SEARCH"; query: string }
  | { type: "CAL_OFFSET"; delta: number }
  | { type: "UPDATE_TASK"; id: string; patch: Partial<PlanTask> }
  | { type: "ADD_TASK"; task: PlanTask }
  | { type: "DELETE_TASK"; id: string }
  | { type: "SET_MODAL"; modal: ModalState }
  | { type: "NOTIF"; msg: string | null }
  | { type: "SET_SAVING"; saving: boolean };

interface State extends PlanningState {
  modal: ModalState;
}

const INIT: State = {
  tasks: [], resources: [],
  viewMode: "gantt", zoomMode: "week",
  selectedId: null, showCritical: true, showBaseline: false, showArrows: true,
  detailOpen: false, ribbonTab: "task",
  filterStatus: "active", searchQuery: "", calOffset: 0,
  loading: true, saving: false, notif: null,
  modal: { type: "none" },
};

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "LOADED":        return { ...s, tasks: a.tasks, resources: a.resources, loading: false };
    case "SET_VIEW":      return { ...s, viewMode: a.view };
    case "SET_ZOOM":      return { ...s, zoomMode: a.zoom };
    case "SET_RIBBON":    return { ...s, ribbonTab: a.tab };
    case "SELECT":        return { ...s, selectedId: a.id };
    case "TOGGLE_EXPAND": return { ...s, tasks: s.tasks.map(t => t.id === a.id ? { ...t, expanded: !t.expanded } : t) };
    case "TOGGLE_CRITICAL": return { ...s, showCritical: !s.showCritical };
    case "TOGGLE_BASELINE": return { ...s, showBaseline: !s.showBaseline };
    case "TOGGLE_ARROWS":   return { ...s, showArrows: !s.showArrows };
    case "TOGGLE_DETAIL":   return { ...s, detailOpen: !s.detailOpen };
    case "SAVE_BASELINE":   return {
      ...s,
      tasks: s.tasks.map(t => t.start && t.fin ? { ...t, baseline: { start: t.start, fin: t.fin } } : t),
      notif: "✅ Línea base guardada",
    };
    case "FILTER":        return { ...s, filterStatus: a.status, loading: true };
    case "SEARCH":        return { ...s, searchQuery: a.query };
    case "CAL_OFFSET":    return { ...s, calOffset: s.calOffset + a.delta };
    case "UPDATE_TASK":   return { ...s, tasks: s.tasks.map(t => t.id === a.id ? { ...t, ...a.patch } : t) };
    case "ADD_TASK":      return { ...s, tasks: [...s.tasks, a.task], modal: { type:"none" } };
    case "DELETE_TASK":   return {
      ...s,
      tasks: s.tasks.filter(t => t.id !== a.id),
      selectedId: s.selectedId === a.id ? null : s.selectedId,
      modal: { type:"none" },
    };
    case "SET_MODAL":     return { ...s, modal: a.modal };
    case "NOTIF":         return { ...s, notif: a.msg };
    case "SET_SAVING":    return { ...s, saving: a.saving };
    default:              return s;
  }
}

// ── SCHEDULE COMPUTATION ──────────────────────────────────────────────────────
function computeSchedule(tasks: PlanTask[]): PlanTask[] {
  const map      = new Map<string, { start: number; end: number }>();
  const visiting = new Set<string>(); // cycle detection

  function visit(t: PlanTask): { start: number; end: number } {
    if (map.has(t.id)) return map.get(t.id)!;
    if (visiting.has(t.id)) {
      // Cycle detected — break, use original dates as fallback
      const s = t.start ? t.start.getTime() : Date.now();
      return { start: s, end: s + Math.max(t.dur, 1) * DAY };
    }
    visiting.add(t.id);
    let startMs = t.start ? t.start.getTime() : Date.now();
    if (t.pred) {
      const pred = tasks.find(x => x.id === t.pred);
      if (pred) {
        const ps = visit(pred);
        const lagMs = (t.lag ?? 0) * DAY;
        if      (t.depType === "SS") startMs = ps.start + lagMs;
        else if (t.depType === "FF") startMs = ps.end   + lagMs - t.dur * DAY;
        else if (t.depType === "SF") startMs = ps.start + lagMs - t.dur * DAY;
        else                         startMs = ps.end   + lagMs;
      }
    }
    visiting.delete(t.id);
    const r = { start: startMs, end: startMs + Math.max(t.dur, 0) * DAY };
    map.set(t.id, r);
    return r;
  }

  tasks.filter(t => t.type !== "summary").forEach(t => visit(t));

  return tasks.map(t => {
    if (t.type === "summary") {
      const kids = tasks.filter(k => k.parentId === t.id && k.type !== "summary");
      const starts = kids.map(k => map.get(k.id)?.start).filter(Boolean) as number[];
      const ends   = kids.map(k => map.get(k.id)?.end).filter(Boolean) as number[];
      if (starts.length) {
        const s = Math.min(...starts), e = Math.max(...ends);
        return { ...t, start: new Date(s), fin: new Date(e), dur: Math.round((e - s) / DAY) };
      }
      return t;
    }
    const r = map.get(t.id);
    return r ? { ...t, start: new Date(r.start), fin: new Date(r.end) } : t;
  });
}

function markCritical(tasks: PlanTask[], enabled: boolean): PlanTask[] {
  if (!enabled) return tasks.map(t => ({ ...t, critical: false }));
  const storeIds = [...new Set(tasks.filter(t => t.type === "summary").map(t => t.id))];
  const criticalIds = new Set<string>();
  storeIds.forEach(sid => {
    const phaseTasks = tasks.filter(t => t.parentId === sid && !t.milestone);
    if (!phaseTasks.length) return;
    const maxEnd = Math.max(...phaseTasks.filter(t => t.fin).map(t => t.fin!.getTime()));
    phaseTasks.forEach(t => { if (t.fin && Math.abs(t.fin.getTime() - maxEnd) < DAY) criticalIds.add(t.id); });
    let changed = true;
    while (changed) {
      changed = false;
      tasks.filter(t => criticalIds.has(t.id) && t.pred && t.depType === "FS").forEach(t => {
        if (!criticalIds.has(t.pred!)) { criticalIds.add(t.pred!); changed = true; }
      });
    }
  });
  return tasks.map(t => ({ ...t, critical: criticalIds.has(t.id) }));
}

let _nextLocalId = 9000;
function localId() { return `local-${++_nextLocalId}`; }

function buildTasksFromStores(stores: ApiStore[]): PlanTask[] {
  const tasks: PlanTask[] = [];
  stores.forEach(store => {
    tasks.push({
      id: `s-${store.id}`, type: "summary",
      name: `${store.code} — ${store.name}`,
      dur: 0, start: null, fin: null,
      pred: null, depType: "FS", lag: 0,
      pct: store.progress, res: store.pm?.name ?? "",
      level: 0, parentId: null, status: store.status,
      critical: false, milestone: false, expanded: true,
      storeId: store.id, baseline: null,
    });
    store.phases.forEach(ph => {
      const isMilestone = /inaug|apertura|inicio oper/i.test(ph.name);
      tasks.push({
        id: ph.id, type: isMilestone ? "milestone" : "task",
        name: ph.name,
        dur: ph.plannedStart && ph.plannedEnd
          ? Math.max(1, Math.round((new Date(ph.plannedEnd).getTime() - new Date(ph.plannedStart).getTime()) / DAY))
          : 7,
        start: ph.plannedStart ? new Date(ph.plannedStart) : null,
        fin:   ph.plannedEnd   ? new Date(ph.plannedEnd)   : null,
        pred:  ph.dependsOnId ?? null,
        depType: (ph.dependencyType as DepType) ?? "FS",
        lag: ph.lagDays ?? 0,
        pct: ph.pct, res: "",
        level: 1, parentId: `s-${store.id}`,
        status: ph.status, critical: false,
        milestone: isMilestone, expanded: true,
        storeId: store.id, baseline: null, phaseId: ph.id,
      });
    });
  });
  return tasks;
}

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function PlanningClient() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (filterStatus: string) => {
    try {
      const res = await fetch(`/api/planning?status=${filterStatus}&limit=60`);
      const stores: ApiStore[] = await res.json();
      if (!Array.isArray(stores)) return;
      const raw = buildTasksFromStores(stores);
      const scheduled = computeSchedule(raw);
      const withCrit  = markCritical(scheduled, true);
      const resources: PlanResource[] = [
        { id:"r1", name:"PM Lima",        type:"Trabajo", group:"Gestión", units:"100%", rate:"$35/h", assignedTasks:0, overAllocated:false },
        { id:"r2", name:"PM Arequipa",    type:"Trabajo", group:"Gestión", units:"100%", rate:"$35/h", assignedTasks:0, overAllocated:false },
        { id:"r3", name:"Equipo Legal",   type:"Trabajo", group:"Legal",   units:"200%", rate:"$60/h", assignedTasks:0, overAllocated:true  },
        { id:"r4", name:"Equipo Técnico", type:"Trabajo", group:"Técnico", units:"300%", rate:"$25/h", assignedTasks:0, overAllocated:false },
        { id:"r5", name:"HR",             type:"Trabajo", group:"RRHH",    units:"100%", rate:"$30/h", assignedTasks:0, overAllocated:false },
        { id:"r6", name:"Constructor",    type:"Trabajo", group:"Obra",    units:"100%", rate:"$45/h", assignedTasks:0, overAllocated:true  },
      ];
      dispatch({ type:"LOADED", tasks: withCrit, resources });
    } catch {
      dispatch({ type:"NOTIF", msg:"❌ Error cargando datos del servidor" });
    }
  }, []);

  useEffect(() => { load(state.filterStatus); }, [state.filterStatus, load]);

  // Recompute schedule + critical path whenever tasks change
  const processedTasks = useMemo(() => {
    const scheduled = computeSchedule(state.tasks);
    return markCritical(scheduled, state.showCritical);
  }, [state.tasks, state.showCritical]);

  const visibleTasks = useMemo(() => {
    const q = state.searchQuery.toLowerCase();
    return processedTasks.filter(t => {
      if (t.parentId) {
        const par = processedTasks.find(p => p.id === t.parentId);
        if (!par?.expanded) return false;
      }
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [processedTasks, state.searchQuery]);

  // Auto-clear notifications
  useEffect(() => {
    if (!state.notif) return;
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => dispatch({ type:"NOTIF", msg:null }), 3500);
  }, [state.notif]);

  const notify = useCallback((msg: string) => dispatch({ type:"NOTIF", msg }), []);

  // ── UPDATE TASK — persists ALL fields to API ──────────────────────────────
  const updateTask = useCallback(async (id: string, patch: Partial<PlanTask>) => {
    dispatch({ type:"UPDATE_TASK", id, patch });

    const task = state.tasks.find(t => t.id === id);
    if (!task?.phaseId) return; // local-only or summary row

    const body: Record<string, unknown> = {};
    if (patch.start !== undefined)    body.plannedStart    = patch.start?.toISOString() ?? null;
    if (patch.fin   !== undefined)    body.plannedEnd      = patch.fin?.toISOString()   ?? null;
    if (patch.name  !== undefined)    body.name            = patch.name;
    if (patch.status !== undefined)   body.status          = patch.status;
    if (patch.depType !== undefined)  body.dependencyType  = patch.depType;
    if (patch.pred !== undefined)     body.dependsOnId     = patch.pred ?? null;
    if (patch.lag !== undefined)      body.lagDays         = patch.lag;
    // dur without explicit dates → recalculate plannedEnd keeping plannedStart
    if (patch.dur !== undefined && patch.start === undefined && patch.fin === undefined) {
      const currentStart = task.start;
      if (currentStart) {
        body.plannedStart = currentStart.toISOString();
        body.plannedEnd   = new Date(currentStart.getTime() + Math.max(1, patch.dur) * DAY).toISOString();
      }
    }
    // pct: update phase status based on progress
    if (patch.pct !== undefined) {
      body.status = patch.pct >= 100 ? "COMPLETED" : patch.pct > 0 ? "IN_PROGRESS" : "NOT_STARTED";
    }

    if (!Object.keys(body).length) return;

    try {
      dispatch({ type:"SET_SAVING", saving:true });
      const res = await fetch(`/api/phases/${task.phaseId}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notify(`❌ ${err.error || "Error guardando cambios"}`);
      }
    } catch { notify("❌ Error de conexión"); }
    finally  { dispatch({ type:"SET_SAVING", saving:false }); }
  }, [state.tasks, notify]);

  // ── ADD TASK — opens modal, creates via API ───────────────────────────────
  const openAddTask = useCallback(() => {
    dispatch({ type:"SET_MODAL", modal:{ type:"add" } });
  }, []);

  const confirmAddTask = useCallback(async (opts: {
    storeId: string; name: string; durationDays: number;
    dependsOnId: string | null; dependencyType: string; lagDays: number;
    insertAfterOrder?: number;
  }) => {
    try {
      dispatch({ type:"SET_SAVING", saving:true });
      const res = await fetch(`/api/stores/${opts.storeId}/phases`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(opts),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notify(`❌ ${err.error || "Error creando fase"}`);
        return;
      }
      const newPhase = await res.json();
      notify(`✅ Fase "${newPhase.name}" creada`);
      // Reload fresh data so ordering and cascade are correct
      await load(state.filterStatus);
    } catch { notify("❌ Error de conexión"); }
    finally  { dispatch({ type:"SET_SAVING", saving:false }); }
  }, [notify]);

  // ── DELETE TASK — asks confirmation, calls DELETE API ────────────────────
  const askDelete = useCallback(() => {
    if (!state.selectedId) return notify("Seleccione una tarea primero");
    const task = state.tasks.find(t => t.id === state.selectedId);
    if (!task) return;
    if (task.type === "summary") return notify("No se puede eliminar un proyecto completo desde aquí");
    dispatch({ type:"SET_MODAL", modal:{ type:"delete", task } });
  }, [state.selectedId, state.tasks, notify]);

  const confirmDelete = useCallback(async (task: PlanTask) => {
    if (!task.phaseId) {
      // Local-only task (never saved), just remove from state
      dispatch({ type:"DELETE_TASK", id: task.id });
      notify("✅ Tarea eliminada");
      return;
    }
    try {
      dispatch({ type:"SET_SAVING", saving:true });
      const res = await fetch(`/api/phases/${task.phaseId}`, { method:"DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notify(`❌ ${err.error || "Error eliminando fase"}`);
        return;
      }
      notify(`✅ Fase "${task.name}" eliminada`);
      // Reload to get correct predecessor re-links and updated order
      await load(state.filterStatus);
    } catch { notify("❌ Error de conexión"); }
    finally  { dispatch({ type:"SET_SAVING", saving:false }); }
  }, [notify, state.filterStatus, load]);

  // ── VINCULAR / DESVINCULAR ────────────────────────────────────────────────
  const linkTasks = useCallback((depType: DepType) => {
    if (!state.selectedId) return notify("Seleccione una tarea primero");
    const task = state.tasks.find(t => t.id === state.selectedId);
    if (!task?.phaseId) return notify("Solo se puede vincular fases guardadas");
    updateTask(state.selectedId, { depType });
    notify(`✅ Tipo de dependencia cambiado a ${depType}`);
  }, [state.selectedId, state.tasks, updateTask, notify]);

  const unlinkTask = useCallback(() => {
    if (!state.selectedId) return notify("Seleccione una tarea primero");
    const task = state.tasks.find(t => t.id === state.selectedId);
    if (!task?.phaseId) return;
    updateTask(state.selectedId, { pred: null, depType: "FS", lag: 0 });
    notify("✅ Dependencia eliminada");
  }, [state.selectedId, state.tasks, updateTask, notify]);

  // ── AUTO-SCHEDULE — cascade all stores from first phase ──────────────────
  const autoSchedule = useCallback(async () => {
    const summaries = processedTasks.filter(t => t.type === "summary");
    if (!summaries.length) return notify("No hay proyectos cargados");
    dispatch({ type:"SET_SAVING", saving:true });
    let count = 0;
    for (const sum of summaries) {
      const firstPhase = processedTasks.find(t => t.parentId === sum.id && t.level === 1 && !t.pred);
      if (!firstPhase?.phaseId) continue;
      try {
        await fetch("/api/phases/cascade-shift", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ phaseId: firstPhase.phaseId, deltaDays: 0 }),
        });
        count++;
      } catch { /* skip */ }
    }
    dispatch({ type:"SET_SAVING", saving:false });
    // Reload fresh data
    await load(state.filterStatus);
    notify(`✅ Re-programados ${count} proyecto(s) automáticamente`);
  }, [processedTasks, state.filterStatus, load, notify]);

  // ── EXPORT CSV ────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const fmt = (d: Date | null) => d ? `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}` : "";
    const rows = [
      ["ID","Tarea","Tipo","Duración(d)","Inicio","Fin","Predecesor","Tipo Dep","Lag(d)","% Avance","Estado","Recurso","Store"],
      ...visibleTasks.map(t => [
        t.id.slice(0, 12),
        `"${t.name.replace(/"/g,'""')}"`,
        t.type,
        t.dur,
        fmt(t.start),
        fmt(t.fin),
        t.pred ? String(visibleTasks.findIndex(x => x.id === t.pred) + 1) : "",
        t.depType,
        t.lag,
        t.pct,
        t.status,
        t.res,
        t.storeId.slice(0, 8),
      ]),
    ].map(r => r.join(",")).join("\n");

    const blob = new Blob(["﻿" + rows], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `planificacion_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    notify("✅ Exportado como CSV");
  }, [visibleTasks, notify]);

  // ── SCROLL TO TODAY ───────────────────────────────────────────────────────
  const scrollToday = useCallback(() => {
    const ganttBody = document.getElementById("gantt-body-scroll");
    if (ganttBody) {
      ganttBody.dispatchEvent(new CustomEvent("scrollToToday"));
      notify("📅 Vista centrada en hoy");
    } else {
      notify("📅 Cambie a la vista Gantt primero");
    }
  }, [notify]);

  // ── NIVELAR — real overallocation analysis ────────────────────────────────
  const levelResources = useCallback(() => {
    const resCounts = new Map<string, { days: number; tasks: string[] }>();
    processedTasks.filter(t => t.type !== "summary" && t.res).forEach(t => {
      if (!resCounts.has(t.res)) resCounts.set(t.res, { days: 0, tasks: [] });
      resCounts.get(t.res)!.days += t.dur;
      resCounts.get(t.res)!.tasks.push(t.name);
    });
    const overloaded = [...resCounts.entries()].filter(([, v]) => v.days > 30);
    if (overloaded.length === 0) {
      notify("✅ Sin sobreasignación de recursos detectada");
    } else {
      const detail = overloaded.map(([r, v]) => `${r}: ${v.days}d (${v.tasks.length} tareas)`).join(", ");
      notify(`⚠ Sobreasignación: ${detail}`);
    }
  }, [processedTasks, notify]);

  // ── STATS ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const phases  = state.tasks.filter(t => t.type !== "summary");
    const stores  = state.tasks.filter(t => t.type === "summary");
    const done    = phases.filter(t => t.status === "COMPLETED").length;
    const crit    = phases.filter(t => t.critical).length;
    const avgPct  = phases.length ? Math.round(phases.reduce((s,t)=>s+t.pct,0)/phases.length) : 0;
    return { stores:stores.length, tasks:phases.length, done, crit, avgPct };
  }, [state.tasks]);

  const selTask  = processedTasks.find(t => t.id === state.selectedId) ?? null;
  const isGantt  = state.viewMode === "gantt";
  const stores   = useMemo(() => {
    const seen = new Set<string>();
    return processedTasks.filter(t => t.type === "summary" && !seen.has(t.storeId) && seen.add(t.storeId));
  }, [processedTasks]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:"#0d1117", color:"#e6edf3", fontFamily:"'Segoe UI',-apple-system,sans-serif", fontSize:12 }}>
      <Ribbon
        state={state}
        onView={v => dispatch({ type:"SET_VIEW", view:v })}
        onZoom={z => dispatch({ type:"SET_ZOOM", zoom:z })}
        onRibbon={t => dispatch({ type:"SET_RIBBON", tab:t })}
        onToggleCritical={() => dispatch({ type:"TOGGLE_CRITICAL" })}
        onToggleBaseline={() => dispatch({ type:"TOGGLE_BASELINE" })}
        onToggleArrows={() => dispatch({ type:"TOGGLE_ARROWS" })}
        onToggleDetail={() => dispatch({ type:"TOGGLE_DETAIL" })}
        onSaveBaseline={() => dispatch({ type:"SAVE_BASELINE" })}
        onAddTask={openAddTask}
        onDelete={askDelete}
        onLink={linkTasks}
        onUnlink={unlinkTask}
        onFilter={s => dispatch({ type:"FILTER", status:s })}
        onSearch={q => dispatch({ type:"SEARCH", query:q })}
        onCollapseAll={() => state.tasks.filter(t=>t.type==="summary").forEach(t => dispatch({ type:"TOGGLE_EXPAND", id:t.id }))}
        onExpandAll={() => state.tasks.filter(t=>t.type==="summary"&&!t.expanded).forEach(t => dispatch({ type:"TOGGLE_EXPAND", id:t.id }))}
        onAutoSchedule={autoSchedule}
        onExport={exportCSV}
        onScrollToday={scrollToday}
        onLevelResources={levelResources}
        onStats={() => notify(`📊 ${stats.stores} proyectos · ${stats.tasks} fases · ${stats.done} completadas · Avance promedio: ${stats.avgPct}%`)}
        onNotify={notify}
      />

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {state.loading ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#8b9ab5" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
              <div>Cargando datos de planificación...</div>
            </div>
          </div>
        ) : isGantt ? (
          <>
            <WBSGrid
              tasks={visibleTasks}
              selectedId={state.selectedId}
              onSelect={id => dispatch({ type:"SELECT", id })}
              onToggleExpand={id => dispatch({ type:"TOGGLE_EXPAND", id })}
              onUpdateTask={updateTask}
              onOpenDetail={id => { dispatch({ type:"SELECT", id }); if (!state.detailOpen) dispatch({ type:"TOGGLE_DETAIL" }); }}
              showCritical={state.showCritical}
            />
            <GanttPane
              tasks={visibleTasks}
              allTasks={processedTasks}
              selectedId={state.selectedId}
              zoomMode={state.zoomMode}
              showCritical={state.showCritical}
              showBaseline={state.showBaseline}
              showArrows={state.showArrows}
              onSelect={id => dispatch({ type:"SELECT", id })}
              onUpdateTask={updateTask}
            />
          </>
        ) : state.viewMode === "resource" ? (
          <ResourceSheet resources={state.resources} tasks={processedTasks} onAddResource={() => notify("Use Plantillas de Fase para gestionar fases")} />
        ) : state.viewMode === "calendar" ? (
          <CalendarView tasks={processedTasks} calOffset={state.calOffset} showCritical={state.showCritical}
            onPrev={() => dispatch({ type:"CAL_OFFSET", delta:-1 })}
            onNext={() => dispatch({ type:"CAL_OFFSET", delta:+1 })} />
        ) : state.viewMode === "network" ? (
          <NetworkDiagram tasks={visibleTasks} showCritical={state.showCritical} />
        ) : (
          <TaskUsage tasks={visibleTasks} />
        )}
      </div>

      {state.detailOpen && selTask && (
        <DetailPane
          task={selTask}
          allTasks={visibleTasks}
          onClose={() => dispatch({ type:"TOGGLE_DETAIL" })}
          onUpdate={patch => updateTask(state.selectedId!, patch)}
        />
      )}

      {/* Status bar */}
      <div style={{ background:"#1f6feb", height:20, display:"flex", alignItems:"center", padding:"0 12px", gap:20, flexShrink:0, fontSize:10, color:"#fff" }}>
        <span>📋 Telecom Planner</span>
        <span>🏪 {stats.stores} proyectos</span>
        <span>📋 {stats.tasks} fases · {stats.done} completadas</span>
        <span>📈 Avance promedio: {stats.avgPct}%</span>
        {state.showCritical && <span style={{ color:"#fca5a5" }}>🔴 Ruta crítica: {stats.crit} fases</span>}
        {state.saving && <span style={{ color:"#fde68a" }}>💾 Guardando...</span>}
        <span style={{ marginLeft:"auto" }}>{new Date().toLocaleDateString("es")}</span>
      </div>

      {/* Notification */}
      {state.notif && (
        <div style={{ position:"fixed", bottom:28, right:16, background:"#161b22", border:"1px solid #30363d", borderLeft:"3px solid #388bfd", borderRadius:6, padding:"8px 14px", fontSize:11, zIndex:300, minWidth:220, maxWidth:360 }}>
          {state.notif}
        </div>
      )}

      {/* Modals */}
      {state.modal.type === "add" && (
        <AddTaskModal
          stores={stores}
          tasks={processedTasks}
          selectedId={state.selectedId}
          onConfirm={confirmAddTask}
          onClose={() => dispatch({ type:"SET_MODAL", modal:{ type:"none" } })}
        />
      )}
      {state.modal.type === "delete" && (
        <DeleteConfirmDialog
          task={state.modal.task}
          onConfirm={() => confirmDelete(state.modal.type === "delete" ? state.modal.task : state.tasks[0])}
          onClose={() => dispatch({ type:"SET_MODAL", modal:{ type:"none" } })}
        />
      )}
    </div>
  );
}
