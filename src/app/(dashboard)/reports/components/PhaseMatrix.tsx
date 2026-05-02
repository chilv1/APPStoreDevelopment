"use client";

// Custom CSS-grid matrix: rows = stores, cols = 11 phases. Each cell colored by
// phase status (Done/InProgress/Blocked/NotStarted). Hover shows tooltip with phase name.
//
// We don't use Chart.js for this — it's just a colored table. CSS grid keeps it
// pixel-perfect aligned and trivially responsive.
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { PHASE_STATUS_PALETTE } from "@/lib/charts/theme";
import { PHASE_ICONS } from "@/lib/utils";

export type PhaseMatrixRow = {
  storeId: string;
  storeCode: string;
  storeName: string;
  progress: number;
  cells: { phaseNumber: number; status: string; name: string }[];
};

export default function PhaseMatrix({ rows }: { rows: PhaseMatrixRow[] }) {
  const t = useT();

  if (rows.length === 0) {
    return (
      <div style={{
        padding: 40, textAlign: "center", color: "var(--text-secondary)",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 12, fontSize: 13,
      }}>
        {t.reportsPage.emptyProjects}
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 18px",
      overflowX: "auto",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
        {t.reportsPage.phaseMatrix}
      </div>

      {/* Header row: store name col + 11 phase cols */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "200px repeat(11, 1fr)",
        gap: 4,
        minWidth: 720,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", padding: "4px 6px" }}>
          {t.reportsPage.tableStoreName}
        </div>
        {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
          <div key={n} style={{
            fontSize: 10, fontWeight: 700, color: "var(--text-secondary)",
            textAlign: "center", padding: "4px 0",
          }}>
            <div>{PHASE_ICONS[n]}</div>
            <div style={{ marginTop: 2 }}>F{n}</div>
          </div>
        ))}
      </div>

      {/* Rows: 1 row per store */}
      {rows.map((row) => (
        <div key={row.storeId} style={{
          display: "grid",
          gridTemplateColumns: "200px repeat(11, 1fr)",
          gap: 4,
          marginTop: 4,
          minWidth: 720,
          alignItems: "center",
        }}>
          <Link href={`/stores/${row.storeId}`} style={{
            padding: "6px 8px",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 6,
            textDecoration: "none",
            color: "var(--text-primary)",
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            <div style={{ fontWeight: 600 }}>{row.storeCode}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{row.storeName}</div>
          </Link>
          {row.cells.map((c) => {
            const color = PHASE_STATUS_PALETTE[c.status] || "var(--text-muted)";
            const tooltip = `F${c.phaseNumber}${c.name ? ": " + c.name : ""} · ${
              c.status === "COMPLETED" ? t.reportsPage.phaseStatusDone
              : c.status === "IN_PROGRESS" ? t.reportsPage.phaseStatusInProgress
              : c.status === "BLOCKED" ? t.reportsPage.phaseStatusBlocked
              : t.reportsPage.phaseStatusNotStarted
            }`;
            return (
              <div
                key={c.phaseNumber}
                title={tooltip}
                style={{
                  height: 32,
                  borderRadius: 4,
                  background: color,
                  opacity: c.status === "NOT_STARTED" ? 0.25 : c.status === "BLOCKED" ? 0.85 : 0.85,
                  border: c.status === "BLOCKED" ? "1px solid #ef4444" : "1px solid transparent",
                  cursor: "help",
                }}
              />
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16,
        fontSize: 11, color: "var(--text-secondary)",
      }}>
        {[
          { key: "COMPLETED", label: t.reportsPage.phaseStatusDone },
          { key: "IN_PROGRESS", label: t.reportsPage.phaseStatusInProgress },
          { key: "BLOCKED", label: t.reportsPage.phaseStatusBlocked },
          { key: "NOT_STARTED", label: t.reportsPage.phaseStatusNotStarted },
        ].map((l) => (
          <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 14, height: 14, borderRadius: 3,
              background: PHASE_STATUS_PALETTE[l.key],
              opacity: l.key === "NOT_STARTED" ? 0.25 : 0.85,
            }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
