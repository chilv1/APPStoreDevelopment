"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { COLOR, RADIUS } from "@/lib/design/tokens";

interface Option {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
}

export const AuroraSelect = forwardRef<HTMLSelectElement, Props>(function AuroraSelect(
  { label, options, style, ...rest },
  ref
) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <span style={{ fontSize: 12, color: COLOR.neutral[600], fontWeight: 500 }}>{label}</span>
      )}
      <select
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
          ...style,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
});

export default AuroraSelect;
