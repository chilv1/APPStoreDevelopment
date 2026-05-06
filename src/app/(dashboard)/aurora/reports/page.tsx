import ReportCard from "@/components/aurora/reports/ReportCard";
import { MOCK_REPORTS, MOCK_KPIS } from "@/lib/aurora/mock";
import { COLOR } from "@/lib/design/tokens";

export default function ReportsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.neutral[900] }}>Bao cao</h1>
        <p style={{ fontSize: 13, color: COLOR.neutral[600], marginTop: 4 }}>
          Bo bao cao tieu chuan cua Aurora PM
        </p>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {MOCK_REPORTS.map((r, i) => (
          <ReportCard
            key={r.id}
            title={r.title}
            value={r.kpis[0]?.value ?? "-"}
            label={r.kpis[0]?.label ?? ""}
            trend={MOCK_KPIS[i]?.trend}
            delta={MOCK_KPIS[i]?.delta}
          />
        ))}
      </div>
    </div>
  );
}
