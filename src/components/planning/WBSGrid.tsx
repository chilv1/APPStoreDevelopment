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
  tasks: PlanTask[];
  selectedId: string | null;
  showCritical: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<PlanTask>) => void;
  onOpenDetail: (id: string) => void;
}

export default function WBSGrid({ tasks, selectedId, showCritical, onSelect, onToggleExpand, onUpdateTask, onOpenDetail }: Props) {
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
      const target = tasks[idx];
      onUpdateTask(id, { pred: target?.id ?? null });
    }
    else if (field === "pct") onUpdateTask(id, { pct: Math.min(100, Math.max(0, parseInt(editVal)||0)) });
    setEditing(null);
  };

  return (
    <div ref={gridRef} style={{ width:500, minWidth:200, display:"flex", flexDirection:"column", overflow:"hidden", borderRight:"1px solid #30363d", flexShrink:0 }}>
      {/* Header */}
      <div style={{ display:"grid", gridTemplateColumns:"22px 30px 22px 1fr 42px 52px 52px 32px 56px", background:"#1c2128", borderBottom:"1px solid #30363d", height:28, alignItems:"center", flexShrink:0 }}>
        {["⚑","ID","","Nombre de tarea","Días","Inicio","Fin","Pre","Avance"].map((h,i) => (
          <div key={i} style={{ padding:"0 4px", fontSize:10, fontWeight:600, color:"#484f58", textTransform:"uppercase", letterSpacing:.4, borderRight:"1px solid #21262d", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
        {tasks.map((t, i) => {
          const isSel = t.id === selectedId;
          const isCrit = showCritical && t.critical;
          const barColor = t.type==="summary" ? "#1f6feb" : isCrit ? CRIT_COLOR : t.pct===100 ? "#1a7f37" : "#238636";

          return (
            <div
              key={t.id}
              style={{
                display:"grid", gridTemplateColumns:"22px 30px 22px 1fr 42px 52px 52px 32px 56px",
                height:ROW_H, alignItems:"center",
                background: isSel ? "rgba(56,139,253,.15)" : t.type==="summary" ? "rgba(121,192,255,.04)" : "transparent",
                borderBottom:"1px solid #21262d",
                cursor:"default",
              }}
              onClick={() => onSelect(t.id)}
              onDoubleClick={() => onOpenDetail(t.id)}
            >
              {/* Indicator */}
              <div style={{ textAlign:"center", fontSize:10, color: t.status==="BLOCKED"?"#f85149":t.status==="COMPLETED"?"#3fb950":"#8b949e" }}>
                {STATUS_IC[t.status] ?? "○"}
              </div>

              {/* ID */}
              <div style={{ textAlign:"right", fontSize:10, color:"#484f58", paddingRight:4 }}>{i+1}</div>

              {/* Expand btn */}
              <div style={{ textAlign:"center" }}>
                {t.type==="summary" && (
                  <button onClick={e => { e.stopPropagation(); onToggleExpand(t.id); }}
                    style={{ background:"#21262d", border:"1px solid #30363d", borderRadius:2, width:12, height:12, cursor:"pointer", fontSize:8, color:"#8b949e", lineHeight:1, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                    {t.expanded ? "−" : "+"}
                  </button>
                )}
              </div>

              {/* Name */}
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

              {/* Dur */}
              <div style={{ textAlign:"center", fontSize:11, color:"#8b949e" }}
                onDoubleClick={()=>startEdit(t.id,"dur",String(t.dur))}>
                {editing?.id===t.id&&editing.field==="dur"
                  ? <input autoFocus type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e=>{if(e.key==="Enter")commitEdit();if(e.key==="Escape")setEditing(null);}} style={{ width:36, background:"rgba(56,139,253,.1)", border:"1px solid #388bfd", color:"#e6edf3", fontSize:11, textAlign:"center", borderRadius:2, outline:"none", height:18 }} />
                  : `${t.dur}d`}
              </div>

              {/* Start */}
              <div style={{ textAlign:"center", fontSize:10, color:"#8b949e" }}>{fmtD(t.start)}</div>

              {/* Fin */}
              <div style={{ textAlign:"center", fontSize:10, color:"#8b949e" }}>{fmtD(t.fin)}</div>

              {/* Pred */}
              <div style={{ textAlign:"center", fontSize:10, color:"#8b949e" }}
                onDoubleClick={()=>startEdit(t.id,"pred",t.pred ? String(tasks.findIndex(x=>x.id===t.pred)+1) : "")}>
                {editing?.id===t.id&&editing.field==="pred"
                  ? <input autoFocus type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e=>{if(e.key==="Enter")commitEdit();if(e.key==="Escape")setEditing(null);}} style={{ width:28, background:"rgba(56,139,253,.1)", border:"1px solid #388bfd", color:"#e6edf3", fontSize:11, textAlign:"center", borderRadius:2, outline:"none", height:18 }} />
                  : (t.pred ? tasks.findIndex(x=>x.id===t.pred)+1 || "" : "")}
              </div>

              {/* Progress bar */}
              <div style={{ padding:"0 4px" }}>
                <div style={{ height:6, background:"#21262d", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${t.pct}%`, background:barColor, borderRadius:3 }} />
                </div>
              </div>
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
