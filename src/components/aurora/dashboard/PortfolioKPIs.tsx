import { COLOR, RADIUS, SHADOW } from "@/lib/design/tokens";
import { KPI } from "@/lib/aurora/mock";

interface Props {
  kpis: KPI[];
}

export default function PortfolioKPIs({ kpis }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {kpis.map((k) => (
        <div
          key={k.id}
          style={{
            background: "#fff",
            border: `1px solid ${COLOR.neutral[200]}`,
            borderRadius: RADIUS.lg,
            padding: 18,
            boxShadow: SHADOW.xs,
          }}
        >
          <div style={{ fontSize: 12, color: COLOR.neutral[500], fontWeight: 500 }}>{k.label}</div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: COLOR.neutral[900],
              marginTop: 6,
              lineHeight: 1.2,
            }}
          >
            {k.value}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: 600,
              color: k.delta >= 0 ? COLOR.semantic.success : COLOR.semantic.danger,
            }}
          >
            {k.delta >= 0 ? "+" : ""}
            {k.delta}% so voi tuan truoc
          </div>
        </div>
      ))}
    </div>
  );
}
