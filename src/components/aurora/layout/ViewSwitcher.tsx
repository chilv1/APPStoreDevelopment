"use client";

import { LayoutGrid, GanttChart, KanbanSquare, Calendar, BarChart3 } from "lucide-react";
import { COLOR, RADIUS } from "@/lib/design/tokens";

export type AuroraView = "Grid" | "Gantt" | "Board" | "Calendar" | "Dashboard";

const VIEWS: { id: AuroraView; label: string; Icon: typeof LayoutGrid }[] = [
  { id: "Grid", label: "Grid", Icon: LayoutGrid },
  { id: "Gantt", label: "Gantt", Icon: GanttChart },
  { id: "Board", label: "Board", Icon: KanbanSquare },
  { id: "Calendar", label: "Calendar", Icon: Calendar },
  { id: "Dashboard", label: "Dashboard", Icon: BarChart3 },
];

interface Props {
  value: AuroraView;
  onChange: (v: AuroraView) => void;
}

export default function ViewSwitcher({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        padding: 3,
        background: COLOR.neutral[100],
        borderRadius: RADIUS.md,
        gap: 2,
      }}
    >
      {VIEWS.map((v) => {
        const active = v.id === value;
        return (
          <button
            key={v.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: active ? COLOR.neutral[900] : COLOR.neutral[600],
              background: active ? "#fff" : "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              boxShadow: active ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
            }}
          >
            <v.Icon size={14} />
            <span>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
