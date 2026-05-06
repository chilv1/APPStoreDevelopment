"use client";

import { useState } from "react";
import { COLOR, RADIUS } from "@/lib/design/tokens";
import { Task } from "@/lib/aurora/mock";
import InlineCell from "./InlineCell";

interface Props {
  tasks: Task[];
}

const STATUS_COLOR: Record<string, string> = {
  TODO: COLOR.neutral[400],
  IN_PROGRESS: COLOR.accent[500],
  REVIEW: COLOR.brand[500],
  DONE: COLOR.semantic.success,
  BLOCKED: COLOR.semantic.danger,
};

export default function TaskGrid({ tasks }: Props) {
  const [rows, setRows] = useState(tasks);

  const update = (id: string, field: keyof Task, value: string) => {
    setRows((cur) =>
      cur.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

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
            {["WBS", "Cong viec", "Trang thai", "Uu tien", "Bat dau", "Ket thuc", "Tien do"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLOR.neutral[500],
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom: `1px solid ${COLOR.neutral[200]}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} style={{ borderBottom: `1px solid ${COLOR.neutral[100]}` }}>
              <td style={{ padding: "6px 12px", fontSize: 12, color: COLOR.neutral[500], width: 60 }}>
                {t.wbs}
              </td>
              <td style={{ padding: "4px 12px", paddingLeft: t.parentId ? 32 : 12 }}>
                <InlineCell value={t.title} onCommit={(v) => update(t.id, "title", v)} />
              </td>
              <td style={{ padding: "6px 12px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: STATUS_COLOR[t.status],
                    background: `${STATUS_COLOR[t.status]}1A`,
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  {t.status}
                </span>
              </td>
              <td style={{ padding: "6px 12px", fontSize: 12, color: COLOR.neutral[700] }}>{t.priority}</td>
              <td style={{ padding: "6px 12px", fontSize: 12, color: COLOR.neutral[700] }}>{t.start}</td>
              <td style={{ padding: "6px 12px", fontSize: 12, color: COLOR.neutral[700] }}>{t.end}</td>
              <td style={{ padding: "6px 12px", width: 140 }}>
                <div
                  style={{
                    height: 6,
                    background: COLOR.neutral[100],
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${t.progress}%`,
                      height: "100%",
                      background: COLOR.brand[500],
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: COLOR.neutral[500], marginTop: 2 }}>
                  {t.progress}%
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
