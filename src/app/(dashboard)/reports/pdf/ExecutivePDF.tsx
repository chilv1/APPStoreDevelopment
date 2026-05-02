// @react-pdf/renderer document for the Executive tab.
// Layout: cover (title + date + user) → KPI grid → status breakdown table →
// top branches table → top risks table.
//
// Charts can't natively render in @react-pdf — they require canvas. We render
// data as tables instead, which is more print-friendly anyway.
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Use built-in Helvetica (no Font.register) so the bundle stays small and we
// don't fight the @react-pdf/renderer font loading. Helvetica supports basic
// accented Latin chars (Spanish accents), but not VI diacritics — VI users
// will see a fallback. Acceptable for v1; upgrade to NotoSans if needed.

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1a202c" },
  cover: { marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, color: "#3b82f6", marginBottom: 6 },
  subtitle: { fontSize: 11, color: "#64748b" },
  meta: { fontSize: 9, color: "#94a3b8", marginTop: 6 },
  section: { marginTop: 18 },
  h2: { fontSize: 13, fontWeight: 700, color: "#1a202c", marginBottom: 8, borderBottom: "1pt solid #e2e8f0", paddingBottom: 4 },

  // KPI grid: 5 columns, manual layout because @react-pdf flexbox is limited
  kpiRow: { flexDirection: "row", marginBottom: 6 },
  kpiCard: {
    flex: 1, marginRight: 6, padding: 8,
    border: "1pt solid #e2e8f0", borderRadius: 4,
    backgroundColor: "#f8fafc",
  },
  kpiCardLast: { marginRight: 0 },
  kpiValue: { fontSize: 16, fontWeight: 700, color: "#3b82f6" },
  kpiLabel: { fontSize: 8, color: "#64748b", marginTop: 2 },

  // Tables
  table: { width: "100%", marginTop: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 6, borderBottom: "1pt solid #cbd5e1" },
  tableRow: { flexDirection: "row", padding: 6, borderBottom: "1pt solid #f1f5f9" },
  th: { fontSize: 9, fontWeight: 700, color: "#475569" },
  td: { fontSize: 9, color: "#1e293b" },

  // Footer with page number
  footer: {
    position: "absolute", bottom: 20, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 8, color: "#94a3b8",
  },
});

export type ExecutivePDFProps = {
  generatedAt: string;
  generatedBy: string;
  locale: "es" | "vi";
  kpis: {
    totalStores: number; inProgress: number; completed: number; onHold: number;
    overdue: number; openingThisMonth: number; totalCapex: number;
    avgProgress: number; totalBranches: number; totalBCs: number;
  };
  branchStats: { code: string; name: string; total: number; avgProgress: number }[];
  topRisk: { code: string; name: string; branch: string; score: number; overdueDays: number; openIssues: number }[];
  closestOpening: { code: string; name: string; branch: string; targetOpenDate: string; daysToOpen: number | null }[];
};

const L = {
  es: {
    title: "Reporte Ejecutivo",
    subtitle: "Resumen consolidado · Apertura de Tiendas",
    generatedBy: "Generado por",
    on: "el",
    kpis: "Indicadores clave",
    totalStores: "Total tiendas", inProgress: "En progreso", completed: "Inauguradas",
    onHold: "En espera", overdue: "Atrasadas", openingThisMonth: "Abren este mes",
    totalCapex: "CAPEX (S/)", avgProgress: "Avance %", totalBranches: "Sucursales", totalBCs: "BCs",
    topBranches: "Top sucursales por avance",
    branchCode: "Código", branchName: "Sucursal", branchTotal: "Tiendas", branchProgress: "Avance %",
    topRisk: "Tiendas en riesgo (top 5)",
    riskCode: "Código", riskStore: "Tienda", riskBranch: "Sucursal",
    riskScore: "Score", riskOverdue: "Días atraso", riskIssues: "Problemas",
    closestOpening: "Próximas inauguraciones (30 días)",
    openCode: "Código", openStore: "Tienda", openDate: "Fecha", openDays: "Días",
    page: "Página", of: "de",
  },
  vi: {
    title: "Bao Cao Tong Quan",
    subtitle: "Tom luoc · Mo cua hang",
    generatedBy: "Tao boi",
    on: "ngay",
    kpis: "Chi so chinh",
    totalStores: "Tong cua hang", inProgress: "Dang thuc hien", completed: "Da khai truong",
    onHold: "Tam dung", overdue: "Tre tien do", openingThisMonth: "KT thang nay",
    totalCapex: "CAPEX (S/)", avgProgress: "Tien do %", totalBranches: "Chi nhanh", totalBCs: "BCs",
    topBranches: "Top chi nhanh theo tien do",
    branchCode: "Ma", branchName: "Chi nhanh", branchTotal: "Cua hang", branchProgress: "Tien do %",
    topRisk: "Cua hang gap rui ro (top 5)",
    riskCode: "Ma", riskStore: "Cua hang", riskBranch: "Chi nhanh",
    riskScore: "Diem", riskOverdue: "Ngay tre", riskIssues: "Vuong mac",
    closestOpening: "Sap khai truong (30 ngay)",
    openCode: "Ma", openStore: "Cua hang", openDate: "Ngay", openDays: "Ngay",
    page: "Trang", of: "/",
  },
};

