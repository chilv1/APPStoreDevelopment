"use client";

import { useEffect, useState } from "react";
import { formatDateUTC } from "@/lib/utils";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
interface Risk { code: string; severity: Severity; taskId?: string; taskName?: string; message: string; suggestion?: string }
interface Resp {
  summary: string;
  summarySource?: "deterministic" | "llm";
  risks: Risk[];
  metrics: { criticalPathLength: number; durationDays: number; projectFinish: string; taskCount: number; depCount: number; engineMs: number };
}

interface Props { storeId: string; onClose: () => void; onSelectPhase?: (id: string) => void }

const SEV_META: Record<Severity, { color: string; bg: string; icon: string }> = {
  CRITICAL: { color: "#fff",     bg: "#dc2626",                  icon: "🔥" },
  HIGH:     { color: "#92400e",  bg: "rgba(245,158,11,0.15)",    icon: "⚠️" },
  MEDIUM:   { color: "#1d4ed8",  bg: "rgba(59,130,246,0.1)",     icon: "ℹ️" },
  LOW:      { color: "var(--text-secondary)", bg: "rgba(15,23,42,0.05)", icon: "·" },
};

export default function AIPanel({ storeId, onClose, onSelectPhase }: Props) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stores/${storeId}/risks`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [storeId]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.25)", zIndex: 49, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, background: "#fff", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 32px rgba(15,23,42,0.12)", zIndex: 50, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI assistant</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>🤖 Schedule risk explainer</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, color: "var(--text-muted)", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && <div style={{ color: "var(--text-secondary)" }}>Analyzing...</div>}
          {data && (
            <>
              <div style={{ background: "rgba(59,130,246,0.05)", borderLeft: "3px solid #3b82f6", padding: "12px 14px", borderRadius: 6, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.55 }}>
                <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="badge" style={{
                    background: data.summarySource === "llm" ? "rgba(139,92,246,0.1)" : "rgba(15,23,42,0.05)",
                    color:      data.summarySource === "llm" ? "#7c3aed" : "var(--text-muted)",
                    borderColor: "transparent",
                    fontSize: 9,
                  }}>
                    {data.summarySource === "llm" ? "✨ LLM" : "📐 Rule-based"}
                  </span>
                </div>
                {data.summary}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                <div className="stat-card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Critical path</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{data.metrics.criticalPathLength} phases</div>
                </div>
                <div className="stat-card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Duration</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{data.metrics.durationDays}d</div>
                </div>
                <div className="stat-card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Finish</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{formatDateUTC(data.metrics.projectFinish)}</div>
                </div>
                <div className="stat-card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Engine</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{data.metrics.engineMs}ms · {data.metrics.taskCount} tasks</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Risks ({data.risks.length})
                </div>
                {data.risks.length === 0 ? (
                  <div style={{ background: "rgba(16,185,129,0.08)", borderLeft: "3px solid #10b981", padding: "10px 14px", borderRadius: 6, fontSize: 13, color: "#047857" }}>
                    ✓ No risks detected — schedule is clean this week.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.risks.map((r, i) => {
                      const m = SEV_META[r.severity];
                      return (
                        <div key={i} style={{ background: m.bg, borderLeft: `3px solid ${m.bg === "rgba(15,23,42,0.05)" ? "#94a3b8" : (m.color === "#fff" ? "#dc2626" : m.color)}`, padding: "10px 12px", borderRadius: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{m.icon}</span>
                            <span className="badge" style={{ background: m.color === "#fff" ? "#dc2626" : "rgba(0,0,0,0.06)", color: m.color, borderColor: "transparent" }}>{r.severity}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{r.code}</span>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>{r.message}</div>
                          {r.suggestion && (
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>💡 {r.suggestion}</div>
                          )}
                          {r.taskId && onSelectPhase && (
                            <button onClick={() => { onSelectPhase(r.taskId!); onClose(); }} style={{ marginTop: 6, background: "transparent", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}>
                              Open phase →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
