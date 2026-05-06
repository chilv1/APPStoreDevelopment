import { Plus } from "lucide-react";
import PortfolioKPIs from "@/components/aurora/dashboard/PortfolioKPIs";
import ReportCard from "@/components/aurora/reports/ReportCard";
import EmptyState from "@/components/aurora/common/EmptyState";
import { MOCK_KPIS, MOCK_REPORTS, MOCK_PROJECTS } from "@/lib/aurora/mock";
import { COLOR } from "@/lib/design/tokens";

export default function PortfolioPage() {
  const hasData = MOCK_PROJECTS.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.neutral[900] }}>
          Portfolio Dashboard
        </h1>
        <p style={{ fontSize: 13, color: COLOR.neutral[600], marginTop: 4 }}>
          Tong quan hieu suat danh muc du an hien tai
        </p>
      </header>

      {hasData ? (
        <>
          <PortfolioKPIs kpis={MOCK_KPIS} />

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: COLOR.neutral[900], marginBottom: 12 }}>
              Bao cao nhanh
            </h2>
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
          </section>
        </>
      ) : (
        <EmptyState
          headline="Chua co du an nao"
          description="Tao du an dau tien de bat dau theo doi."
          cta={
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: COLOR.brand[500],
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Tao du an
            </button>
          }
        />
      )}
    </div>
  );
}
