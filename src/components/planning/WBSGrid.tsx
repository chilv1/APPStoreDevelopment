"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { PlanningStore, ScheduleResp } from "./types";

interface NLSuggestion {
  name: string;
  durationDays: number;
  dependsOnPhaseNumber?: number;
  depType?: "FS" | "SS" | "FF" | "SF";
  lagDays?: number;
  deadline?: string;
}

interface Props {
  store: PlanningStore;
  schedule: ScheduleResp | null;
  selectedPhaseId: string | null;
  onSelectPhase: (id: string | null) => void;
  onMutate?: () => void;
}

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

function dur(start: string | null, finish: string | null): number {
  if (!start || !finish) return 0;
  const ms = new Date(finish).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function WBSGrid({ store, schedule, selectedPhaseId, onSelectPhase, onMutate }: Props) {
  const t = useT();
  const tasksById = new Map((schedule?.tasks ?? []).map((x) => [x.id, x]));
  const criticalSet = new Set(schedule?.criticalPath ?? []);
  const phaseById = new Map(store.phases.map((p) => [p.id, p]));

  // Inline edit state — phaseId+col → draft value
  const [editing, setEditing] = useState<{ phaseId: string; col: "name" | "duration" } | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (phaseId: string, col: "name" | "duration", current: string) => {
    setEditing({ phaseId, col });
    setDraft(current);
  };

  const commit = async () => {
    if (!editing) return;
    const { phaseId, col } = editing;
    const orig = phaseById.get(phaseId);
    if (!orig) { setEditing(null); return; }
    const body: any = {};
    if (col === "name") {
      if (draft.trim() && draft !== orig.name) body.name = draft.trim();
    } else if (col === "duration") {
      const days = Math.max(1, Math.round(Number(draft) || 0));
      // Recompute plannedEnd from existing plannedStart + new duration.
      if (orig.plannedStart && days > 0) {
        const end = new Date(orig.plannedStart);
        end.setUTCDate(end.getUTCDate() + days);
        body.plannedEnd = end.toISOString();
      }
    }
    setEditing(null);
    if (Object.keys(body).length === 0) return;
    try {
      const res = await fetch(`/api/phases/${phaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok && onMutate) onMutate();
    } catch {}
  };

  const cancel = () => setEditing(null);

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      {/* NL task creation strip */}
      <NLAddTaskStrip store={store} onMutate={() => onMutate?.()} />
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>{t.planning.colWBS}</th>
            <th>{t.planning.colName}</th>
            <th style={{ width: 110 }}>{t.planning.colDur}</th>
            <th style={{ width: 130 }}>{t.planning.colStart}</th>
            <th style={{ width: 130 }}>{t.planning.colFinish}</th>
            <th style={{ width: 200 }}>{t.planning.colPredecessors}</th>
            <th style={{ width: 110 }}>{t.planning.colProgress}</th>
            <th style={{ width: 90 }}>{t.planning.colCritical}</th>
          </tr>
        </thead>
        <tbody>
          {store.phases.map((p) => {
            const task = tasksById.get(p.id);
            const isCritical = criticalSet.has(p.id);
            const isSelected = selectedPhaseId === p.id;
            const start = task?.start ?? p.plannedStart;
            const finish = task?.finish ?? p.plannedEnd;
            const duration = task?.duration ?? dur(p.plannedStart, p.plannedEnd);
            const predName = p.dependsOnId ? phaseById.get(p.dependsOnId)?.phaseNumber : null;
            const predLabel = predName ? `${predName} ${p.dependencyType}${p.lagDays ? ` ${p.lagDays > 0 ? "+" : ""}${p.lagDays}d` : ""}` : "—";
            const isEditingName = editing?.phaseId === p.id && editing.col === "name";
            const isEditingDur  = editing?.phaseId === p.id && editing.col === "duration";
            return (
              <tr
                key={p.id}
                onClick={() => { if (!editing) onSelectPhase(p.id); }}
                style={{
                  cursor: editing ? "default" : "pointer",
                  background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                  borderLeft: isCritical ? "3px solid #ef4444" : "3px solid transparent",
                }}
              >
                <td style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontWeight: 600 }}>
                  {p.phaseNumber}
                </td>
                <td onDoubleClick={(e) => { e.stopPropagation(); startEdit(p.id, "name", p.name); }}>
                  {isEditingName ? (
                    <input
                      autoFocus
                      className="input"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commit}
                      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ padding: "4px 8px", fontSize: 13, fontWeight: 600 }}
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.taskCount} tasks · double-click to rename</div>
                    </>
                  )}
                </td>
                <td onDoubleClick={(e) => { e.stopPropagation(); startEdit(p.id, "duration", String(duration)); }} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {isEditingDur ? (
                    <input
                      autoFocus
                      type="number"
                      className="input"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commit}
                      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ padding: "4px 8px", fontSize: 13, width: 70 }}
                      min={1}
                    />
                  ) : (
                    duration > 0 ? `${duration} ${t.planning.days}` : "—"
                  )}
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(start)}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(finish)}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{predLabel}</td>
                <td>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${p.pct}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{p.pct}%</div>
                </td>
                <td>
                  {isCritical && (
                    <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", borderColor: "rgba(239,68,68,0.3)" }}>
                      ★
                    </span>
                  )}
                  {task && !isCritical && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      TF {task.totalFloat}d
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── NL task creation strip (Stream 9 P3) ──────────────────────────────────

function NLAddTaskStrip({ store, onMutate }: { store: PlanningStore; onMutate: () => void }) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [suggestion, setSuggestion] = useState<NLSuggestion | null>(null);
  const [source, setSource] = useState<"llm" | "regex" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parse = async () => {
    if (!text.trim()) return;
    setParsing(true); setError(null); setSuggestion(null);
    try {
      const r = await fetch("/api/ai/parse-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, storeId: store.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? "Parse failed");
      setSuggestion(data.suggestion);
      setSource(data.source);
    } catch (e: any) { setError(String(e.message ?? e)); }
    finally { setParsing(false); }
  };

  const create = async () => {
    if (!suggestion) return;
    setCreating(true); setError(null);
    try {
      const dependsOnId = suggestion.dependsOnPhaseNumber
        ? store.phases.find((p) => p.phaseNumber === suggestion.dependsOnPhaseNumber)?.id
        : undefined;
      const r = await fetch(`/api/stores/${store.id}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestion.name,
          durationDays: suggestion.durationDays,
          dependsOnId,
          dependencyType: suggestion.depType ?? "FS",
          lagDays: suggestion.lagDays ?? 0,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error ?? "Create failed");
      }
      // If deadline supplied, PATCH it after creation.
      if (suggestion.deadline) {
        const created = await r.json();
        const newId = created?.phase?.id ?? created?.id;
        if (newId) {
          await fetch(`/api/phases/${newId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deadline: suggestion.deadline }),
          });
        }
      }
      setText(""); setSuggestion(null); setSource(null);
      onMutate();
    } catch (e: any) { setError(String(e.message ?? e)); }
    finally { setCreating(false); }
  };

  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8, background: "rgba(59,130,246,0.02)" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>✨ Add task in plain language</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          className="input"
          placeholder='e.g. "Civil works, 14 days, after F.3 with 2-day lag, deadline 2026-12-15"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") parse(); }}
          style={{ fontSize: 13 }}
        />
        <button onClick={parse} disabled={parsing || !text.trim()} className="gradient-btn" style={{ padding: "8px 14px", borderRadius: 6, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: parsing ? "not-allowed" : "pointer" }}>
          {parsing ? "..." : "Parse"}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: "#dc2626" }}>⚠ {error}</div>}
      {suggestion && (
        <div className="task-item" style={{ padding: 10, gap: 10, alignItems: "center" }}>
          <span className="badge" style={{
            background: source === "llm" ? "rgba(139,92,246,0.1)" : "rgba(15,23,42,0.05)",
            color:      source === "llm" ? "#7c3aed" : "var(--text-muted)",
            borderColor: "transparent", fontSize: 9,
          }}>{source === "llm" ? "✨ LLM" : "📐 Regex"}</span>
          <div style={{ flex: 1, fontSize: 12 }}>
            <strong>{suggestion.name}</strong> · {suggestion.durationDays}d
            {suggestion.dependsOnPhaseNumber && <> · after F.{suggestion.dependsOnPhaseNumber} ({suggestion.depType ?? "FS"})</>}
            {suggestion.lagDays ? <> · lag {suggestion.lagDays}d</> : null}
            {suggestion.deadline && <> · ⏰ {suggestion.deadline}</>}
          </div>
          <button onClick={() => { setSuggestion(null); setSource(null); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 10px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
          <button onClick={create} disabled={creating} className="gradient-btn" style={{ padding: "4px 12px", borderRadius: 4, border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: creating ? "not-allowed" : "pointer" }}>
            {creating ? "..." : "+ Add task"}
          </button>
        </div>
      )}
    </div>
  );
}
