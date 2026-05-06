import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MOCK_PROJECTS } from "@/lib/aurora/mock";
import { COLOR, RADIUS, SHADOW } from "@/lib/design/tokens";

const STATUS_COLOR: Record<string, string> = {
  PLANNING: COLOR.neutral[500],
  ACTIVE: COLOR.accent[500],
  AT_RISK: COLOR.brand[600],
  COMPLETED: COLOR.semantic.success,
  ON_HOLD: COLOR.semantic.danger,
};

const HEALTH_COLOR: Record<string, string> = {
  GREEN: COLOR.semantic.success,
  AMBER: COLOR.brand[500],
  RED: COLOR.semantic.danger,
};

export default function ProjectsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.neutral[900] }}>Du an</h1>
        <p style={{ fontSize: 13, color: COLOR.neutral[600], marginTop: 4 }}>
          {MOCK_PROJECTS.length} du an dang theo doi
        </p>
      </header>

      <div
        style={{
          background: "#fff",
          border: `1px solid ${COLOR.neutral[200]}`,
          borderRadius: RADIUS.lg,
          overflow: "hidden",
          boxShadow: SHADOW.xs,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: COLOR.neutral[50] }}>
              {["Code", "Du an", "Vung", "PM", "Status", "Health", "Tien do", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    fontSize: 11,
                    color: COLOR.neutral[500],
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_PROJECTS.map((p) => (
              <tr key={p.id} style={{ borderTop: `1px solid ${COLOR.neutral[100]}` }}>
                <td style={{ padding: "12px 14px", fontSize: 12, color: COLOR.neutral[500] }}>{p.code}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: COLOR.neutral[900], fontWeight: 500 }}>
                  {p.name}
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: COLOR.neutral[700] }}>{p.region}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: COLOR.neutral[700] }}>{p.pm}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: `${STATUS_COLOR[p.status]}1A`,
                      color: STATUS_COLOR[p.status],
                    }}
                  >
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: HEALTH_COLOR[p.health],
                    }}
                  />
                </td>
                <td style={{ padding: "12px 14px", width: 160 }}>
                  <div
                    style={{
                      height: 6,
                      background: COLOR.neutral[100],
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${p.progress}%`,
                        height: "100%",
                        background: COLOR.brand[500],
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: COLOR.neutral[500], marginTop: 2 }}>
                    {p.progress}%
                  </div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <Link
                    href={`/aurora/projects/${p.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: COLOR.brand[700],
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Mo <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
