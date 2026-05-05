"use client";
import { useRef, useState } from "react";
import type { PlanTask } from "./types";

const ROW_H = 24;

const STATUS_IC: Record<string, string> = {
  COMPLETED:"✔", IN_PROGRESS:"▶", BLOCKED:"⚠", NOT_STARTED:"○",
};
const CRIT_COLOR = "#f85149";

function fmtD(d: Date | null) {
  if (!d) return "—";
  return `${d.getDate()}/${d.getMonth()+1}`;
}

interface Props {
  tasks: PlanTask[];       // visible tasks (respects collapse/filter)
  allTasks: PlanTask[];    // all tasks (for pred resolution regardless of collapse)
  selectedId: string | null;
  showCritical: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<PlanTask>) => void;
  onOpenDetail: (id: string) => void;
  visibleColumns?: Set<string>;  // optional column visibility filter
}

export default function WBSGrid({ tasks, allTasks, selectedId, showCritical, onSelect, onToggleExpand, onUpdateTask, onOpenDetail, visibleColumns }: Props) {
  // Non-summary tasks in absolute order — used for stable pred numbering
  const allPhases = allTasks.filter(t => t.type !== "summary");

  // Compute visible column widths (collapse to 0 hidden cols by removing entries)
  const allCols = [
    { key:"indicator", w:"22px" },
    { key:"id",        w:"30px" },
    { key:"expand",    w:"22px" },
    { key:"name",      w:"1fr"  },
    { key:"dur",       w:"42px" },
    { key:"start",     w:"52px" },
    { key:"fin",       w:"52px" },
    { key:"pred",      w:"32px" },
    { key:"progress",  w:"56px" },
  ];
  const cols = visibleColumns ? allCols.filter(c => visibleColumns.has(c.key)) : allCols;
  const gridTemplate = cols.map(c => c.w).join(" ");
  const showCol = (k: string) => !visibleColumns || visibleColumns.has(k);
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const startEdit = (id: string, field: string, current: string) => {
    setEditing({ id, field });
    setEditVal(current);
  };

  const commitEdit = () => {
    if (!editing) return;
    const { id, field } = editing;
    if (field === "name")    onUpdateTask(id, { name: editVal });
    else if (field === "dur") onUpdateTask(id, { dur: Math.max(0, parseInt(editVal) || 0) });
    else if (field === "pred") {
      const idx = parseInt(editVal) - 1;
      // Resolve from allPhases (stable index regardless of collapse/filter)
      const target = allPhases[idx];
      onUpdateTask(id, { pred: target?.id ?? null });
    }
    else if (field === "pct") onUpdateTask(id, { pct: Math.min(100, Math.max(0, parseInt(editVal)||0)) });
    setEditing(null);
  };

  const headerLabels: Record<string, string> = {
    indicator: "⚑", id: "ID", expand: "", name: "Nombre de tarea",
    dur: "Días", start: "Inicio", fin: "Fin", pred: "Pre", progress: "Avance",
  };

  return (
    <div ref={gridRef} style={{ width:500, minWidth:200, display:"flex", flexDirection:"column", overflow:"hidden", borderRight:"1px solid #30363d", flexShrink:0 }}>
      {/* Header */}
      <div style={{ display:"grid", gridTemplateColumns:gridTemplate, background:"#1c2128", borderBottom:"1px solid #30363d", height:28, alignItems:"center", flexShrink:0 }}>
        {cols.map(c => (
          <div key={c.key} style={{ padding:"0 4px", fontSize:10, fontWeight:600, color:"#484f58", textTransform:"uppercase", letterSpacing:.4, borderRight:"1px solid #21262d", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{headerLabels[c.key]}</div>
        ))}
      </div>

      {/* Rows — class used by GanttPane to sync vertical scroll */}
      <div className="planning-grid-wrap" style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
        {tasks.map((t, i) => {
          const isSel = t.id === selectedId;
          const isCrit = showCritical && t.critical;
          const barColor = t.type==="summary" ? "#1f6feb" : isCrit ? CRIT_COLOR : t.pct===100 ? "#1a7f37" : "#238636";

          return (
            <div
              key={t.id}
              style={{
                display:"grid", gridTemplateColumns:gridTemplate,
                height:ROW_H, alignItems:"center",
                background: isSel ? "rgba(56,139,253,.15)" : t.type==="summary" ? "rgba(121,192,255,.04)" : "transparent",
                borderBottom:"1px solid #21262d",
                cursor:"default",
              }}
              onClick={() => onSelect(t.id)}
              onDoubleClick={() => onOpenDetail(t.id)}
            >
              {/* Indicator */}
              {showCol("indicator") && (
                <div style={{ textAlign:"center", fontSize:10, color: t.status==="BLOCKED"?"#f85149":t.status==="COMPLETED"?"#3fb950":"#8b949e" }}>
                  {STATUS_IC[t.status] ?? "○"}
                </div>
              )}

              {/* ID */}
              {showCol("id") && (
                <div style={{ textAlign:"right", fontSize:10, color:"#484f58", paddingRight:4 }}>{i+1}</div>
              )}

              {/* Expand btn */}
              {showCol("expand") && (
                <div style={{ textAlign:"center" }}>
                  {t.type==="summary" && (
                    <button onClick={e => { e.stopPropagation(); onToggleExpand(t.id); }}
                      style={{ background:"#21262d", border:"1px solid #30363d", borderRadius:2, width:12, height:12, cursor:"pointer", fontSize:8, color:"#8b949e", lineHeight:1, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                      {t.expanded ? "−" : "+"}
                    </button>
                  )}
                </div>
              )}

              {/* Name */}
              {showCol("name") && (
                <div style={{ paddingLeft: t.level * 14 + 4, overflow:"hidden", display:"flex", alignItems:"center", gap:3 }}>
                  <span style={{ fontSize:11, flexShrink:0 }}>{t.milestone ? "◆" : t.type==="summary" ? "📁" : "▪"}</span>
                  {editing?.id===t.id && editing.field==="name" ? (
                    <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                      onBlur={commitEdit} onKeyDown={e=>{if(e.key==="Enter")commitEdit();if(e.key==="Escape")setEditing(null);}}
                      style={{ background:"rgba(56,139,253,.1)", border:"1px solid #388bfd", color:"#e6edf3", fontSize:11, width:"90%", padding:"0 3px", borderRadius:2, outline:"none", height:18 }} />
                  ) : (
                    <span title={t.name}
                      style={{ fontSize:11, color:isCrit?CRIT_COLOR:t.type==="summary"?"#79c0ff":t.milestone?"#bc8cff":"#e6edf3", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:t.type==="summary"?600:400 }}
                      onDoubleClick={e=>{e.stopPropagation();startEdit(t.id,"name",t.name);}}>
                      {t.name}
                    </span>
                  )}
                </div>
              )}

              {/* Dur */}
              {showCol("dur") && (
                <div style={{ textAlign:"center", fontSize:11, color:"#8b949e" }}
                  onDoubleClick={()=>startEdit(t.id,"dur",String(t.dur))}>
                  {editing?.id===t.id&&editing.field==="dur"
                    ? <input autoFocus type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e=>{if(e.key==="Enter")commitEdit();if(e.key==="Escape")setEditing(null);}} style={{ width:36, background:"rgba(56,139,253,.1)", border:"1px solid #388bfd", color:"#e6edf3", fontSize:11, textAlign:"center", borderRadius:2, outline:"none", height:18 }} />
                    : `${t.dur}d`}
                </div>
              )}

              {/* Start */}
              {showCol("start") && (
                <div style={{ textAlign:"center", fontSize:10, color:"#8b949e" }}>{fmtD(t.start)}</div>
              )}

              {/* Fin */}
              {showCol("fin") && (
                <div style={{ textAlign:"center", fontSize:10, color:"#8b949e" }}>{fmtD(t.fin)}</div>
              )}

              {/* Pred — absolute index in allPhases (stable even when stores collapsed) */}
              {showCol("pred") && (
                <div style={{ textAlign:"center", fontSize:10, color:"#8b949e" }}
                  onDoubleClick={()=>startEdit(t.id,"pred",t.pred ? String(allPhases.findIndex(x=>x.id===t.pred)+1) : "")}>
                  {editing?.id===t.id&&editing.field==="pred"
                    ? <input autoFocus type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e=>{if(e.key==="Enter")commitEdit();if(e.key==="Escape")setEditing(null);}} style={{ width:28, background:"rgba(56,139,253,.1)", border:"1px solid #388bfd", color:"#e6edf3", fontSize:11, textAlign:"center", borderRadius:2, outline:"none", height:18 }} />
                    : (() => { const idx = allPhases.findIndex(x => x.id === t.pred); return idx >= 0 ? idx + 1 : t.pred ? "↑" : ""; })()}
                </div>
              )}

              {/* Progress bar */}
              {showCol("progress") && (
                <div style={{ padding:"0 4px" }}>
                  <div style={{ height:6, background:"#21262d", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${t.pct}%`, background:barColor, borderRadius:3 }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div style={{ padding:"24px 16px", color:"#484f58", fontSize:12, textAlign:"center" }}>
            No hay tareas visibles. Cambie el filtro para ver más proyectos.
          </div>
        )}
      </div>
    </div>
  );
}
