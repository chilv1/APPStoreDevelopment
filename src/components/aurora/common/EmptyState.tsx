import { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { COLOR } from "@/lib/design/tokens";

interface Props {
  icon?: ReactNode;
  headline: string;
  description?: string;
  cta?: ReactNode;
}

export default function EmptyState({ icon, headline, description, cta }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
        gap: 12,
        color: COLOR.neutral[500],
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: COLOR.neutral[100],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLOR.neutral[400],
        }}
      >
        {icon ?? <Inbox size={28} />}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLOR.neutral[800] }}>{headline}</div>
        {description && (
          <div style={{ fontSize: 13, color: COLOR.neutral[500], marginTop: 4 }}>{description}</div>
        )}
      </div>
      {cta && <div style={{ marginTop: 6 }}>{cta}</div>}
    </div>
  );
}
