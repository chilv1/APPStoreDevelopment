"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/context";
import { getStatusLabel } from "@/lib/utils";
import type { Dict } from "@/lib/i18n/types";

const DAY_MS = 1000 * 60 * 60 * 24;

const STATUS_COLOR: Record<string, string> = {
  PLANNING:    "#6b7280",
  IN_PROGRESS: "#3b82f6",
  COMPLETED:   "#10b981",
  ON_HOLD:     "#f59e0b",
  CANCELLED:   "#ef4444",
};
const STATUS_KEYS = ["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"];

type SortKey = "name" | "progress" | "target" | "status";

function fmtDateShort(d: Date | string, intlCode = "es-PE"): string {
  return new Date(d).toLocaleDateString(intlCode, { day: "2-digit", month: "2-digit" });
}

export default function PortfolioGanttPage() {
  const t = useT();
  const { locale, intlCode } = useLocale();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("target");

  useEffect(() => {
    fetch("/api/stores").then(r => r.json()).then(d => {
      setStores(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const now = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  // Aggregate per-store info
  const enriched = useMemo(() => stores.map((s: any) => {
    const phases = s.phases || [];
    const dates = phases
      .filter((p: any) => p.plannedStart && p.plannedEnd)
      .map((p: any) => ({ start: new Date(p.plannedStart).getTime(), end: new Date(p.plannedEnd).getTime() }));
    const projectStart = dates.length ? Math.min(...dates.map((d: any) => d.start)) : null;
    const projectEnd   = dates.length ? Math.max(...dates.map((d: any) => d.end))   : null;
    const completedCount = phases.filter((p: any) => p.status === "COMPLETED").length;
    const inProgressCount = phases.filter((p: any) => p.status === "IN_PROGRESS").length;
    return { ...s, projectStart, projectEnd, completedCount, inProgressCount };
  }), [stores]);

  const filtered = enriched
    .filter(s => filterStatus === "ALL" || s.status === filterStatus)
    .filter(s => filterBranch === "ALL" || (s.bc?.branch?.name || s.region || "—") === filterBranch);

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "name")     return a.name.localeCompare(b.name);
    if (sortKey === "progress") return (b.progress || 0) - (a.progress || 0);
    if (sortKey === "target") {
      const at = a.targetOpenDate ? new Date(a.targetOpenDate).getTime() : Infinity;
      const bt = b.targetOpenDate ? new Date(b.targetOpenDate).getTime() : Infinity;
      return at - bt;
    }
    if (sortKey === "status")   return a.status.localeCompare(b.status);
    return 0;
  });

  // Branch filter options
  const branches = Array.from(new Set(enriched.map(s => s.bc?.branch?.name || s.region || "—"))).sort();

  // Common timeline range across all visible stores
  const timeline = useMemo(() => {
    const allTimes: number[] = [];
    sorted.forEach(s => {
      if (s.projectStart) allTimes.push(s.projectStart);
      if (s.projectEnd)   allTimes.push(s.projectEnd);
      if (s.targetOpenDate) allTimes.push(new Date(s.targetOpenDate).getTime());
    });
    if (allTimes.length === 0) {
      const d = new Date(now);
      return { start: d.getTime(), end: d.getTime() + 365 * DAY_MS };
    }
    return { start: Math.min(...allTimes), end: Math.max(...allTimes) };
  }, [sorted, now]);

  const totalDays = Math.max((timeline.end - timeline.start) / DAY_MS, 1);
  const pct = (t: number) => ((t - timeline.start) / DAY_MS) / totalDays * 100;
  const todayPct = pct(now.getTime());

  // Month markers
  const months = useMemo(() => {
    const out: { date: Date; label: string; pct: number }[] = [];
    const cursor = new Date(timeline.start);
    cursor.setDate(1); cursor.setHours(0,0,0,0);
    const endTime = timeline.end;
    while (cursor.getTime() <= endTime) {
      const p = pct(cursor.getTime());
      out.push({
        date: new Date(cursor),
        label: cursor.toLocaleDateString(intlCode, { month: "short" }),
        pct: p,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [timeline, intlCode]);

  const LEFT_COL = 280;
  const RIGHT_COL = 80;
  const ROW_HEIGHT = 64;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="spinner" />
    </div>
  );

  const sortOpts: { k: SortKey; labelKey: keyof Dict["portfolio"] }[] = [
    { k: "target",   labelKey: "sortDeadline" },
    { k: "progress", labelKey: "sortProgress" },
    { k: "name",     labelKey: "sortName" },
    { k: "status",   labelKey: "sortStatus" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
          {t.portfolio.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {t.portfolio.subtitle.replace("{n}", String(sorted.length))}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: t.portfolio.statTotal, value: enriched.length, color: "#3b82f6" },
          { label: t.portfolio.statInProgress, value: enriched.filter(s => s.status === "IN_PROGRESS").length, color: "#3b82f6" },
          { label: t.portfolio.statPlanning, value: enriched.filter(s => s.status === "PLANNING").length, color: "#6b7280" },
          { label: t.portfolio.statCompleted, value: enriched.filter(s => s.status === "COMPLETED").length, color: "#10b981" },
          { label: t.portfolio.statOnHold, value: enriched.filter(s => s.status === "ON_HOLD").length, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{t.portfolio.filterLabel}</span>
        <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "6px 10px", fontSize: 12, width: "auto" }}>
          <option value="ALL">{t.portfolio.filterAllStatus}</option>
          {STATUS_KEYS.map(k => <option key={k} value={k}>{getStatusLabel(k, locale)}</option>)}
        </select>
        <select className="input" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
          style={{ padding: "6px 10px", fontSize: 12, width: "auto" }}>
          <option value="ALL">{t.portfolio.filterAllBranch}</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <span style={{ marginLeft: 12, fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{t.portfolio.sortLabel}</span>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
          {sortOpts.map(opt => (
            <button key={opt.k} onClick={() => setSortKey(opt.k)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: sortKey === opt.k ? "rgba(59,130,246,0.2)" : "transparent",
              color: sortKey === opt.k ? "#93c5fd" : "var(--text-secondary)",
              border: "none", cursor: "pointer",
            }}>{t.portfolio[opt.labelKey]}</button>
          ))}
        </div>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
          {t.portfolio.showing
            .replace("{n}", String(sorted.length))
            .replace("{total}", String(enriched.length))}
        </span>
      </div>

      {/* Phase legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12, fontSize: 11, color: "var(--text-secondary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 8, borderRadius: 2, background: "#10b981", display: "inline-block" }} />
          {t.portfolio.legendDone}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 8, borderRadius: 2, background: "#3b82f6", display: "inline-block" }} />
          {t.portfolio.legendInProgress}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 8, borderRadius: 2, background: "#ef4444", display: "inline-block" }} />
          {t.portfolio.legendOverdue}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 8, borderRadius: 2, background: "rgba(107, 114, 128, 0.4)", display: "inline-block" }} />
          {t.portfolio.legendNotStarted}
        </div>
        <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", color: "#10b981", fontSize: 14, lineHeight: 1 }}>◆</span>
          {t.portfolio.legendOpening}
        </div>
      </div>

      {/* Gantt body */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, overflowX: "auto" }}>
        <div style={{ minWidth: 900, position: "relative" }}>

          {/* Month header */}
          <div style={{
            position: "relative", marginLeft: LEFT_COL, marginRight: RIGHT_COL,
            height: 28, marginBottom: 8,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            {months.map((m, i) => (
              <div key={i} style={{
                position: "absolute", left: `${m.pct}%`, top: 0,
                fontSize: 10, color: "var(--text-secondary)", fontWeight: 600,
                paddingLeft: 6, borderLeft: "1px solid rgba(255,255,255,0.08)",
                height: "100%",
              }}>{m.label}</div>
            ))}
            {todayPct >= 0 && todayPct <= 100 && (
              <div style={{
                position: "absolute", left: `${todayPct}%`, top: -4,
                transform: "translateX(-50%)",
                background: "#ef4444", color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                whiteSpace: "nowrap", zIndex: 5,
              }}>{t.portfolio.todayPill.replace("{date}", fmtDateShort(now, intlCode))}</div>
            )}
          </div>

          {/* Rows */}
          <div style={{ position: "relative" }}>
            {/* Today vertical line */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div style={{
                position: "absolute",
                left: `calc(${LEFT_COL}px + (100% - ${LEFT_COL + RIGHT_COL}px) * ${todayPct} / 100)`,
                top: 0, bottom: 0, width: 2, background: "#ef4444", opacity: 0.5,
                zIndex: 3, pointerEvents: "none",
              }} />
            )}

            {sorted.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
                {t.portfolio.emptyFilter}
              </div>
            ) : sorted.map(store => {
              const stColor = STATUS_COLOR[store.status] || STATUS_COLOR.PLANNING;
              const stLabel = getStatusLabel(store.status, locale);
              const targetT = store.targetOpenDate ? new Date(store.targetOpenDate).getTime() : null;
              const targetPct = targetT ? pct(targetT) : null;

              return (
                <Link key={store.id} href={`/stores/${store.id}`} style={{
                  display: "flex", alignItems: "center", height: ROW_HEIGHT,
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  textDecoration: "none", color: "inherit",
                  transition: "background 0.15s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {/* Left column: store info */}
                  <div style={{ width: LEFT_COL, flexShrink: 0, paddingRight: 12, paddingLeft: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 4,
                        background: `${stColor}22`, color: stColor,
                        border: `1px solid ${stColor}40`, fontWeight: 600,
                      }}>{stLabel}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{store.code}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#f0f4ff", fontWeight: 600, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {store.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {store.bc?.branch?.name || store.region || "—"} · {store.pm?.name || t.portfolio.storePMNone}
                    </div>
                  </div>

                  {/* Bar area */}
                  <div style={{ flex: 1, position: "relative", height: 36, minWidth: 0 }}>
                    {/* Month grid lines */}
                    {months.map((m, i) => (
                      <div key={`grid-${i}`} style={{
                        position: "absolute", left: `${m.pct}%`, top: 0, bottom: 0,
                        width: 1, background: "rgba(255,255,255,0.04)",
                      }} />
                    ))}

                    {/* Render each phase as a small segment */}
                    {(store.phases || []).filter((p: any) => p.plannedStart && p.plannedEnd).map((phase: any) => {
                      const ps = new Date(phase.plannedStart).getTime();
                      const pe = new Date(phase.plannedEnd).getTime();
                      const left = pct(ps);
                      const width = Math.max(((pe - ps) / DAY_MS) / totalDays * 100, 0.3);
                      const isOverdue = pe < now.getTime() && phase.status !== "COMPLETED";
                      const color = phase.status === "COMPLETED" ? "#10b981"
                        : phase.status === "IN_PROGRESS" ? "#3b82f6"
                        : phase.status === "BLOCKED" ? "#a855f7"
                        : isOverdue ? "#ef4444"
                        : "#6b7280";
                      const opacity = phase.status === "COMPLETED" ? 1
                        : phase.status === "IN_PROGRESS" ? 0.85
                        : isOverdue ? 0.7
                        : 0.35;
                      return (
                        <div key={phase.id}
                          title={`${t.storesList.phaseAbbrev}${phase.phaseNumber}: ${phase.name}\n${fmtDateShort(phase.plannedStart, intlCode)} → ${fmtDateShort(phase.plannedEnd, intlCode)}`}
                          style={{
                            position: "absolute",
                            left: `${left}%`, width: `${width}%`,
                            top: 12, height: 12,
                            background: color, opacity,
                            borderRadius: 2,
                            border: `1px solid ${color}`,
                          }} />
                      );
                    })}

                    {/* Target opening diamond */}
                    {targetPct !== null && targetPct >= 0 && targetPct <= 100 && (
                      <div title={t.portfolio.openingTooltip.replace("{date}", fmtDateShort(store.targetOpenDate, intlCode))} style={{
                        position: "absolute", left: `${targetPct}%`,
                        top: 8, transform: "translateX(-50%)",
                      }}>
                        <div style={{
                          width: 14, height: 14, background: "#10b981",
                          transform: "rotate(45deg)",
                          border: "2px solid rgba(16, 185, 129, 0.9)",
                          boxShadow: "0 2px 6px rgba(16,185,129,0.5)",
                        }} />
                      </div>
                    )}

                    {/* Progress bar at the bottom */}
                    <div style={{
                      position: "absolute", left: 0, right: 0, bottom: 2, height: 2,
                      background: "rgba(255,255,255,0.04)", borderRadius: 1,
                    }}>
                      <div style={{
                        width: `${store.progress || 0}%`,
                        height: "100%", background: stColor, borderRadius: 1,
                      }} />
                    </div>
                  </div>

                  {/* Right column: progress % */}
                  <div style={{ width: RIGHT_COL, flexShrink: 0, paddingLeft: 12, textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: stColor, lineHeight: 1 }}>
                      {store.progress || 0}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {t.portfolio.phaseCount.replace("{done}", String(store.completedCount))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
