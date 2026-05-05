"use client";
import type { PlanTask } from "./types";

interface Props {
  task: PlanTask;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteConfirmDialog({ task, onConfirm, onClose }: Props) {
  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:"#1c2128", border:"1px solid #30363d", borderRadius:8, padding:"20px 24px", width:380, boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
        <div style={{ marginBottom:12, fontWeight:600, fontSize:14, color:"#f85149" }}>
          🗑 Eliminar Fase
        </div>
        <p style={{ fontSize:12, color:"#e6edf3", margin:"0 0 8px" }}>
          ¿Eliminar la fase{" "}
          <strong style={{ color:"#388bfd" }}>{task.name}</strong>?
        </p>
        <p style={{ fontSize:11, color:"#8b9ab5", margin:"0 0 20px" }}>
          Esta acción no se puede deshacer. Las fases dependientes se re-vincularán al predecesor anterior.
        </p>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{
            background:"#21262d", border:"1px solid #30363d", color:"#8b9ab5",
            padding:"6px 16px", borderRadius:6, fontSize:12, cursor:"pointer",
          }}>Cancelar</button>
          <button onClick={onConfirm} style={{
            background:"#da3633", border:"none", color:"#fff",
            padding:"6px 16px", borderRadius:6, fontSize:12, cursor:"pointer",
          }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
