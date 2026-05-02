"use client";

import "@/lib/charts/register";
import { Doughnut } from "react-chartjs-2";
import { baseChartOptions, TEXT_PRIMARY } from "@/lib/charts/theme";
import type { ChartOptions, Plugin } from "chart.js";

// Custom Chart.js plugin — draws each segment's value at the midpoint of its arc.
// Why custom (not chartjs-plugin-datalabels): avoids a 25KB dep for a 30-line plugin.
// White text + subtle shadow keeps numbers legible across all STATUS_PALETTE colors.
const segmentLabelsPlugin: Plugin<"doughnut"> = {
  id: "segmentLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const data = chart.data.datasets[0].data as number[];
    const total = data.reduce((s, v) => s + (Number(v) || 0), 0);
    if (total === 0) return;

    meta.data.forEach((arc, i) => {
      const value = Number(data[i] ?? 0);
      if (!value) return;
      // Skip thin slices (<4%) so labels don't overlap the gap between arcs
      if (value / total < 0.04) return;

      // Arc internals are part of Chart.js public surface but not strongly typed
      const a = arc as unknown as {
        startAngle: number; endAngle: number;
        innerRadius: number; outerRadius: number;
        x: number; y: number;
      };
      const angle = (a.startAngle + a.endAngle) / 2;
      const radius = (a.innerRadius + a.outerRadius) / 2;
      const x = a.x + Math.cos(angle) * radius;
      const y = a.y + Math.sin(angle) * radius;

      ctx.save();
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(value), x, y);
      ctx.restore();
    });
  },
};

// Generic doughnut — pass labels (already localized), values, colors.
// `centerText` shows main number; optional `centerSubtext` adds a small label below.
// Native Chart.js legend is OFF — we render a custom HTML legend below the canvas
// so segment counts (drawn on the chart itself) aren't duplicated in the legend.
export default function DoughnutChart({
  title,
  labels,
  values,
  colors,
  centerText,
  centerSubtext,
}: {
  title?: string;
  labels: string[];
  values: number[];
  colors: string[];
  centerText?: string;
  centerSubtext?: string;
}) {
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors,
      borderColor: "rgba(8,12,20,0.6)",
      borderWidth: 2,
    }],
  };

  const opts = {
    ...baseChartOptions,
    cutout: "62%",
    plugins: {
      ...baseChartOptions.plugins,
      legend: { display: false },
    },
  } as ChartOptions<"doughnut">;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minHeight: 280,
    }}>
      {title && <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>{title}</div>}
      <div style={{ position: "relative", flex: 1, minHeight: 220 }}>
        <Doughnut data={data} options={opts} plugins={[segmentLabelsPlugin]} />
        {centerText && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: TEXT_PRIMARY, lineHeight: 1 }}>
              {centerText}
            </div>
            {centerSubtext && (
              <div style={{
                fontSize: 10, color: "var(--text-secondary)",
                marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {centerSubtext}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom HTML legend — colored dot + localized label only.
          Counts intentionally omitted; they're already drawn on each segment. */}
      {labels.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "8px 14px",
          paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          {labels.map((label, i) => (
            <div key={`${label}-${i}`} style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "var(--text-secondary)",
            }}>
              <div style={{
                width: 9, height: 9, borderRadius: "50%",
                background: colors[i], flexShrink: 0,
              }} />
              <div>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
