"use client";
import { useState, useMemo } from "react";
import type { PlanTask } from "./types";

interface AddTaskOpts {
  storeId: string;
  name: string;
  durationDays: number;
  dependsOnId: string | null;
  dependencyType: string;
  lagDays: number;
  insertAfterOrder?: number;
}

interface Props {
  stores: PlanTask[];       // summary tasks only
  tasks: PlanTask[];        // all tasks
  selectedId: string | null;
  onConfirm: (opts: AddTaskOpts) => void;
  onClose: () => void;
}

export default function AddTaskModal({ stores, tasks, selectedId, onConfirm, onClose }: Props) {
  const selectedTask = tasks.find(t => t.id === selectedId);
  const initialStoreId = selectedTask?.storeId ?? stores[0]?.storeId ?? "";

  const [storeId, setStoreId]           = useState(initialStoreId);
  const [name, setName]                 = useState("");
  const [dur, setDur]                   = useState(7);
  const [insertAfterIdx, setInsertAfterIdx] = useState<number>(-1); // -1 = append at end
  const [depType, setDepType]           = useState("FS");
  const [lagDays, setLagDays]           = useState(0);

  const storePhaseTasks = useMemo(
    () => tasks.filter(t => t.storeId === storeId && t.type !== "summary"),
    [tasks, storeId],
  );

  function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed || !storeId) return;
    const insertAfterOrder = insertAfterIdx >= 0 ? insertAfterIdx + 1 : undefined;
    const dependsOnId      = insertAfterIdx >= 0 ? (storePhaseTasks[insertAfterIdx]?.id ?? null) : null;
    onConfirm({ storeId, name: trimmed, durationDays: dur, dependsOnId, dependencyType: depType, lagDays, insertAfterOrder });
  }

  const inp: React.CSSProperties = {
    background: "#21262d", border: "1px solid #30363d", color: "#e6edf3",
    padding: "5px 8px", borderRadius: 4, fontSize: 12, width: "100%", outline: "none",
  };
  const lbl: React.CSSProperties = { fontSize: 11, color: "#8b9ab5", display: "flex", flexDirection: "column", gap: 4 };

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:"#1c2128", border:"1px solid #30363d", borderRadius:8, padding:"20px 24px", width:460, boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
        <div style={{ marginBottom:16, fontWeight:600, fontSize:14, color:"#e6edf3" }}>＋ Nueva Fase</div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <label style={lbl}>
            Tienda / Proyecto *
            <select
              value={storeId}
              onChange={e => { setStoreId(e.target.value); setInsertAfterIdx(-1); }}
              style={inp}
            >
              {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.name}</option>)}
            </select>
          </label>

          <label style={lbl}>
            Nombre de la fase *
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirm()}
              placeholder="Ej: Firma de contrato"
              style={inp}
              autoFocus
            />
          </label>

          <label style={lbl}>
            Duración (días)
            <input
              type="number" min={1} value={dur}
              onChange={e => setDur(Math.max(1, Number(e.target.value)))}
              style={{ ...inp, width:100 }}
            />
          </label>

          <label style={lbl}>
            Insertar después de
            <select
              value={insertAfterIdx}
              onChange={e => setInsertAfterIdx(Number(e.target.value))}
              style={inp}
            >
              <option value={-1}>— Al final —</option>
              {storePhaseTasks.map((t, i) => (
                <option key={t.id} value={i}>{i + 1}. {t.name}</option>
              ))}
            </select>
          </label>

          <div style={{ display:"flex", gap:12 }}>
            <label style={{ ...lbl, flex:1 }}>
              Tipo de dependencia
              <select value={depType} onChange={e => setDepType(e.target.value)} style={inp}>
                <option value="FS">FS — Fin a Inicio</option>
                <option value="SS">SS — Inicio a Inicio</option>
                <option value="FF">FF — Fin a Fin</option>
                <option value="SF">SF — Inicio a Fin</option>
              </select>
            </label>
            {depType !== "FS" && (
              <label style={{ ...lbl, width:100 }}>
                Lag (días)
                <input
                  type="number" value={lagDays}
                  onChange={e => setLagDays(Number(e.target.value))}
                  style={{ ...inp, width:"100%" }}
                />
              </label>
            )}
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{
            background:"#21262d", border:"1px solid #30363d", color:"#8b9ab5",
            padding:"6px 16px", borderRadius:6, fontSize:12, cursor:"pointer",
          }}>Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            style={{
              background: name.trim() ? "linear-gradient(135deg,#388bfd,#8957e5)" : "#21262d",
              border:"none", color: name.trim() ? "#fff" : "#484f58",
              padding:"6px 16px", borderRadius:6, fontSize:12, cursor: name.trim() ? "pointer" : "default",
              transition:"all .15s",
            }}
          >Crear Fase</button>
        </div>
      </div>
    </div>
  );
}
