"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { COLOR, RADIUS } from "@/lib/design/tokens";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const AuroraInput = forwardRef<HTMLInputElement, Props>(function AuroraInput(
  { label, style, ...rest },
  ref
) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <span style={{ fontSize: 12, color: COLOR.neutral[600], fontWeight: 500 }}>{label}</span>
      )}
      <input
        ref={ref}
        {...rest}
        style={{
          height: 34,
          padding: "0 12px",
          background: "#fff",
          border: `1px solid ${COLOR.neutral[200]}`,
          borderRadius: RADIUS.md,
          color: COLOR.neutral[900],
          fontSize: 13,
          outline: "none",
          transition: "border-color 0.15s ease",
          ...style,
        }}
      />
    </label>
  );
});

export default AuroraInput;
