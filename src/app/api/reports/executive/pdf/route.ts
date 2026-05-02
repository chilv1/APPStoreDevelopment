// GET /api/reports/executive/pdf
// Generates a PDF binary for the Executive report. Reuses the same data fetch
// as /api/reports/executive, then renders it through the ExecutivePDF document.
//
// Streaming: react-pdf returns a stream → we convert to a Buffer for Next's
// NextResponse. Big PDFs would benefit from streaming, but for our exec report
// (a few pages) this is fine and simpler.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import {
  getStoresForUser,
  riskScore,
  totalCapex,
  avgProgress,
  storesOpeningThisMonth,
  overdueStores,
  storesClosestToOpening,
  groupByBranch,
  statusCounts,
} from "@/lib/queries/reports";
import { getServerDict } from "@/lib/i18n/server";
import { ExecutivePDF } from "@/app/(dashboard)/reports/pdf/ExecutivePDF";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Replicate the data shape from /api/reports/executive — keeps endpoint independent
  // (no internal HTTP call) and avoids the need for nested fetches.
  const stores = await getStoresForUser(user);
  const totalBranches = await prisma.branch.count();
  const totalBCs = await prisma.businessCenter.count();

  const openIssues = await prisma.issue.groupBy({
    by: ["storeId"],
    where: { status: { not: "CLOSED" } },
    _count: { _all: true },
  });
  const openIssuesByStore: Record<string, number> = {};
  for (const r of openIssues) openIssuesByStore[r.storeId] = r._count._all;

  const ranked = stores
    .map((s: any) => {
      const blocked = (s.phases || []).filter((p: any) => p.status === "BLOCKED").length;
      return { store: s, score: riskScore(s, openIssuesByStore[s.id] ?? 0, blocked) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const closest = storesClosestToOpening(stores as any, 30, 5);
  const byBranch = groupByBranch(stores as any);
  const branchStats = Object.entries(byBranch).map(([id, list]) => {
    const branch = (list[0] as any).bc?.branch;
    return {
      code: branch?.code || "—",
      name: branch?.name || "Sin sucursal",
      total: list.length,
      avgProgress: Math.round(list.reduce((s, p) => s + p.progress, 0) / list.length),
    };
  })
    .filter((b) => b.code !== "—")
    .sort((a, b) => b.avgProgress - a.avgProgress)
    .slice(0, 8);

  const sc = statusCounts(stores as any);

  const { locale } = await getServerDict();

  const doc = ExecutivePDF({
    generatedAt: new Date().toLocaleString(locale === "vi" ? "vi-VN" : "es-PE"),
    generatedBy: user.name || user.email || "—",
    locale,
    kpis: {
      totalStores: stores.length,
      inProgress: sc.IN_PROGRESS || 0,
      completed: sc.COMPLETED || 0,
      onHold: sc.ON_HOLD || 0,
      overdue: overdueStores(stores as any).length,
      openingThisMonth: storesOpeningThisMonth(stores as any).length,
      totalCapex: totalCapex(stores as any),
      avgProgress: avgProgress(stores as any),
      totalBranches,
      totalBCs,
    },
    branchStats,
    topRisk: ranked.map((r) => ({
      code: r.store.code,
      name: r.store.name,
      branch: (r.store as any).bc?.branch?.name || "—",
      score: r.score,
      overdueDays: r.store.targetOpenDate && r.store.status !== "COMPLETED"
        ? Math.max(0, Math.floor((Date.now() - new Date(r.store.targetOpenDate).getTime()) / 86_400_000))
        : 0,
      openIssues: openIssuesByStore[r.store.id] ?? 0,
    })),
    closestOpening: closest.map((s: any) => ({
      code: s.code,
      name: s.name,
      branch: s.bc?.branch?.name || "—",
      targetOpenDate: s.targetOpenDate,
      daysToOpen: s.targetOpenDate
        ? Math.ceil((new Date(s.targetOpenDate).getTime() - Date.now()) / 86_400_000)
        : null,
    })),
  });

  const buffer = await renderToBuffer(doc);

  // Filename includes date so users can keep a history
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="executive-report-${date}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
