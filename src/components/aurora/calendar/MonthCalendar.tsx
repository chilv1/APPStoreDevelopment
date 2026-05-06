"use client";

import { COLOR, RADIUS } from "@/lib/design/tokens";
import { Task } from "@/lib/aurora/mock";

interface Props {
  tasks: Task[];
  year?: number;
  month?: number; // 0-indexed
}

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function MonthCalendar({ tasks, year = 2026, month = 4 }: Props) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstDow = (first.getDay() + 6) % 7; // 0 = Mon
  const daysInMonth = last.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const tasksOnDay = (d: number): Task[] => {
    const date = new Date(year, month, d).toISOString().slice(0, 10);
    return tasks.filter((t) => t.start <= date && t.end >= date).slice(0, 3);
  };

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLOR.neutral[200]}`,
        borderRadius: RADIUS.lg,
        padding: 16,
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 600, color: COLOR.neutral[900] }}>
        {first.toLocaleString("en-US", { month: "long", year: "numeric" })}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4,
        }}
      >
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLOR.neutral[500],
              textAlign: "center",
              padding: 4,
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((c, i) => (
          <div
            key={i}
            style={{
              minHeight: 76,
              padding: 6,
              background: c ? COLOR.neutral[50] : "transparent",
              borderRadius: RADIUS.md,
              border: c ? `1px solid ${COLOR.neutral[100]}` : "none",
            }}
          >
            {c && (
              <>
                <div style={{ fontSize: 11, color: COLOR.neutral[600], marginBottom: 4 }}>{c}</div>
                {tasksOnDay(c).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      fontSize: 10,
                      padding: "2px 4px",
                      background: COLOR.brand[100],
                      color: COLOR.brand[800],
                      borderRadius: 4,
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.title}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
