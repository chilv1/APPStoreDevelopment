"use client";

import { COLOR, RADIUS } from "@/lib/design/tokens";
import { Task } from "@/lib/aurora/mock";

interface Props {
  tasks: Task[];
}

function dayDiff(a: string, b: string): number {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Math.max(1, Math.round((tb - ta) / 86400000));
}

export default function GanttTimeline({ tasks }: Props) {
  if (tasks.length === 0) {
    return null;
  }
  const minStart = tasks.reduce(
    (acc, t) => (new Date(t.start) < new Date(acc) ? t.start : acc),
    tasks[0].start
  );
  const maxEnd = tasks.reduce(
    (acc, t) => (new Date(t.end) > new Date(acc) ? t.end : acc),
    tasks[0].end
  );
  const totalDays = dayDiff(minStart, maxEnd);
  const dayPx = 12;
  const rowH = 30;
  const labelW = 220;
  const width = labelW + totalDays * dayPx + 40;
  const height = tasks.length * rowH + 40;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLOR.neutral[200]}`,
        borderRadius: RADIUS.lg,
        overflow: "auto",
        padding: 16,
      }}
    >
      <svg width={width} height={height} role="img" aria-label="Gantt timeline">
        {/* Grid */}
        {Array.from({ length: Math.ceil(totalDays / 7) + 1 }).map((_, i) => (
          <line
            key={`g${i}`}
            x1={labelW + i * 7 * dayPx}
            x2={labelW + i * 7 * dayPx}
            y1={20}
            y2={height - 10}
            stroke={COLOR.neutral[100]}
          />
        ))}
        {/* Header */}
        {Array.from({ length: Math.ceil(totalDays / 7) + 1 }).map((_, i) => (
          <text
            key={`l${i}`}
            x={labelW + i * 7 * dayPx + 2}
            y={14}
            fontSize={10}
            fill={COLOR.neutral[500]}
          >
            T{i + 1}
          </text>
        ))}
        {/* Bars */}
        {tasks.map((t, idx) => {
          const offset = dayDiff(minStart, t.start);
          const len = dayDiff(t.start, t.end);
          const y = 24 + idx * rowH;
          const x = labelW + offset * dayPx;
          const w = len * dayPx;
          const isParent = t.parentId === null;
          return (
            <g key={t.id}>
              <text
                x={4}
                y={y + 14}
                fontSize={11}
                fill={COLOR.neutral[700]}
                fontWeight={isParent ? 600 : 400}
              >
                {t.wbs} {t.title.slice(0, 22)}
              </text>
              <rect
                x={x}
                y={y + 4}
                width={w}
                height={rowH - 12}
                rx={4}
                fill={isParent ? COLOR.neutral[400] : COLOR.brand[500]}
                opacity={0.85}
              />
              <rect
                x={x}
                y={y + 4}
                width={(w * t.progress) / 100}
                height={rowH - 12}
                rx={4}
                fill={isParent ? COLOR.neutral[600] : COLOR.brand[700]}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