export function ExecutivePDF(props: ExecutivePDFProps) {
  const t = L[props.locale];

  // Helper to render a row of up to 5 KPIs
  const renderKpiRow = (items: { label: string; value: string | number }[]) => (
    <View style={styles.kpiRow}>
      {items.map((kpi, i) => (
        <View key={i} style={[styles.kpiCard, i === items.length - 1 ? styles.kpiCardLast : {}]}>
          <Text style={styles.kpiValue}>{kpi.value}</Text>
          <Text style={styles.kpiLabel}>{kpi.label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cover */}
        <View style={styles.cover}>
          <Text style={styles.h1}>📊 {t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
          <Text style={styles.meta}>
            {t.generatedBy}: {props.generatedBy} · {t.on} {props.generatedAt}
          </Text>
        </View>

        {/* KPIs */}
        <View style={styles.section}>
          <Text style={styles.h2}>{t.kpis}</Text>
          {renderKpiRow([
            { label: t.totalStores, value: props.kpis.totalStores },
            { label: t.inProgress, value: props.kpis.inProgress },
            { label: t.completed, value: props.kpis.completed },
            { label: t.onHold, value: props.kpis.onHold },
            { label: t.overdue, value: props.kpis.overdue },
          ])}
          {renderKpiRow([
            { label: t.openingThisMonth, value: props.kpis.openingThisMonth },
            { label: t.totalCapex, value: `S/ ${(props.kpis.totalCapex / 1_000_000).toFixed(1)}M` },
            { label: t.avgProgress, value: `${props.kpis.avgProgress}%` },
            { label: t.totalBranches, value: props.kpis.totalBranches },
            { label: t.totalBCs, value: props.kpis.totalBCs },
          ])}
        </View>

        {/* Top branches */}
        {props.branchStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>{t.topBranches}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>{t.branchCode}</Text>
              <Text style={[styles.th, { flex: 3 }]}>{t.branchName}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{t.branchTotal}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{t.branchProgress}</Text>
            </View>
            {props.branchStats.slice(0, 8).map((b) => (
              <View key={b.code} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1 }]}>{b.code}</Text>
                <Text style={[styles.td, { flex: 3 }]}>{b.name}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{b.total}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{b.avgProgress}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top risk */}
        {props.topRisk.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>{t.topRisk}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1.2 }]}>{t.riskCode}</Text>
              <Text style={[styles.th, { flex: 3 }]}>{t.riskStore}</Text>
              <Text style={[styles.th, { flex: 2 }]}>{t.riskBranch}</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>{t.riskScore}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{t.riskOverdue}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{t.riskIssues}</Text>
            </View>
            {props.topRisk.map((r) => (
              <View key={r.code} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1.2 }]}>{r.code}</Text>
                <Text style={[styles.td, { flex: 3 }]}>{r.name}</Text>
                <Text style={[styles.td, { flex: 2 }]}>{r.branch}</Text>
                <Text style={[styles.td, { flex: 0.8 }]}>{r.score}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{r.overdueDays || "-"}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{r.openIssues || "-"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Closest opening */}
        {props.closestOpening.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>{t.closestOpening}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>{t.openCode}</Text>
              <Text style={[styles.th, { flex: 3 }]}>{t.openStore}</Text>
              <Text style={[styles.th, { flex: 2 }]}>{t.riskBranch}</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>{t.openDate}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{t.openDays}</Text>
            </View>
            {props.closestOpening.map((o) => (
              <View key={o.code} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1 }]}>{o.code}</Text>
                <Text style={[styles.td, { flex: 3 }]}>{o.name}</Text>
                <Text style={[styles.td, { flex: 2 }]}>{o.branch}</Text>
                <Text style={[styles.td, { flex: 1.5 }]}>{new Date(o.targetOpenDate).toLocaleDateString("es-PE")}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{o.daysToOpen ?? "-"}d</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Telecom Store Manager · Bitel Peru</Text>
          <Text render={({ pageNumber, totalPages }) => `${t.page} ${pageNumber} ${t.of} ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
