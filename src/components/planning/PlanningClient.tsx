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

const DAY = 86_400_000;

// ── REDUCER ──────────────────────────────────────────────────────────────────
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
  | { type: "NOTIF"; msg: string | null }
  | { type: "SET_SAVING"; saving: boolean };

const INIT: PlanningState = {
  tasks: [], resources: [],
  viewMode: "gantt", zoomMode: "week",
  selectedId: null, showCritical: true, showBaseline: false, showArrows: true,
  detailOpen: false, ribbonTab: "task",
  filterStatus: "active", searchQuery: "", calOffset: 0,
  loading: true, saving: false, notif: null,
};

function reducer(s: PlanningState, a: Action): PlanningState {
  switch (a.type) {
    case "LOADED":    return { ...s, tasks: a.tasks, resources: a.resources, loading: false };
    case "SET_VIEW":  return { ...s, viewMode: a.view };
    case "SET_ZOOM":  return { ...s, zoomMode: a.zoom };
    case "SET_RIBBON":return { ...s, ribbonTab: a.tab };
    case "SELECT":    return { ...s, selectedId: a.id };
    case "TOGGLE_EXPAND": return { ...s, tasks: s.tasks.map(t => t.id === a.id ? { ...t, expanded: !t.expanded } : t) };
    case "TOGGLE_CRITICAL": return { ...s, showCritical: !s.showCritical };
    case "TOGGLE_BASELINE": return { ...s, showBaseline: !s.showBaseline };
    case "TOGGLE_ARROWS":   return { ...s, showArrows: !s.showArrows };
    case "TOGGLE_DETAIL":   return { ...s, detailOpen: !s.detailOpen };
    case "SAVE_BASELINE":   return { ...s, tasks: s.tasks.map(t => t.start && t.fin ? { ...t, baseline: { start: t.start, fin: t.fin } } : t), notif: "Línea base guardada" };
    case "FILTER":    return { ...s, filterStatus: a.status };
    case "SEARCH":    return { ...s, searchQuery: a.query };
    case "CAL_OFFSET":return { ...s, calOffset: s.calOffset + a.delta };
    case "UPDATE_TASK":return { ...s, tasks: s.tasks.map(t => t.id === a.id ? { ...t, ...a.patch } : t) };
    case "ADD_TASK":  return { ...s, tasks: [...s.tasks, a.task] };
    case "DELETE_TASK":return { ...s, tasks: s.tasks.filter(t => t.id !== a.id && t.parentId !== a.id), selectedId: s.selectedId === a.id ? null : s.selectedId };
    case "NOTIF":     return { ...s, notif: a.msg };
    case "SET_SAVING":return { ...s, saving: a.saving };
    default:          return s;
  }
}

// ── SCHEDULE COMPUTATION ──────────────────────────────────────────────────────
function computeSchedule(tasks: PlanTask[]): PlanTask[] {
  const map = new Map<string, { start: number; end: number }>();

  function visit(t: PlanTask): { start: number; end: number } {
    if (map.has(t.id)) return map.get(t.id)!;
    let startMs = t.start ? t.start.getTime() : Date.now();

    if (t.pred) {
      const pred = tasks.find(x => x.id === t.pred);
      if (pred) {
        const ps = visit(pred);
        const lagMs = (t.lag ?? 0) * DAY;
        if (t.depType === "SS") startMs = ps.start + lagMs;
        else if (t.depType === "FF") startMs = ps.end + lagMs - t.dur * DAY;
        else if (t.depType === "SF") startMs = ps.start + lagMs - t.dur * DAY;
        else startMs = ps.end + lagMs; // FS
      }
    }
    const r = { start: startMs, end: startMs + Math.max(t.dur, 0) * DAY };
    map.set(t.id, r);
    return r;
  }

  const nonSummary = tasks.filter(t => t.type !== "summary");
  nonSummary.forEach(t => visit(t));

  return tasks.map(t => {
    if (t.type === "summary") {
      const kids = tasks.filter(k => k.parentId === t.id && k.type !== "summary");
      const starts = kids.map(k => map.get(k.id)?.start).filter(Boolean) as number[];
      const ends   = kids.map(k => map.get(k.id)?.end).filter(Boolean) as number[];
      if (starts.length && ends.length) {
        const s = Math.min(...starts), e = Math.max(...ends);
        return { ...t, start: new Date(s), fin: new Date(e), dur: Math.round((e - s) / DAY) };
      }
      return t;
    }
    const r = map.get(t.id);
    if (!r) return t;
    return { ...t, start: new Date(r.start), fin: new Date(r.end) };
  });
}

