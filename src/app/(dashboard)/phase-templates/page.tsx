"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PHASE_ICONS } from "@/lib/utils";
import { useT, useLocale } from "@/lib/i18n/context";

type Template = {
  phaseNumber: number;
  name: string;
  description: string | null;
  durationDays: number;
  taskTitles: string[];
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
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/phase-templates").then(r => r.json()).then(d => {
      setTemplates(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const totalDays = useMemo(() => templates.reduce((s, t) => s + (Number(t.durationDays) || 0), 0), [templates]);

  if (user && user.role !== "ADMIN") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t.phaseTemplatesPage.adminOnly}</p>
      </div>
    );
  }

  const update = (idx: number, patch: Partial<Template>) => {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t));
    setDirty(true);
  };

  const updateTaskTitle = (idx: number, taskIdx: number, value: string) => {
    setTemplates(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const next = [...t.taskTitles];
      next[taskIdx] = value;
      return { ...t, taskTitles: next };
    }));
    setDirty(true);
  };

  const addTask = (idx: number) => {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, taskTitles: [...t.taskTitles, ""] } : t));
    setDirty(true);
  };

  const removeTask = (idx: number, taskIdx: number) => {
    setTemplates(prev => prev.map((t, i) => i === idx
      ? { ...t, taskTitles: t.taskTitles.filter((_, j) => j !== taskIdx) }
      : t));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/phase-templates", {
      method: "PUT", headers: { "Content-Type": "application/json" },
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

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto", paddingBottom: 100 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
          {t.phaseTemplatesPage.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {t.phaseTemplatesPage.subtitle}
        </p>
      </div>

      {/* Summary */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20,
      }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6", lineHeight: 1 }}>{totalDays}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            {t.phaseTemplatesPage.statTotalDays} {t.phaseTemplatesPage.statTotalDaysHint.replace("{n}", String(Math.round(totalDays / 30 * 10) / 10))}
          </div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981", lineHeight: 1 }}>{templates.length}/11</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{t.phaseTemplatesPage.statPhases}</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#8b5cf6", lineHeight: 1 }}>
            {templates.reduce((s, tpl) => s + tpl.taskTitles.length, 0)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{t.phaseTemplatesPage.statTotalTasks}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <table className="data-table" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: 50 }}>{t.phaseTemplatesPage.tableNo}</th>
              <th style={{ width: 220 }}>{t.phaseTemplatesPage.tablePhaseName}</th>
              <th style={{ width: 110 }}>{t.phaseTemplatesPage.tableDuration}</th>
              <th>{t.phaseTemplatesPage.tableDescription}</th>
              <th style={{ width: 120 }}>{t.phaseTemplatesPage.tableTasks}</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((tpl, idx) => (
              <>
                <tr key={tpl.phaseNumber}>
                  <td style={{ verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{PHASE_ICONS[tpl.phaseNumber]}</span>
                      <strong style={{ color: "#f0f4ff" }}>{t.storesList.phaseAbbrev}{tpl.phaseNumber}</strong>
                    </div>
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <input className="input" value={tpl.name}
                      onChange={(e) => update(idx, { name: e.target.value })}
                      style={{ padding: "6px 10px", fontSize: 13 }} />
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <input className="input" type="number" min={1} value={tpl.durationDays}
                      onChange={(e) => update(idx, { durationDays: Number(e.target.value) })}
                      style={{ padding: "6px 10px", fontSize: 13, textAlign: "center" }} />
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <input className="input" value={tpl.description || ""}
                      onChange={(e) => update(idx, { description: e.target.value })}
                      placeholder={t.phaseTemplatesPage.phaseDescPh}
                      style={{ padding: "6px 10px", fontSize: 13 }} />
                  </td>
                  <td style={{ verticalAlign: "top", textAlign: "center" }}>
                    <button onClick={() => setExpanded(expanded === tpl.phaseNumber ? null : tpl.phaseNumber)} style={{
                      padding: "5px 10px", borderRadius: 6,
                      background: expanded === tpl.phaseNumber ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${expanded === tpl.phaseNumber ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                      color: expanded === tpl.phaseNumber ? "#93c5fd" : "var(--text-secondary)",
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>
                      {t.phaseTemplatesPage.tasksLabel.replace("{n}", String(tpl.taskTitles.length))} {expanded === tpl.phaseNumber ? "▴" : "▾"}
                    </button>
                  </td>
                </tr>
                {expanded === tpl.phaseNumber && (
                  <tr key={`${tpl.phaseNumber}-tasks`}>
                    <td colSpan={5} style={{ background: "rgba(59,130,246,0.04)", borderTop: "1px solid rgba(59,130,246,0.2)" }}>
                      <div style={{ padding: "10px 4px" }}>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>
                          {t.phaseTemplatesPage.taskHeaderTitle}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {tpl.taskTitles.map((title, taskIdx) => (
                            <div key={taskIdx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "var(--text-muted)", width: 24, textAlign: "center" }}>{taskIdx + 1}</span>
                              <input className="input" value={title}
                                onChange={(e) => updateTaskTitle(idx, taskIdx, e.target.value)}
                                style={{ padding: "5px 10px", fontSize: 12, flex: 1 }} />
                              <button onClick={() => removeTask(idx, taskIdx)} style={{
                                padding: "4px 8px", borderRadius: 4,
                                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                                color: "#fca5a5", fontSize: 11, cursor: "pointer",
                              }}>✕</button>
                            </div>
                          ))}
                          <button onClick={() => addTask(idx)} style={{
                            padding: "5px 10px", borderRadius: 6,
                            background: "rgba(255,255,255,0.03)", border: "1px dashed var(--border)",
                            color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                            marginTop: 4, alignSelf: "flex-start",
                          }}>{t.phaseTemplatesPage.addTask}</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
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
        background: "rgba(15, 23, 42, 0.98)", borderTop: "1px solid var(--border)",
        padding: "12px 32px",
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12,
        backdropFilter: "blur(8px)", zIndex: 30,
      }}>
        {savedAt && !dirty && (
          <span style={{ fontSize: 12, color: "#6ee7b7" }}>
            {t.phaseTemplatesPage.savedAt.replace("{time}", savedAt.toLocaleTimeString(intlCode))}
          </span>
        )}
        {dirty && (
          <span style={{ fontSize: 12, color: "#fcd34d" }}>{t.phaseTemplatesPage.dirty}</span>
        )}
        <button onClick={handleSave} disabled={!dirty || saving} className="gradient-btn" style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: !dirty || saving ? "not-allowed" : "pointer",
          opacity: !dirty || saving ? 0.5 : 1,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {t.phaseTemplatesPage.savingBtn}</> : t.phaseTemplatesPage.saveBtn}
        </button>
      </div>
    </div>
  );
}
