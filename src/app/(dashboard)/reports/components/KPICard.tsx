"use client";

// Reusable KPI card with icon + value + label + optional trend.
// Used across Executive / Branch / BC / Risks tabs to keep visual rhythm.
type Trend = { delta: number; label?: string };

export default function KPICard({
  icon,
  label,
  value,
  color = "var(--accent-blue)",
  hint,
  trend,
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  hint?: string;
  trend?: Trend;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 110,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {trend != null && (
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: trend.delta >= 0 ? "#6ee7b7" : "#fca5a5",
            background: trend.delta >= 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
            border: `1px solid ${trend.delta >= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 99, padding: "2px 7px",
          }}>
            {trend.delta >= 0 ? "▲" : "▼"} {Math.abs(trend.delta)}{trend.label ? ` ${trend.label}` : ""}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.3 }}>
        {label}
        {hint && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
}