// ── CRITICAL PATH ──────────────────────────────────────────────────────────────
function markCritical(tasks: PlanTask[], enabled: boolean): PlanTask[] {
  if (!enabled) return tasks.map(t => ({ ...t, critical: false }));

  const storeIds = [...new Set(tasks.filter(t => t.type === "summary").map(t => t.id))];

  const criticalIds = new Set<string>();
  storeIds.forEach(sid => {
    const phaseTasks = tasks.filter(t => t.parentId === sid && !t.milestone);
    if (!phaseTasks.length) return;
    const maxEnd = Math.max(...phaseTasks.filter(t => t.fin).map(t => t.fin!.getTime()));
    phaseTasks.forEach(t => {
      if (t.fin && Math.abs(t.fin.getTime() - maxEnd) < DAY) criticalIds.add(t.id);
    });
    // Propagate backwards
    let changed = true;
    while (changed) {
      changed = false;
      tasks.filter(t => criticalIds.has(t.id) && t.pred).forEach(t => {
        if (!criticalIds.has(t.pred!)) { criticalIds.add(t.pred!); changed = true; }
      });
    }
  });

  return tasks.map(t => ({ ...t, critical: criticalIds.has(t.id) }));
}

// ── BUILD TASKS FROM API ──────────────────────────────────────────────────────
let _nextId = 9000;
function uid() { return String(++_nextId); }

