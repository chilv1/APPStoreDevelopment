"use client";

import "@/lib/charts/register";
import { Bar } from "react-chartjs-2";
import { cartesianBaseOptions, TEXT_PRIMARY } from "@/lib/charts/theme";
import type { ChartOptions, ChartData } from "chart.js";

export type BarDataset = {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderRadius?: number;
  stack?: string;
};

// Generic bar chart supporting horizontal mode + stacking.
// indexAxis "y" gives horizontal bars (good for top-N branch comparison).
export default function BarChart({
  title,
  labels,
  datasets,
  horizontal = false,
  stacked = false,
  height = 280,
}: {
  title?: string;
  labels: string[];
  datasets: BarDataset[];
  horizontal?: boolean;
  stacked?: boolean;
  height?: number;
}) {
  const data: ChartData<"bar"> = {
    labels,
    datasets: datasets.map((d) => ({
      label: d.label,
      data: d.data,
      backgroundColor: d.backgroundColor,
      borderRadius: d.borderRadius ?? 4,
      stack: d.stack,
      barPercentage: 0.8,
      categoryPercentage: 0.8,
    })),
  };

  const opts = {
    ...cartesianBaseOptions,
    indexAxis: horizontal ? ("y" as const) : ("x" as const),
    scales: {
      x: { ...cartesianBaseOptions.scales.x, stacked },
      y: { ...cartesianBaseOptions.scales.y, stacked },
    },
    plugins: {
      ...cartesianBaseOptions.plugins,
      legend: {
        ...cartesianBaseOptions.plugins.legend,
        display: datasets.length > 1, // hide legend if single series
      },
    },
  } as ChartOptions<"bar">;

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
        <Bar data={data} options={opts} />
      </div>
    </div>
  );
}
