/**
 * Aurora PM — Design Tokens
 * Single source of truth for color, spacing, radius, shadow, type, motion.
 * Brand: amber #f59e0b. Accent: sky #0ea5e9. Light theme.
 */

export const COLOR = {
  brand: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  accent: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
  },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  semantic: {
    success: "#10b981",
    warn: "#f59e0b",
    danger: "#ef4444",
    info: "#0ea5e9",
  },
} as const;

export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

export const RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const SHADOW = {
  xs: "0 1px 2px rgba(15,23,42,0.04)",
  sm: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  md: "0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)",
  lg: "0 12px 32px rgba(15,23,42,0.12), 0 4px 8px rgba(15,23,42,0.06)",
} as const;

export const TYPOGRAPHY = {
  family: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  },
  size: {
    11: 11,
    12: 12,
    13: 13,
    14: 14,
    16: 16,
    18: 18,
    20: 20,
    24: 24,
    28: 28,
    32: 32,
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const Z = {
  base: 0,
  dropdown: 30,
  drawer: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

export const BREAKPOINT = {
  tablet: 768,
  desktop: 1280,
  wide: 1536,
} as const;

export const MOTION = {
  duration: {
    instant: 0,
    fast: 100,
    normal: 200,
    slow: 400,
  },
  easing: {
    inOut: "cubic-bezier(0.4,0,0.2,1)",
    out: "cubic-bezier(0,0,0.2,1)",
    in: "cubic-bezier(0.4,0,1,1)",
  },
} as const;

/**
 * Generate a CSS string with `:root { --aurora-* }` declarations
 * for use in globals.css or runtime style injection.
 */
export function generateCssVars(): string {
  const lines: string[] = [":root {"];

  // brand
  for (const [k, v] of Object.entries(COLOR.brand)) {
    lines.push(`  --aurora-brand-${k}: ${v};`);
  }
  // accent
  for (const [k, v] of Object.entries(COLOR.accent)) {
    lines.push(`  --aurora-accent-${k}: ${v};`);
  }
  // neutral
  for (const [k, v] of Object.entries(COLOR.neutral)) {
    lines.push(`  --aurora-neutral-${k}: ${v};`);
  }
  // semantic
  for (const [k, v] of Object.entries(COLOR.semantic)) {
    lines.push(`  --aurora-${k}: ${v};`);
  }
  // radius
  for (const [k, v] of Object.entries(RADIUS)) {
    lines.push(`  --aurora-radius-${k}: ${v}px;`);
  }
  // shadow
  for (const [k, v] of Object.entries(SHADOW)) {
    lines.push(`  --aurora-shadow-${k}: ${v};`);
  }
  // spacing
  for (const [k, v] of Object.entries(SPACING)) {
    lines.push(`  --aurora-space-${k}: ${v}px;`);
  }

  lines.push("}");
  return lines.join("\n");
}

export type ColorToken = typeof COLOR;
export type SpacingToken = keyof typeof SPACING;
export type RadiusToken = keyof typeof RADIUS;
