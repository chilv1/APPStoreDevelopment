"use client";
import type { PlanTask } from "../types";

function fmtD(d: Date | null) {
  if (!d) return "—";
  return `${d.getDate()}/${d.getMonth()+1}`;
}

interface Props { tasks: PlanTask[]; }

export default function TaskUsage({ tasks }: Props) {
  const STATUS_COLOR: Record<string,string> = {
    COMPLETED:"#238636", IN_PROGRESS:"#1f6feb", BLOCKED:"#b91c1c", NOT_STARTED:"#374151",
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"6px 12px", background:"#1c2128", borderBottom:"1px solid #30363d", fontSize:13, fontWeight:600, color:"#79c0ff", flexShrink:0 }}>
        📈 Uso de Tarea
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#1c2128", position:"sticky", top:0, zIndex:5 }}>
              {["Tarea / Recurso","Trabajo","Inicio","Fin","% Comp.","Estado","Recurso asignado"].map((h,i) => (
                <th key={i} style={{ padding:"5px 10px", fontSize:10, fontWeight:600, color:"#484f58", textTransform:"uppercase", letterSpacing:.4, borderBottom:"1px solid #30363d", textAlign:i===0?"left":"center", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => {
              const isSumm = t.type === "summary";
              const color  = STATUS_COLOR[t.status] ?? "#374151";
              return (
                <tr key={t.id} style={{ borderBottom:"1px solid #21262d", background:isSumm?"rgba(121,192,255,.04)":"transparent" }}>
                  <td style={{ padding:`4px ${4 + t.level*12}px`, fontSize:11, color:isSumm?"#79c0ff":"#e6edf3", fontWeight:isSumm?600:400, display:"flex", alignItems:"center", gap:4 }}>
                    <span>{t.milestone?"◆":isSumm?"📁":"▪"}</span>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:240 }}>{t.name}</span>
                  </td>
                  <td style={{ padding:"4px 10px", textAlign:"center", fontSize:11, color:"#8b949e" }}>{isSumm?"":t.dur+"d×8h"}</td>
                  <td style={{ padding:"4px 10px", textAlign:"center", fontSize:11, color:"#8b949e" }}>{fmtD(t.start)}</td>
                  <td style={{ padding:"4px 10px", textAlign:"center", fontSize:11, color:"#8b949e" }}>{fmtD(t.fin)}</td>
                  <td style={{ padding:"4px 10px", textAlign:"center" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                      <div style={{ height:4, width:50, background:"#21262d", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${t.pct}%`, background:color }} />
                      </div>
                      <span style={{ fontSize:9, color:"#8b949e" }}>{t.pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:"4px 10px", textAlign:"center" }}>
                    <span style={{ fontSize:10, background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:3, padding:"1px 5px" }}>
                      {t.status.replace("_"," ")}
                    </span>
                  </td>
                  <td style={{ padding:"4px 10px", textAlign:"center", fontSize:10, color:"#8b949e" }}>{t.res || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
