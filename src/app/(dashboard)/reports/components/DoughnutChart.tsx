"use client";

import "@/lib/charts/register";
import { Doughnut } from "react-chartjs-2";
import { baseChartOptions, TEXT_PRIMARY } from "@/lib/charts/theme";
import type { ChartOptions } from "chart.js";

// Generic doughnut — pass labels, values, colors. Title rendered above (not via plugin).
// Why above: Chart.js title plugin uses canvas → can't easily theme to match h3 outside.
export default function DoughnutChart({
  title,
  labels,
  values,
  colors,
  centerText,
}: {
  title?: string;
  labels: string[];
  values: number[];
  colors: string[];
  centerText?: string;
}) {
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors,
      borderColor: "rgba(255,255,255,0.04)",
      borderWidth: 2,
    }],
  };

  const opts = {
    ...baseChartOptions,
    cutout: "65%",
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
        <Doughnut data={data} options={opts} />
        {centerText && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", pointerEvents: "none", fontSize: 22, fontWeight: 800,
            color: TEXT_PRIMARY,
          }}>
            {centerText}
          </div>
        )}
      </div>
    </div>
  );
}
