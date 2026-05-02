"use client";

import "@/lib/charts/register";
import { Line } from "react-chartjs-2";
import { cartesianBaseOptions, TEXT_PRIMARY } from "@/lib/charts/theme";
import type { ChartOptions, ChartData } from "chart.js";

export type LineDataset = {
  label: string;
  data: number[];
  color: string;
  fill?: boolean;
  type?: "line" | "bar";
};

// Line chart wrapper. Supports multiple series and area fill (cumulative trends).
// Used for time-series (openings per month, cumulative openings).
export default function LineChart({
  title,
  labels,
  datasets,
  height = 260,
}: {
  title?: string;
  labels: string[];
  datasets: LineDataset[];
  height?: number;
}) {
  const data: ChartData<"line"> = {
    labels,
    datasets: datasets.map((d) => ({
      label: d.label,
      data: d.data,
      borderColor: d.color,
      backgroundColor: d.fill ? hexToRgba(d.color, 0.15) : d.color,
      fill: d.fill ?? false,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: d.color,
    })),
  };

  const opts = {
    ...cartesianBaseOptions,
    plugins: {
      ...cartesianBaseOptions.plugins,
      legend: {
        ...cartesianBaseOptions.plugins.legend,
        display: datasets.length > 1,
      },
    },
  } as ChartOptions<"line">;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minHeight: height + 60,
    }}>
      {title && <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>{title}</div>}
      <div style={{ flex: 1, minHeight: height }}>
        <Line data={data} options={opts} />
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