function buildTasksFromStores(stores: ApiStore[]): PlanTask[] {
  const tasks: PlanTask[] = [];
  stores.forEach(store => {
    const sumTask: PlanTask = {
      id: `s-${store.id}`, type: "summary", name: `${store.code} — ${store.name}`,
      dur: 0, start: null, fin: null, pred: null, depType: "FS", lag: 0,
      pct: store.progress, res: store.pm?.name ?? "",
      level: 0, parentId: null, status: store.status,
      critical: false, milestone: false, expanded: true, storeId: store.id,
      baseline: null,
    };
    tasks.push(sumTask);

    store.phases.forEach(ph => {
      const isMilestone = ph.phaseNumber === store.phases.length && ph.name.toLowerCase().includes("inaug");
      const phTask: PlanTask = {
        id: ph.id, type: isMilestone ? "milestone" : "task",
        name: ph.name, dur: ph.plannedStart && ph.plannedEnd
          ? Math.max(1, Math.round((new Date(ph.plannedEnd).getTime() - new Date(ph.plannedStart).getTime()) / DAY))
          : 7,
        start: ph.plannedStart ? new Date(ph.plannedStart) : null,
        fin:   ph.plannedEnd   ? new Date(ph.plannedEnd)   : null,
        pred: ph.dependsOnId ?? null,
        depType: (ph.dependencyType as DepType) ?? "FS",
        lag: ph.lagDays ?? 0,
        pct: ph.pct, res: "",
        level: 1, parentId: `s-${store.id}`,
        status: ph.status, critical: false,
        milestone: isMilestone, expanded: true, storeId: store.id,
        baseline: null, phaseId: ph.id,
      };
      tasks.push(phTask);
    });
  });
  return tasks;
}

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function PlanningClient() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/planning?status=${state.filterStatus}&limit=60`);
        const stores: ApiStore[] = await res.json();
        if (!Array.isArray(stores)) return;
        const raw = buildTasksFromStores(stores);
        const scheduled = computeSchedule(raw);
        const withCrit  = markCritical(scheduled, true);
        const resources: PlanResource[] = [
          { id:"r1", name:"PM Lima",         type:"Trabajo",  group:"Gestión",  units:"100%", rate:"$35/h", assignedTasks: 0, overAllocated:false },
          { id:"r2", name:"PM Arequipa",      type:"Trabajo",  group:"Gestión",  units:"100%", rate:"$35/h", assignedTasks: 0, overAllocated:false },
          { id:"r3", name:"Equipo Legal",     type:"Trabajo",  group:"Legal",    units:"200%", rate:"$60/h", assignedTasks: 0, overAllocated:true  },
          { id:"r4", name:"Equipo Técnico",   type:"Trabajo",  group:"Técnico",  units:"300%", rate:"$25/h", assignedTasks: 0, overAllocated:false },
          { id:"r5", name:"HR",               type:"Trabajo",  group:"RRHH",     units:"100%", rate:"$30/h", assignedTasks: 0, overAllocated:false },
          { id:"r6", name:"Constructor",      type:"Trabajo",  group:"Obra",     units:"100%", rate:"$45/h", assignedTasks: 0, overAllocated:true  },
        ];
        dispatch({ type:"LOADED", tasks: withCrit, resources });
      } catch { dispatch({ type:"NOTIF", msg:"Error cargando datos" }); }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filterStatus]);

  // Recompute schedule + critical path when tasks change
  const processedTasks = useMemo(() => {
    const scheduled = computeSchedule(state.tasks);
    return markCritical(scheduled, state.showCritical);
  }, [state.tasks, state.showCritical]);

  // Visible tasks (expand/collapse + search filter)
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

  // Notifications auto-clear
  useEffect(() => {
    if (!state.notif) return;
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => dispatch({ type:"NOTIF", msg:null }), 3000);
  }, [state.notif]);

  // ── HANDLERS ──
  const notify = useCallback((msg: string) => dispatch({ type:"NOTIF", msg }), []);

  const updateTask = useCallback(async (id: string, patch: Partial<PlanTask>) => {
    dispatch({ type:"UPDATE_TASK", id, patch });

    // Persist date/dep changes to API for phase tasks
    const task = state.tasks.find(t => t.id === id);
    if (!task?.phaseId) return;

    const body: Record<string,unknown> = {};
    if (patch.start)   body.plannedStart = patch.start.toISOString();
    if (patch.fin)     body.plannedEnd   = patch.fin.toISOString();
    if (patch.depType) body.dependencyType = patch.depType;
    if (patch.lag !== undefined) body.lagDays = patch.lag;
    if (patch.pred !== undefined) body.dependsOnId = patch.pred;
    if (patch.name)    body.name = patch.name;
    if (patch.status)  body.status = patch.status;
    if (!Object.keys(body).length) return;

    try {
      dispatch({ type:"SET_SAVING", saving:true });
      await fetch(`/api/phases/${task.phaseId}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
      });
    } catch { notify("Error guardando cambios"); }
    finally  { dispatch({ type:"SET_SAVING", saving:false }); }
  }, [state.tasks, notify]);

  const addTask = useCallback(() => {
    const sel = state.tasks.find(t => t.id === state.selectedId);
    const storeId = sel?.storeId ?? state.tasks.find(t => t.type==="summary")?.storeId ?? "";
    const parentId = sel?.type === "summary" ? sel.id : sel?.parentId ?? null;
    const newTask: PlanTask = {
      id: uid(), type:"task", name:"Nueva Tarea", dur:5,
      start:null, fin:null, pred:state.selectedId,
      depType:"FS", lag:0, pct:0, res:"", level:1,
      parentId, status:"NOT_STARTED", critical:false,
      milestone:false, expanded:true, storeId, baseline:null,
    };
    dispatch({ type:"ADD_TASK", task:newTask });
    dispatch({ type:"SELECT",   id:newTask.id });
    notify("Tarea creada");
  }, [state.tasks, state.selectedId, notify]);

  const deleteSelected = useCallback(() => {
    if (!state.selectedId) return;
    dispatch({ type:"DELETE_TASK", id:state.selectedId });
    notify("Tarea eliminada");
  }, [state.selectedId, notify]);

  const linkTasks = useCallback((depType: DepType) => {
    if (!state.selectedId) return notify("Seleccione una tarea primero");
    dispatch({ type:"UPDATE_TASK", id:state.selectedId, patch:{ depType } });
    notify(`Tipo de dependencia: ${depType}`);
  }, [state.selectedId, notify]);

  // ── RENDER ──
  const isGantt   = state.viewMode === "gantt";
  const selTask   = processedTasks.find(t => t.id === state.selectedId) ?? null;

  const stats = useMemo(() => {
    const phases = state.tasks.filter(t => t.type !== "summary");
    const stores = state.tasks.filter(t => t.type === "summary");
    const crit   = phases.filter(t => t.critical).length;
    return { stores: stores.length, tasks: phases.length, critical: crit };
  }, [state.tasks]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:"#0d1117", color:"#e6edf3", fontFamily:"'Segoe UI',-apple-system,sans-serif", fontSize:12 }}>
      {/* Ribbon */}
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
        onAddTask={addTask}
        onDelete={deleteSelected}
        onLink={linkTasks}
        onFilter={s => dispatch({ type:"FILTER", status:s })}
        onSearch={q => dispatch({ type:"SEARCH", query:q })}
        onCollapseAll={() => state.tasks.filter(t => t.type==="summary").forEach(t => dispatch({ type:"TOGGLE_EXPAND", id:t.id }))}
        onExpandAll={() => state.tasks.filter(t => t.type==="summary").forEach(t => { if(!t.expanded) dispatch({ type:"TOGGLE_EXPAND", id:t.id }); })}
        onAutoSchedule={() => notify("Re-programado automáticamente")}
        onNotify={notify}
      />

      {/* Views */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>
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
          <ResourceSheet resources={state.resources} tasks={processedTasks} onAddResource={() => notify("Recurso agregado")} />
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

      {/* Detail pane */}
      {state.detailOpen && selTask && (
        <DetailPane
          task={selTask}
          allTasks={visibleTasks}
          onClose={() => dispatch({ type:"TOGGLE_DETAIL" })}
          onUpdate={(patch) => updateTask(state.selectedId!, patch)}
        />
      )}

      {/* Status bar */}
      <div style={{ background:"#1f6feb", height:20, display:"flex", alignItems:"center", padding:"0 12px", gap:20, flexShrink:0, fontSize:10, color:"#fff" }}>
        <span>📋 Telecom Planner v2.0</span>
        <span>🏪 {stats.stores} proyectos</span>
        <span>📋 {stats.tasks} fases</span>
        {state.showCritical && <span style={{ color:"#fca5a5" }}>🔴 R.Crítica: {stats.critical} fases</span>}
        {state.saving && <span>💾 Guardando...</span>}
        <span style={{ marginLeft:"auto" }}>{new Date().toLocaleDateString("es")}</span>
      </div>

      {/* Notification */}
      {state.notif && (
        <div style={{ position:"fixed", bottom:28, right:16, background:"#161b22", border:"1px solid #30363d", borderLeft:"3px solid #388bfd", borderRadius:6, padding:"8px 14px", fontSize:11, zIndex:300, minWidth:220 }}>
          ℹ {state.notif}
        </div>
      )}
    </div>
  );
}
