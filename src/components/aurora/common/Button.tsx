"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { COLOR, RADIUS } from "@/lib/design/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizeMap: Record<Size, { padding: string; fontSize: number; height: number }> = {
  sm: { padding: "0 10px", fontSize: 12, height: 28 },
  md: { padding: "0 14px", fontSize: 13, height: 34 },
  lg: { padding: "0 18px", fontSize: 14, height: 40 },
};

function variantStyle(v: Variant): React.CSSProperties {
  if (v === "primary") {
    return { background: COLOR.brand[500], color: "#fff", border: `1px solid ${COLOR.brand[600]}` };
  }
  if (v === "secondary") {
    return { background: "#fff", color: COLOR.neutral[800], border: `1px solid ${COLOR.neutral[200]}` };
  }
  if (v === "danger") {
    return { background: COLOR.semantic.danger, color: "#fff", border: `1px solid ${COLOR.semantic.danger}` };
  }
  return { background: "transparent", color: COLOR.neutral[700], border: "1px solid transparent" };
}

export const AuroraButton = forwardRef<HTMLButtonElement, Props>(function AuroraButton(
  { variant = "primary", size = "md", style, children, ...rest },
  ref
) {
  const s = sizeMap[size];
  return (
    <button
      ref={ref}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: s.padding,
        height: s.height,
        fontSize: s.fontSize,
        fontWeight: 500,
        borderRadius: RADIUS.md,
        cursor: "pointer",
        transition: "all 0.15s ease",
        ...variantStyle(variant),
        ...style,
      }}
    >
      {children}
    </button>
  );
});

export default AuroraButton;
