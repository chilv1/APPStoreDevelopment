"use client";
import type { PlanTask, DepType } from "./types";

interface Props {
  task: PlanTask;
  allTasks: PlanTask[];
  onClose: () => void;
  onUpdate: (patch: Partial<PlanTask>) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:"#484f58", textTransform:"uppercase", letterSpacing:.4 }}>{label}</label>
      {children}
    </div>
  );
}

const INPUT = {
  background:"#21262d", border:"1px solid #30363d", color:"#e6edf3",
  fontSize:11, padding:"4px 8px", borderRadius:3, width:"100%", outline:"none",
} as const;

export default function DetailPane({ task, allTasks, onClose, onUpdate }: Props) {
  const predIdx = task.pred ? allTasks.findIndex(t => t.id === task.pred) + 1 : "";

  const toDateStr = (d: Date | null) => d ? d.toISOString().slice(0, 10) : "";

  return (
    <div style={{ background:"#161b22", borderTop:"1px solid #30363d", padding:"10px 16px", flexShrink:0, minHeight:130, maxHeight:220 }}>
      <div style={{ display:"flex", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#79c0ff" }}>📋 Detalles: {task.name.slice(0, 40)}{task.name.length>40?"…":""}</span>
        <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none", color:"#484f58", cursor:"pointer", fontSize:16, lineHeight:1 }}>✕</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px 16px" }}>
        <Field label="Nombre">
          <input value={task.name} onChange={e => onUpdate({ name: e.target.value })}
            style={INPUT} />
        </Field>

        <Field label="Duración (días)">
          <input type="number" min={0} value={task.dur}
            onChange={e => onUpdate({ dur: Math.max(0, parseInt(e.target.value)||0) })}
            style={INPUT} />
        </Field>

        <Field label="Inicio">
          <input type="date" value={toDateStr(task.start)}
            onChange={e => { if(e.target.value) onUpdate({ start: new Date(e.target.value) }); }}
            style={INPUT} />
        </Field>

        <Field label="Fin">
          <input type="date" value={toDateStr(task.fin)}
            onChange={e => { if(e.target.value) onUpdate({ fin: new Date(e.target.value) }); }}
            style={INPUT} />
        </Field>

        <Field label="% Completado">
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input type="range" min={0} max={100} value={task.pct}
              onChange={e => onUpdate({ pct: parseInt(e.target.value) })}
              style={{ flex:1, accentColor:"#388bfd" }} />
            <span style={{ fontSize:11, color:"#3fb950", minWidth:28 }}>{task.pct}%</span>
          </div>
        </Field>

        <Field label="Predecesor (N°)">
          <input type="number" min={0} defaultValue={predIdx}
            onBlur={e => {
              const idx = parseInt(e.target.value) - 1;
              const target = allTasks[idx];
              onUpdate({ pred: target?.id ?? null });
            }}
            style={INPUT} />
        </Field>

        <Field label="Tipo dependencia">
          <select value={task.depType}
            onChange={e => onUpdate({ depType: e.target.value as DepType })}
            style={{ ...INPUT, cursor:"pointer" }}>
            {(["FS","SS","FF","SF"] as DepType[]).map(dt => (
              <option key={dt} value={dt} style={{ background:"#1c2128" }}>{dt} — {
                dt==="FS"?"Fin→Inicio":dt==="SS"?"Inicio→Inicio":dt==="FF"?"Fin→Fin":"Inicio→Fin"
              }</option>
            ))}
          </select>
        </Field>

        <Field label="Recurso">
          <input value={task.res} onChange={e => onUpdate({ res: e.target.value })}
            style={INPUT} placeholder="Asignar recurso..." />
        </Field>
      </div>
    </div>
  );
}
