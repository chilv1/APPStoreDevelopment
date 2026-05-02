"use client";

// BranchTab — placeholder for Sprint REP-2. Will render branch dropdown + drill-down.
// Sprint REP-1 ships ExecutiveTab fully; the rest are stubs that compile.
import { useT } from "@/lib/i18n/context";

export default function BranchTab() {
  const t = useT();
  return (
    <div style={{
      padding: 60, textAlign: "center", border: "1px dashed var(--border)",
      borderRadius: 12, color: "var(--text-secondary)", fontSize: 14,
    }}>
      🚧 {t.reportsPage.tabBranch} — Sprint REP-2 (próximamente)
    </div>
  );
}
