"use client";

import { COLOR, RADIUS } from "@/lib/design/tokens";
import { Task } from "@/lib/aurora/mock";
import Drawer from "../common/Drawer";

interface Props {
  task: Task | null;
  onClose: () => void;
}

export default function TaskDetailDrawer({ task, onClose }: Props) {
  return (
    <Drawer open={task !== null} onClose={onClose} title={task ? `Task ${task.wbs}` : ""} width={460}>
      {task && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: COLOR.neutral[500], marginBottom: 4 }}>Tieu de</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLOR.neutral[900] }}>{task.title}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Trang thai" value={task.status} />
            <Field label="Uu tien" value={task.priority} />
            <Field label="Bat dau" value={task.start} />
            <Field label="Ket thuc" value={task.end} />
            <Field label="Thoi luong" value={`${task.duration} ngay`} />
            <Field label="Tien do" value={`${task.progress}%`} />
          </div>

          <div>
            <div style={{ fontSize: 11, color: COLOR.neutral[500], marginBottom: 4 }}>Phu thuoc</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {task.dependencies.length === 0 ? (
                <span style={{ fontSize: 12, color: COLOR.neutral[500] }}>Khong co</span>
              ) : (
                task.dependencies.map((d) => (
                  <span
                    key={d}
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      background: COLOR.neutral[100],
                      borderRadius: 999,
                      color: COLOR.neutral[700],
                    }}
                  >
                    {d}
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: COLOR.neutral[500], marginBottom: 4 }}>Tien do</div>
            <div
              style={{
                height: 8,
                background: COLOR.neutral[100],
                borderRadius: RADIUS.sm,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${task.progress}%`,
                  height: "100%",
                  background: COLOR.brand[500],
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COLOR.neutral[500], marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: COLOR.neutral[900], fontWeight: 500 }}>{value}</div>
    </div>
  );
}
