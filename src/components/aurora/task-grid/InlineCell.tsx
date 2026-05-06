"use client";

import { useEffect, useRef, useState } from "react";
import { COLOR } from "@/lib/design/tokens";

interface Props {
  value: string;
  onCommit: (next: string) => void;
}

export default function InlineCell({ value, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onCommit(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit(draft);
            setEditing(false);
          } else if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        style={{
          width: "100%",
          padding: "4px 6px",
          fontSize: 13,
          border: `1px solid ${COLOR.brand[500]}`,
          borderRadius: 4,
          outline: "none",
          background: "#fff",
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      style={{
        padding: "4px 6px",
        fontSize: 13,
        color: COLOR.neutral[800],
        cursor: "text",
        borderRadius: 4,
      }}
    >
      {value}
    </div>
  );
}
