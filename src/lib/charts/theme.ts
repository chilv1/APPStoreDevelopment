// Shared Chart.js dark-theme defaults. Every chart wrapper imports these
// so legends/tooltips/grids/axes look consistent on the app's dark background.
//
// Why centralize: Chart.js is imperative and config-heavy. Without a shared base
// every chart re-declares the same dark-mode tweaks → inconsistencies + drift.
// Match CSS variables in src/app/globals.css
export const TEXT_PRIMARY = "#f0f4ff";
export const TEXT_SECONDARY = "rgba(139,154,181,0.85)";
export const BG_TOOLTIP = "rgba(15,23,42,0.95)";
export const GRID_COLOR = "rgba(255,255,255,0.06)";

export const COLORS = {
  primary:   "#3b82f6",  // blue
  secondary: "#8b5cf6",  // purple
  success:   "#10b981",  // green
  warning:   "#f59e0b",  // orange
  danger:    "#ef4444",  // red
  muted:     "#6b7280",  // gray
  cyan:      "#06b6d4",
  pink:      "#ec4899",
};

// Color per StoreProject.status — used in doughnut + stacked bars
export const STATUS_PALETTE: Record<string, string> = {
  PLANNING:    COLORS.muted,
  IN_PROGRESS: COLORS.primary,
  COMPLETED:   COLORS.success,
  ON_HOLD:     COLORS.warning,
  CANCELLED:   COLORS.danger,
};

// Color per Phase.status — for phase matrix + breakdown bars
export const PHASE_STATUS_PALETTE: Record<string, string> = {
  NOT_STARTED: COLORS.muted,
  IN_PROGRESS: COLORS.primary,
  COMPLETED:   COLORS.success,
  BLOCKED:     COLORS.danger,
};

// Sequential palette for branch/BC comparisons (when no semantic color applies)
export const SEQUENTIAL = [
  COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning,
  COLORS.danger, COLORS.cyan, COLORS.pink, COLORS.muted,
];

// Base options applied to every chart (legend/tooltip).
// Plain object (no ChartOptions generic) because Chart.js has very strict per-chart-type
// generics that conflict when spreading a shared base. Each wrapper casts to its own
// ChartOptions<"bar"|"line"|"doughnut"> at the use site.
export const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: TEXT_PRIMARY, font: { size: 11 } },
      position: "bottom" as const,
    },
    tooltip: {
      backgroundColor: BG_TOOLTIP,
      titleColor: TEXT_PRIMARY,
      bodyColor: TEXT_PRIMARY,
      borderColor: COLORS.primary,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
};

// Bar/Line specific — adds scale styling. Same caveat as baseChartOptions.
export const cartesianBaseOptions = {
  ...baseChartOptions,
  scales: {
    x: {
      ticks: { color: TEXT_SECONDARY, font: { size: 10 } },
      grid:  { color: GRID_COLOR },
    },
    y: {
      ticks: { color: TEXT_SECONDARY, font: { size: 10 } },
      grid:  { color: GRID_COLOR },
      beginAtZero: true,
    },
  },
};
