"use client";
import dynamic from "next/dynamic";

const PlanningClient = dynamic(() => import("./PlanningClient"), {
  ssr: false,
  loading: () => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#8b9ab5", fontSize:13, background:"#0d1117" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:14 }}>📋</div>
        <div>Cargando Planificación...</div>
      </div>
    </div>
  ),
});

export default function PlanningLoader() {
  return <PlanningClient />;
}
