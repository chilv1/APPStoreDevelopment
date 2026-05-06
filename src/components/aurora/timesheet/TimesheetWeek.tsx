"use client";

import { useState } from "react";
import { COLOR, RADIUS } from "@/lib/design/tokens";
import { TimesheetEntry } from "@/lib/aurora/mock";

interface Props {
  entries: TimesheetEntry[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TimesheetWeek({ entries }: Props) {
  const tasks = Array.from(new Set(entries.map((e) => e.taskId)));
  const initial: Record<string, Record<string, number>> = {};
  tasks.forEach((tid) => {
    initial[tid] = {};
    DAYS.forEach((_d, i) => {
      const e = entries.find((en) => en.taskId === tid && new Date(en.date).getDay() === (i + 1) % 7);
      initial[tid][i.toString()] = e?.hours ?? 0;
    });
  });
  const [grid, setGrid] = useState(initial);

  const taskTitle = (tid: string) =>
    entries.find((e) => e.taskId === tid)?.taskTitle ?? tid;

  const dayTotal = (i: number): number =>
    tasks.reduce((acc, t) => acc + (grid[t]?.[i.toString()] ?? 0), 0);

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLOR.neutral[200]}`,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: COLOR.neutral[50] }}>
            <th
              style={{
                textAlign: "left",
                padding: "10px 14px",
                fontSize: 11,
                color: COLOR.neutral[500],
                textTransform: "uppercase",
              }}
            >
              Cong viec
            </th>
            {DAYS.map((d) => (
              <th
                key={d}
                style={{
                  padding: "10px 8px",
                  fontSize: 11,
                  color: COLOR.neutral[500],
                  textTransform: "uppercase",
                  width: 70,
                }}
              >
                {d}
              </th>
            ))}
            <th
              style={{
                padding: "10px 8px",
                fontSize: 11,
                color: COLOR.neutral[500],
                textTransform: "uppercase",
                width: 70,
              }}
            >
              Tong
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((tid) => {
            const rowTotal = DAYS.reduce((acc, _d, i) => acc + (grid[tid]?.[i.toString()] ?? 0), 0);
            return (
              <tr key={tid} style={{ borderTop: `1px solid ${COLOR.neutral[100]}` }}>
                <td style={{ padding: "10px 14px", fontSize: 13, color: COLOR.neutral[900] }}>
                  {taskTitle(tid)}
                </td>
                {DAYS.map((_d, i) => (
                  <td key={i} style={{ padding: "6px 8px" }}>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={grid[tid][i.toString()]}
                      onChange={(e) =>
                        setGrid((cur) => ({
                          ...cur,
                          [tid]: { ...cur[tid], [i.toString()]: Number(e.target.value) || 0 },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: 12,
                        border: `1px solid ${COLOR.neutral[200]}`,
                        borderRadius: RADIUS.sm,
                        outline: "none",
                        textAlign: "center",
                      }}
                    />
                  </td>
                ))}
                <td
                  style={{
                    padding: "10px 8px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLOR.brand[700],
                    textAlign: "center",
                  }}
                >
                  {rowTotal}
                </td>
              </tr>
            );
          })}
          <tr style={{ background: COLOR.neutral[50] }}>
            <td
              style={{
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: COLOR.neutral[700],
              }}
            >
              Tong / ngay
            </td>
            {DAYS.map((_d, i) => (
              <td
                key={i}
                style={{
                  padding: "10px 8px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLOR.neutral[700],
                  textAlign: "center",
                }}
              >
                {dayTotal(i)}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
