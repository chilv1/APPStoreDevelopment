"use client";
import { useState } from "react";
import type { ZoomMode } from "./types";

interface Preferences {
  defaultZoom: ZoomMode;
  defaultFilter: string;
  showWeekends: boolean;
  autoSaveBaseline: boolean;
}

interface Props {
  prefs: Preferences;
  onSave: (prefs: Preferences) => void;
  onClose: () => void;
}

export default function PreferencesModal({ prefs: initial, onSave, onClose }: Props) {
  const [prefs, setPrefs] = useState<Preferences>(initial);

  const inp: React.CSSProperties = {
    background:"#21262d", border:"1px solid #30363d", color:"#e6edf3",
    padding:"5px 8px", borderRadius:4, fontSize:12, width:"100%", outline:"none",
  };
  const lbl: React.CSSProperties = { fontSize:11, color:"#8b9ab5", display:"flex", flexDirection:"column", gap:4 };

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:"#1c2128", border:"1px solid #30363d", borderRadius:8, padding:"20px 24px", width:420, boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
        <div style={{ marginBottom:16, fontWeight:600, fontSize:14, color:"#e6edf3" }}>⚙ Preferencias de Planificación</div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <label style={lbl}>
            Zoom predeterminado
            <select value={prefs.defaultZoom} onChange={e => setPrefs({ ...prefs, defaultZoom: e.target.value as ZoomMode })} style={inp}>
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="quarter">Trimestre</option>
            </select>
          </label>

          <label style={lbl}>
            Filtro predeterminado
            <select value={prefs.defaultFilter} onChange={e => setPrefs({ ...prefs, defaultFilter: e.target.value })} style={inp}>
              <option value="active">En progreso / Planning</option>
              <option value="completed">Completadas</option>
              <option value="on_hold">En espera</option>
              <option value="all">Todas</option>
            </select>
          </label>

          <label style={{ ...lbl, flexDirection:"row", alignItems:"center", gap:8 }}>
            <input type="checkbox" checked={prefs.showWeekends} onChange={e => setPrefs({ ...prefs, showWeekends: e.target.checked })} />
            Resaltar fines de semana en Gantt
          </label>

          <label style={{ ...lbl, flexDirection:"row", alignItems:"center", gap:8 }}>
            <input type="checkbox" checked={prefs.autoSaveBaseline} onChange={e => setPrefs({ ...prefs, autoSaveBaseline: e.target.checked })} />
            Guardar línea base automáticamente al cambio de fase
          </label>
        </div>

        <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#484f58" }}>Las preferencias se guardan en este navegador</span>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose} style={{ background:"#21262d", border:"1px solid #30363d", color:"#8b9ab5", padding:"6px 16px", borderRadius:6, fontSize:12, cursor:"pointer" }}>Cancelar</button>
            <button onClick={() => { onSave(prefs); onClose(); }} style={{ background:"linear-gradient(135deg,#388bfd,#8957e5)", border:"none", color:"#fff", padding:"6px 16px", borderRadius:6, fontSize:12, cursor:"pointer" }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Preferences };
