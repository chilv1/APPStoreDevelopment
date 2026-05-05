"use client";
import { useEffect } from "react";

export default function PlanificacionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("Planificación error:", error); }, [error]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", background:"#0d1117", color:"#e6edf3", gap:16, fontFamily:"'Segoe UI',sans-serif" }}>
      <div style={{ fontSize:48 }}>⚠️</div>
      <div style={{ fontSize:18, fontWeight:700, color:"#f85149" }}>Error en Planificación</div>
      <div style={{ fontSize:13, color:"#8b949e", maxWidth:400, textAlign:"center" }}>
        {error.message || "Ocurrió un error inesperado al cargar la vista de planificación."}
      </div>
      {error.digest && (
        <div style={{ fontSize:11, color:"#484f58" }}>ID: {error.digest}</div>
      )}
      <button onClick={reset} style={{ background:"linear-gradient(135deg,#388bfd,#8957e5)", border:"none", color:"#fff", padding:"8px 24px", borderRadius:6, fontSize:13, cursor:"pointer", marginTop:8 }}>
        Reintentar
      </button>
    </div>
  );
}
