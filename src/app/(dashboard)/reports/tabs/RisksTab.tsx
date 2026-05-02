"use client";
import { useT } from "@/lib/i18n/context";
export default function RisksTab() {
  const t = useT();
  return (
    <div style={{
      padding: 60, textAlign: "center", border: "1px dashed var(--border)",
      borderRadius: 12, color: "var(--text-secondary)", fontSize: 14,
    }}>
      🚧 {t.reportsPage.tabRisks} — Sprint REP-3 (próximamente)
    </div>
  );
}
