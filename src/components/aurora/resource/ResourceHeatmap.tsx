import { COLOR, RADIUS } from "@/lib/design/tokens";
import { Resource } from "@/lib/aurora/mock";

interface Props {
  resources: Resource[];
  weeks?: number;
}

function utilColor(pct: number): string {
  if (pct < 40) return COLOR.neutral[200];
  if (pct < 80) return COLOR.accent[300];
  if (pct < 100) return COLOR.brand[400];
  if (pct < 130) return COLOR.brand[600];
  return COLOR.semantic.danger;
}

function pseudo(seed: number, idx: number): number {
  const x = Math.sin(seed * 9301 + idx * 49297) * 233280;
  const f = x - Math.floor(x);
  return Math.round(20 + f * 130);
}

export default function ResourceHeatmap({ resources, weeks = 8 }: Props) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLOR.neutral[200]}`,
        borderRadius: RADIUS.lg,
        padding: 16,
        overflowX: "auto",
      }}
    >
      <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", fontSize: 11, color: COLOR.neutral[500], minWidth: 180 }}>
              Nguon luc
            </th>
            {Array.from({ length: weeks }).map((_, i) => (
              <th key={i} style={{ fontSize: 11, color: COLOR.neutral[500], width: 56 }}>
                W{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((r, ri) => (
            <tr key={r.id}>
              <td style={{ padding: "4px 0" }}>
                <div style={{ fontSize: 13, color: COLOR.neutral[900], fontWeight: 500 }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 11, color: COLOR.neutral[500] }}>{r.role}</div>
              </td>
              {Array.from({ length: weeks }).map((_, wi) => {
                const u = pseudo(ri + 1, wi + 1);
                return (
                  <td key={wi} style={{ textAlign: "center" }}>
                    <div
                      title={`${u}%`}
                      style={{
                        height: 32,
                        borderRadius: RADIUS.sm,
                        background: utilColor(u),
                        color: u > 80 ? "#fff" : COLOR.neutral[800],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {u}%
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
