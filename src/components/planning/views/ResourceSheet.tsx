"use client";
import type { PlanResource, PlanTask } from "../types";

interface Props {
  resources: PlanResource[];
  tasks: PlanTask[];
  onAddResource: () => void;
}

export default function ResourceSheet({ resources, tasks, onAddResource }: Props) {
  const resourceTaskMap = new Map<string, number>();
  tasks.forEach(t => { if (t.res) resourceTaskMap.set(t.res, (resourceTaskMap.get(t.res)||0)+1); });

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"8px 12px", background:"#1c2128", borderBottom:"1px solid #30363d", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:600, color:"#79c0ff" }}>👥 Hoja de Recursos</span>
        <button onClick={onAddResource} style={{ marginLeft:"auto", background:"rgba(56,139,253,.1)", border:"1px solid rgba(56,139,253,.3)", color:"#388bfd", fontSize:11, padding:"3px 10px", borderRadius:4, cursor:"pointer" }}>
          + Agregar recurso
        </button>
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#1c2128", position:"sticky", top:0, zIndex:5 }}>
              {["⚑","Nombre del recurso","Tipo","Grupo","Unidades máx.","Tarifa estándar","% Asignado","Asignaciones"].map((h,i) => (
                <th key={i} style={{ padding:"6px 10px", fontSize:10, fontWeight:600, color:"#484f58", textTransform:"uppercase", letterSpacing:.4, borderBottom:"1px solid #30363d", textAlign:i===0?"center":"left", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map(r => {
              const assigned = resourceTaskMap.get(r.name) || 0;
              const overAlloc = r.overAllocated;
              return (
                <tr key={r.id} style={{ borderBottom:"1px solid #21262d" }}>
                  <td style={{ padding:"5px 10px", textAlign:"center", color:overAlloc?"#f85149":"#484f58", fontSize:12 }}>{overAlloc?"⚠":""}</td>
                  <td style={{ padding:"5px 10px", fontSize:12, color:"#e6edf3", fontWeight:500 }}>{r.name}</td>
                  <td style={{ padding:"5px 10px", fontSize:11, color:"#8b949e" }}>{r.type}</td>
                  <td style={{ padding:"5px 10px", fontSize:11, color:"#8b949e" }}>{r.group}</td>
                  <td style={{ padding:"5px 10px", fontSize:11, color:overAlloc?"#f85149":"#e6edf3", textAlign:"center" }}>{r.units}</td>
                  <td style={{ padding:"5px 10px", fontSize:11, color:"#8b949e" }}>{r.rate}</td>
                  <td style={{ padding:"5px 10px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:6, background:"#21262d", borderRadius:3, overflow:"hidden", minWidth:60 }}>
                        <div style={{ height:"100%", width:`${Math.min(parseInt(r.units),100)}%`, background:overAlloc?"#f85149":"#238636", borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:10, color:overAlloc?"#f85149":"#8b949e", minWidth:32 }}>{r.units}{overAlloc?" ⚠":""}</span>
                    </div>
                  </td>
                  <td style={{ padding:"5px 10px", fontSize:11, color:"#8b949e", textAlign:"center" }}>{assigned}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
