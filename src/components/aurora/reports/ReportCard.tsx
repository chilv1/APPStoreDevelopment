import { COLOR, RADIUS, SHADOW } from "@/lib/design/tokens";

interface Props {
  title: string;
  value: string;
  label: string;
  trend?: number[];
  delta?: number;
}

export default function ReportCard({ title, value, label, trend, delta }: Props) {
  const points =
    trend && trend.length > 1
      ? (() => {
          const max = Math.max(...trend);
          const min = Math.min(...trend);
          const range = max - min || 1;
          const w = 120;
          const h = 32;
          return trend
            .map((v, i) => {
              const x = (i / (trend.length - 1)) * w;
              const y = h - ((v - min) / range) * h;
              return `${x},${y}`;
            })
            .join(" ");
        })()
      : "";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLOR.neutral[200]}`,
        borderRadius: RADIUS.lg,
        padding: 18,
        boxShadow: SHADOW.xs,
      }}
    >
      <div style={{ fontSize: 12, color: COLOR.neutral[500], fontWeight: 500 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: COLOR.neutral[900], lineHeight: 1.2 }}>
            {value}
          </div>
          <div style={{ fontSize: 12, color: COLOR.neutral[500] }}>{label}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          {points && (
            <svg width={120} height={32} aria-hidden>
              <polyline
                fill="none"
                stroke={COLOR.brand[500]}
                strokeWidth={2}
                points={points}
              />
            </svg>
          )}
          {delta !== undefined && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: delta >= 0 ? COLOR.semantic.success : COLOR.semantic.danger,
                marginTop: 4,
              }}
            >
              {delta >= 0 ? "+" : ""}
              {delta}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
