import ResourceHeatmap from "@/components/aurora/resource/ResourceHeatmap";
import { MOCK_RESOURCES } from "@/lib/aurora/mock";
import { COLOR } from "@/lib/design/tokens";

export default function ResourcesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.neutral[900] }}>Nguon luc</h1>
        <p style={{ fontSize: 13, color: COLOR.neutral[600], marginTop: 4 }}>
          Heatmap ti le su dung ({MOCK_RESOURCES.length} nguoi, 8 tuan)
        </p>
      </header>
      <ResourceHeatmap resources={MOCK_RESOURCES} />
    </div>
  );
}
