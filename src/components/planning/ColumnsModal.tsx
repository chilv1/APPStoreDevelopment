"use client";

interface Props {
  visible: Set<string>;
  onChange: (next: Set<string>) => void;
  onClose: () => void;
}

const COLUMNS = [
  { key: "indicator", label: "Indicador (✔/▶/○)", required: false },
  { key: "id",        label: "ID (Número)",        required: true  },
  { key: "expand",    label: "Expandir/Contraer",  required: false },
  { key: "name",      label: "Nombre de tarea",    required: true  },
  { key: "dur",       label: "Días",                required: false },
  { key: "start",     label: "Inicio",              required: false },
  { key: "fin",       label: "Fin",                 required: false },
  { key: "pred",      label: "Predecesor",          required: false },
  { key: "progress",  label: "Avance (%)",          required: false },
];

export default function ColumnsModal({ visible, onChange, onClose }: Props) {
  function toggle(key: string) {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:"#1c2128", border:"1px solid #30363d", borderRadius:8, padding:"20px 24px", width:360, boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
        <div style={{ marginBottom:14, fontWeight:600, fontSize:14, color:"#e6edf3" }}>⊞ Personalizar columnas</div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {COLUMNS.map(col => (
            <label key={col.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 8px", background:"#161b22", border:"1px solid #21262d", borderRadius:4, cursor: col.required ? "default" : "pointer", opacity: col.required ? 0.6 : 1 }}>
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                disabled={col.required}
                onChange={() => !col.required && toggle(col.key)}
              />
              <span style={{ fontSize:12, color:"#e6edf3", flex:1 }}>{col.label}</span>
              {col.required && <span style={{ fontSize:10, color:"#484f58" }}>obligatoria</span>}
            </label>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" }}>
          <button
            onClick={() => onChange(new Set(COLUMNS.map(c => c.key)))}
            style={{ background:"#21262d", border:"1px solid #30363d", color:"#8b9ab5", padding:"6px 12px", borderRadius:6, fontSize:11, cursor:"pointer" }}>
            Mostrar todas
          </button>
          <button onClick={onClose} style={{ background:"linear-gradient(135deg,#388bfd,#8957e5)", border:"none", color:"#fff", padding:"6px 16px", borderRadius:6, fontSize:12, cursor:"pointer" }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export const ALL_COLUMNS = COLUMNS.map(c => c.key);
