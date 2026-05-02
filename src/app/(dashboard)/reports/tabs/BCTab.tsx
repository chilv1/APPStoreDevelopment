"use client";
import { useT } from "@/lib/i18n/context";
export default function BCTab() {
  const t = useT();
  return (
    <div style={{
      padding: 60, textAlign: "center", border: "1px dashed var(--border)",
      borderRadius: 12, color: "var(--text-secondary)", fontSize: 14,
    }}>
      🚧 {t.reportsPage.tabBC} — Sprint REP-2 (próximamente)
    </div>
  );
}
