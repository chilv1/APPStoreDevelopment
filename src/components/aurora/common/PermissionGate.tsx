import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { COLOR, RADIUS } from "@/lib/design/tokens";

interface Props {
  allowed: boolean;
  role?: string;
  children: ReactNode;
  message?: string;
}

export default function PermissionGate({ allowed, role, children, message }: Props) {
  if (allowed) return <>{children}</>;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 16,
        background: COLOR.neutral[50],
        border: `1px dashed ${COLOR.neutral[200]}`,
        borderRadius: RADIUS.lg,
        color: COLOR.neutral[600],
        fontSize: 13,
      }}
    >
      <Lock size={18} color={COLOR.neutral[400]} />
      <div>
        <div style={{ fontWeight: 600, color: COLOR.neutral[800] }}>
          {message ?? "Khong co quyen truy cap"}
        </div>
        {role && (
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Yeu cau quyen: <strong>{role}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
