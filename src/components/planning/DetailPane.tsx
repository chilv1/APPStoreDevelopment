"use client";
import { useEffect, useRef, useState } from "react";
import type { PlanTask, DepType } from "./types";

interface Props {
  task: PlanTask;
  allTasks: PlanTask[];
  onClose: () => void;
  onUpdate: (patch: Partial<PlanTask>) => void;
}

interface PhaseNote {
  id: string;
  content: string;
  createdAt: string;
  author?: { name: string } | null;
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

const STATUS_OPTS = [
  { value:"NOT_STARTED", label:"○ No iniciado",  color:"#484f58" },
  { value:"IN_PROGRESS", label:"▶ En progreso",  color:"#388bfd" },
  { value:"BLOCKED",     label:"⚠ Bloqueado",    color:"#f85149" },
  { value:"COMPLETED",   label:"✔ Completado",   color:"#3fb950" },
];

export default function DetailPane({ task, allTasks, onClose, onUpdate }: Props) {
  const [localName, setLocalName] = useState(task.name);
  const [localDur,  setLocalDur]  = useState(task.dur);
  const [notes, setNotes]         = useState<PhaseNote[]>([]);
  const [noteText, setNoteText]   = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setLocalName(task.name); }, [task.id, task.name]);
  useEffect(() => { setLocalDur(task.dur);   }, [task.id, task.dur]);

  // Load notes when task changes and panel is open
  useEffect(() => {
    if (!notesOpen || !task.phaseId) return;
    fetch(`/api/phases/${task.phaseId}/notes`)
      .then(r => r.ok ? r.json() : [])
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [task.phaseId, notesOpen]);

  async function addNote() {
    if (!noteText.trim() || !task.phaseId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/phases/${task.phaseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes(prev => [note, ...prev]);
        setNoteText("");
      }
    } finally { setSaving(false); }
  }

  const predIdx   = task.pred ? allTasks.findIndex(t => t.id === task.pred) + 1 : "";
  const toDateStr = (d: Date | null) => d ? d.toISOString().slice(0, 10) : "";
  const statusColor = STATUS_OPTS.find(s => s.value === task.status)?.color ?? "#484f58";

  return (
    <div style={{ background:"#161b22", borderTop:"1px solid #30363d", flexShrink:0, maxHeight:320, overflowY:"auto" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", padding:"8px 16px 6px", position:"sticky", top:0, background:"#161b22", zIndex:10 }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#79c0ff" }}>
          📋 {task.name.slice(0, 45)}{task.name.length>45?"…":""}
        </span>
        <button
          onClick={() => setNotesOpen(v => !v)}
          title="Notas de fase"
          style={{ marginLeft:"auto", marginRight:8, background:"rgba(56,139,253,.12)", border:"1px solid #30363d", color:"#388bfd", cursor:"pointer", fontSize:11, padding:"2px 8px", borderRadius:4, lineHeight:1.5 }}>
          📝 {notes.length > 0 ? notes.length : "+"} Notas
        </button>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#484f58", cursor:"pointer", fontSize:16, lineHeight:1 }}>✕</button>
      </div>

      {/* Fields grid */}
      <div style={{ padding:"0 16px 10px", display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px 16px" }}>
        <Field label="Nombre">
          <input value={localName} onChange={e => setLocalName(e.target.value)}
            onBlur={() => { if (localName !== task.name) onUpdate({ name: localName }); }}
            style={INPUT} />
        </Field>

        <Field label="Estado">
          <select value={task.status} onChange={e => onUpdate({ status: e.target.value })}
            style={{ ...INPUT, cursor:"pointer", color: statusColor, fontWeight:600 }}>
            {STATUS_OPTS.map(s => (
              <option key={s.value} value={s.value} style={{ background:"#1c2128", color: s.color }}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Duración (días)">
          <input type="number" min={1} value={localDur}
            onChange={e => setLocalDur(Math.max(1, parseInt(e.target.value) || 1))}
            onBlur={() => { if (localDur !== task.dur) onUpdate({ dur: localDur }); }}
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
          <input type="number" min={0} defaultValue={predIdx} key={`pred-${task.id}`}
            onBlur={e => {
              const idx = parseInt(e.target.value) - 1;
              const target = allTasks[idx];
              onUpdate({ pred: target?.id ?? null });
            }}
            style={INPUT} />
        </Field>

        <Field label="Tipo dependencia">
          <select value={task.depType} onChange={e => onUpdate({ depType: e.target.value as DepType })}
            style={{ ...INPUT, cursor:"pointer" }}>
            {(["FS","SS","FF","SF"] as DepType[]).map(dt => (
              <option key={dt} value={dt} style={{ background:"#1c2128" }}>{dt} — {
                dt==="FS"?"Fin→Inicio":dt==="SS"?"Inicio→Inicio":dt==="FF"?"Fin→Fin":"Inicio→Fin"
              }</option>
            ))}
          </select>
        </Field>

        <Field label="Lag (días)">
          <input type="number" min={0} value={task.lag}
            onChange={e => onUpdate({ lag: Math.max(0, parseInt(e.target.value) || 0) })}
            style={INPUT} />
        </Field>

        <Field label="Recurso">
          <input value={task.res} onChange={e => onUpdate({ res: e.target.value })}
            style={INPUT} placeholder="Asignar recurso..." />
        </Field>
      </div>

      {/* Notes panel — collapsible */}
      {notesOpen && (
        <div style={{ borderTop:"1px solid #21262d", padding:"8px 16px 12px" }}>
          <div style={{ fontSize:11, color:"#484f58", marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>
            Notas de seguimiento
          </div>

          {/* Add note */}
          <div style={{ display:"flex", gap:6, marginBottom:10 }}>
            <textarea
              ref={noteInputRef}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
              placeholder="Agregar nota... (Enter para guardar, Shift+Enter nueva línea)"
              rows={2}
              style={{ flex:1, ...INPUT, resize:"vertical", fontFamily:"inherit" }}
            />
            <button onClick={addNote} disabled={saving || !noteText.trim()}
              style={{ background: noteText.trim() ? "linear-gradient(135deg,#388bfd,#8957e5)" : "#21262d", border:"none", color: noteText.trim() ? "#fff" : "#484f58", padding:"4px 12px", borderRadius:4, fontSize:11, cursor: noteText.trim() ? "pointer" : "default", alignSelf:"flex-end" }}>
              {saving ? "…" : "Guardar"}
            </button>
          </div>

          {/* Notes list */}
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:120, overflowY:"auto" }}>
            {notes.length === 0 ? (
              <div style={{ fontSize:11, color:"#484f58", fontStyle:"italic" }}>Sin notas aún.</div>
            ) : notes.map(n => (
              <div key={n.id} style={{ background:"#1c2128", border:"1px solid #21262d", borderRadius:4, padding:"6px 10px" }}>
                <div style={{ fontSize:11, color:"#e6edf3" }}>{n.content}</div>
                <div style={{ fontSize:10, color:"#484f58", marginTop:3 }}>
                  {n.author?.name ?? "Sistema"} · {new Date(n.createdAt).toLocaleDateString("es")} {new Date(n.createdAt).toLocaleTimeString("es", { hour:"2-digit", minute:"2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
