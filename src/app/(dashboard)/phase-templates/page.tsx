"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useT, useLocale } from "@/lib/i18n/context";

type Template = {
  id: string;
  order: number;
  defaultDepType: string;        // FS | SS | FF | SF
  defaultPredOrder: number | null;
  defaultLagDays: number;
  name: string;
  description: string | null;
  durationDays: number;
  taskTitles: string[];
};

type DeleteImpact = {
  template: Template;
  impact: { storeCount: number; phaseCount: number; taskCount: number };
};

export default function PhaseTemplatesPage() {
  const t = useT();
  const { intlCode } = useLocale();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [addingPhase, setAddingPhase] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<DeleteImpact | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/phase-templates")
      .then((r) => r.json())
      .then((d) => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const totalDays = useMemo(
    () => templates.reduce((s, t) => s + (Number(t.durationDays) || 0), 0),
    [templates]
  );
  const totalTasks = useMemo(
    () => templates.reduce((s, t) => s + t.taskTitles.length, 0),
    [templates]
  );

  if (user && user.role !== "ADMIN") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t.phaseTemplatesPage.adminOnly}</p>
      </div>
    );
  }

  const update = (id: string, patch: Partial<Template>) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDirty(true);
  };

  const updateTaskTitle = (id: string, taskIdx: number, value: string) => {
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = [...t.taskTitles];
        next[taskIdx] = value;
        return { ...t, taskTitles: next };
      })
    );
    setDirty(true);
  };

  const addTask = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, taskTitles: [...t.taskTitles, ""] } : t))
    );
    setDirty(true);
  };

  const removeTask = (id: string, taskIdx: number) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, taskTitles: t.taskTitles.filter((_, j) => j !== taskIdx) } : t
      )
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/phase-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(templates),
    });
    if (res.ok) {
      setDirty(false);
      setSavedAt(new Date());
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || t.common.errorUpdate);
    }
    setSaving(false);
  };

  const handleAddPhase = async () => {
    setAddingPhase(true);
    const lastOrder = templates.length > 0 ? templates[templates.length - 1].order : 0;
    const res = await fetch("/api/phase-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Nueva Fase",
        description: "",
        durationDays: 7,
        taskTitles: [],
        defaultDepType: "FS",
        defaultPredOrder: null,
        defaultLagDays: 0,
        insertAfterOrder: lastOrder,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      // Reload templates to get updated list with new IDs/orders
      const fresh = await fetch("/api/phase-templates").then((r) => r.json());
      setTemplates(Array.isArray(fresh) ? fresh : []);
      setExpanded(data.template?.id ?? null);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Lỗi thêm giai đoạn");
    }
    setAddingPhase(false);
  };

  const askDelete = async (tpl: Template) => {
    const res = await fetch(`/api/phase-templates/${tpl.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setDeleteTarget(data as DeleteImpact);
    setDeleteConfirmText("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/phase-templates/${deleteTarget.template.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const fresh = await fetch("/api/phase-templates").then((r) => r.json());
      setTemplates(Array.isArray(fresh) ? fresh : []);
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Lỗi xóa giai đoạn");
    }
    setDeleting(false);
  };

  const PHASE_COLORS = [
    "#a78bfa","#60a5fa","#34d399","#fb923c","#f472b6",
    "#38bdf8","#facc15","#4ade80","#f87171","#c084fc","#22d3ee","#e879f9","#a3e635",
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto", paddingBottom: 100 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
          {t.phaseTemplatesPage.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {t.phaseTemplatesPage.subtitle}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6", lineHeight: 1 }}>{totalDays}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Total días del proyecto (~{(totalDays / 30).toFixed(1)} meses)
          </div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981", lineHeight: 1 }}>{templates.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{t.phaseTemplatesPage.statPhases}</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#8b5cf6", lineHeight: 1 }}>{totalTasks}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{t.phaseTemplatesPage.statTotalTasks}</div>
        </div>
      </div>

      {/* Phase list */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 90px 180px 290px 90px 36px",
          gap: 10, padding: "8px 16px",
          background: "rgba(15,23,42,0.03)",
          borderBottom: "1px solid var(--border)",
          fontSize: 10, fontWeight: 700,
          color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".5px",
          alignItems: "center",
        }}>
          <div>#</div>
          <div>Nombre de la Fase</div>
          <div style={{ textAlign: "center" }}>Días</div>
          <div>Descripción</div>
          <div style={{ textAlign: "center" }}>Dependencia</div>
          <div style={{ textAlign: "center" }}>Tareas</div>
          <div />
        </div>

        {templates.map((tpl, idx) => {
          const color = PHASE_COLORS[idx % PHASE_COLORS.length];
          const isExpanded = expanded === tpl.id;
          return (
            <div key={tpl.id}>
              {/* Phase row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 90px 180px 290px 90px 36px",
                gap: 10, padding: "10px 16px",
                borderBottom: isExpanded ? "none" : "1px solid rgba(15,23,42,0.04)",
                alignItems: "center",
                transition: "background .15s",
              }}>
                {/* Number badge */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${color}22`, color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                }}>
                  F.{idx + 1}
                </div>

                {/* Name input */}
                <input
                  className="input"
                  value={tpl.name}
                  onChange={(e) => update(tpl.id, { name: e.target.value })}
                  style={{ padding: "6px 10px", fontSize: 13 }}
                />

                {/* Duration */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                  <input
                    className="input"
                    type="number" min={1} max={365}
                    value={tpl.durationDays}
                    onChange={(e) => update(tpl.id, { durationDays: Number(e.target.value) })}
                    style={{ padding: "6px 8px", fontSize: 13, textAlign: "center", width: 60 }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>d</span>
                </div>

                {/* Description */}
                <input
                  className="input"
                  value={tpl.description || ""}
                  onChange={(e) => update(tpl.id, { description: e.target.value })}
                  placeholder="Descripción..."
                  style={{ padding: "6px 10px", fontSize: 12 }}
                />

                {/* Dependency config: predecessor + type + lag */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                  {/* Predecessor selector */}
                  <select
                    className="input"
                    value={tpl.defaultPredOrder ?? ""}
                    onChange={(e) => update(tpl.id, { defaultPredOrder: e.target.value === "" ? null : Number(e.target.value) })}
                    disabled={idx === 0}
                    title={idx === 0 ? "Primera fase: sin predecesor" : "Predecesor (— = anterior automático)"}
                    style={{ padding: "4px 4px", fontSize: 10, cursor: idx === 0 ? "not-allowed" : "pointer", flex: 1, minWidth: 0, opacity: idx === 0 ? 0.4 : 1 }}
                  >
                    <option value="">— F.{idx}</option>
                    {templates.filter((_, i) => i !== idx).map((p, i) => (
                      <option key={p.id} value={p.order}>F.{p.order}</option>
                    ))}
                  </select>
                  {/* Type selector */}
                  <select
                    className="input"
                    value={tpl.defaultDepType}
                    onChange={(e) => update(tpl.id, { defaultDepType: e.target.value })}
                    title="Tipo: FS (Fin→Inicio), SS (Inicio→Inicio), FF (Fin→Fin), SF (Inicio→Fin)"
                    style={{ padding: "4px 4px", fontSize: 10, cursor: "pointer", width: 50 }}
                  >
                    <option value="FS">FS</option>
                    <option value="SS">SS</option>
                    <option value="FF">FF</option>
                    <option value="SF">SF</option>
                  </select>
                  {/* Lag days */}
                  <input
                    className="input"
                    type="number" min={0} max={365}
                    value={tpl.defaultLagDays}
                    onChange={(e) => update(tpl.id, { defaultLagDays: Math.max(0, Number(e.target.value) || 0) })}
                    title="Lag (días de retraso)"
                    style={{ padding: "4px 4px", fontSize: 10, textAlign: "center", width: 44 }}
                  />
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>d</span>
                </div>

                {/* Task expand button */}
                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : tpl.id)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: "pointer",
                      background: isExpanded ? "rgba(59,130,246,0.2)" : "rgba(15,23,42,0.05)",
                      border: `1px solid ${isExpanded ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                      color: isExpanded ? "#93c5fd" : "var(--text-secondary)",
                    }}
                  >
                    📋 {tpl.taskTitles.length} {isExpanded ? "▴" : "▾"}
                  </button>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => askDelete(tpl)}
                  disabled={templates.length <= 1}
                  title={templates.length <= 1 ? "Debe haber al menos 1 fase" : "Eliminar fase de todos los stores"}
                  style={{
                    width: 30, height: 30, borderRadius: 6,
                    background: "transparent", border: "1px solid transparent",
                    color: "var(--text-muted)", cursor: templates.length <= 1 ? "not-allowed" : "pointer",
                    fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s",
                    opacity: templates.length <= 1 ? 0.3 : 1,
                  }}
                  onMouseEnter={(e) => { if (templates.length > 1) { (e.target as any).style.background = "rgba(239,68,68,0.15)"; (e.target as any).style.color = "#ef4444"; (e.target as any).style.borderColor = "rgba(239,68,68,0.3)"; } }}
                  onMouseLeave={(e) => { (e.target as any).style.background = "transparent"; (e.target as any).style.color = "var(--text-muted)"; (e.target as any).style.borderColor = "transparent"; }}
                >
                  ×
                </button>
              </div>

              {/* Task expand panel */}
              {isExpanded && (
                <div style={{
                  padding: "10px 16px 14px 66px",
                  background: "rgba(59,130,246,0.04)",
                  borderBottom: "1px solid rgba(59,130,246,0.2)",
                }}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>
                    {t.phaseTemplatesPage.taskHeaderTitle}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {tpl.taskTitles.map((title, taskIdx) => (
                      <div key={taskIdx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", width: 20, textAlign: "right" }}>{taskIdx + 1}</span>
                        <input
                          className="input"
                          value={title}
                          onChange={(e) => updateTaskTitle(tpl.id, taskIdx, e.target.value)}
                          style={{ padding: "5px 10px", fontSize: 12, flex: 1 }}
                        />
                        <button
                          onClick={() => removeTask(tpl.id, taskIdx)}
                          style={{
                            padding: "4px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                            color: "#fca5a5",
                          }}
                        >✕</button>
                      </div>
                    ))}
                    <button
                      onClick={() => addTask(tpl.id)}
                      style={{
                        padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                        background: "rgba(15,23,42,0.03)", border: "1px dashed var(--border)",
                        color: "var(--text-secondary)", marginTop: 4, alignSelf: "flex-start",
                      }}
                    >
                      {t.phaseTemplatesPage.addTask}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add phase row */}
        <div style={{ padding: "12px 16px" }}>
          <button
            onClick={handleAddPhase}
            disabled={addingPhase}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: addingPhase ? "wait" : "pointer",
              background: "rgba(59,130,246,0.07)",
              border: "1px dashed rgba(59,130,246,0.35)",
              color: "#60a5fa",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {addingPhase ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Agregando...</> : "＋ Agregar nueva fase (aplica a todos los stores)"}
          </button>
        </div>
      </div>

      {/* SS info box */}
      <div style={{
        marginTop: 16, background: "rgba(16,185,129,0.07)",
        border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 16px",
        fontSize: 12, color: "var(--text-secondary)",
      }}>
        <span style={{ color: "#34d399", fontWeight: 700 }}>⚡ SS (Start-to-Start):</span>{" "}
        La fase inicia al mismo tiempo que su predecesora, permitiendo ejecución paralela.{" "}
        El lag en días puede configurarse por store desde la vista de Gantt.{" "}
        <span style={{ color: "var(--text-muted)" }}>FS = secuencial (predeterminado).</span>
      </div>

      {error && (
        <div style={{
          marginTop: 14, fontSize: 13, color: "#fca5a5",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 8, padding: "10px 14px",
        }}>⚠️ {error}</div>
      )}

      {/* Sticky save bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 280, right: 0,
        background: "rgba(15,23,42,0.98)", borderTop: "1px solid var(--border)",
        padding: "12px 32px",
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12,
        backdropFilter: "blur(8px)", zIndex: 30,
      }}>
        {savedAt && !dirty && (
          <span style={{ fontSize: 12, color: "#6ee7b7" }}>
            {t.phaseTemplatesPage.savedAt.replace("{time}", savedAt.toLocaleTimeString(intlCode))}
          </span>
        )}
        {dirty && <span style={{ fontSize: 12, color: "#fcd34d" }}>{t.phaseTemplatesPage.dirty}</span>}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="gradient-btn"
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: !dirty || saving ? "not-allowed" : "pointer",
            opacity: !dirty || saving ? 0.5 : 1,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {saving
            ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {t.phaseTemplatesPage.savingBtn}</>
            : t.phaseTemplatesPage.saveBtn}
        </button>
      </div>

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 14, padding: 24, width: 420, maxWidth: "95vw",
          }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>🗑️ Eliminar fase</div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
              Está a punto de eliminar{" "}
              <strong style={{ color: "var(--text-primary)" }}>F.{deleteTarget.template.order} {deleteTarget.template.name}</strong>{" "}
              de la plantilla y de{" "}
              <strong style={{ color: "#ef4444" }}>
                {deleteTarget.impact.storeCount} stores
              </strong>
              , eliminando{" "}
              <strong style={{ color: "#ef4444" }}>
                {deleteTarget.impact.taskCount} tareas
              </strong>.
              <br /><br />
              Esta acción es <strong style={{ color: "#ef4444" }}>irreversible</strong>. Escriba{" "}
              <code style={{ background: "rgba(15,23,42,0.1)", padding: "1px 6px", borderRadius: 4, color: "#fca5a5" }}>
                XÁC NHẬN
              </code>{" "}
              para confirmar.
            </p>
            <input
              className="input"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escriba XÁC NHẬN"
              style={{ marginBottom: 16, padding: "8px 12px", fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
                style={{
                  padding: "8px 16px", borderRadius: 8, background: "transparent",
                  border: "1px solid var(--border)", color: "var(--text-secondary)",
                  fontSize: 13, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== "XÁC NHẬN" || deleting}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: deleteConfirmText === "XÁC NHẬN" ? "#ef4444" : "#6b2222",
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: deleteConfirmText === "XÁC NHẬN" && !deleting ? "pointer" : "not-allowed",
                  opacity: deleteConfirmText === "XÁC NHẬN" ? 1 : 0.5,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {deleting
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Eliminando...</>
                  : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
