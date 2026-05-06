"use client";

import { useState, DragEvent } from "react";
import { COLOR, RADIUS, SHADOW } from "@/lib/design/tokens";
import { Task, TaskStatus } from "@/lib/aurora/mock";

interface Props {
  tasks: Task[];
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "Cho lam" },
  { id: "IN_PROGRESS", label: "Dang lam" },
  { id: "DONE", label: "Hoan thanh" },
];

export default function KanbanBoard({ tasks }: Props) {
  const [items, setItems] = useState(tasks);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDrop = (col: TaskStatus) => {
    if (!draggedId) return;
    setItems((cur) =>
      cur.map((t) => (t.id === draggedId ? { ...t, status: col } : t))
    );
    setDraggedId(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {COLUMNS.map((col) => {
        const colTasks = items.filter((t) => t.status === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e: DragEvent) => e.preventDefault()}
            onDrop={() => handleDrop(col.id)}
            style={{
              background: COLOR.neutral[50],
              borderRadius: RADIUS.lg,
              padding: 12,
              minHeight: 320,
            }}
          >
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 8px 12px",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: COLOR.neutral[700] }}>
                {col.label}
              </span>
              <span style={{ fontSize: 11, color: COLOR.neutral[500] }}>{colTasks.length}</span>
            </header>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {colTasks.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDraggedId(t.id)}
                  style={{
                    background: "#fff",
                    borderRadius: RADIUS.md,
                    padding: 12,
                    boxShadow: SHADOW.xs,
                    border: `1px solid ${COLOR.neutral[200]}`,
                    cursor: "grab",
                  }}
                >
                  <div style={{ fontSize: 11, color: COLOR.neutral[500] }}>{t.wbs}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: COLOR.neutral[900], marginTop: 2 }}>
                    {t.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 11 }}>
                    <span
                      style={{
                        padding: "1px 6px",
                        background: COLOR.brand[50],
                        color: COLOR.brand[700],
                        borderRadius: 999,
                      }}
                    >
                      {t.priority}
                    </span>
                    <span style={{ color: COLOR.neutral[500] }}>{t.end}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
