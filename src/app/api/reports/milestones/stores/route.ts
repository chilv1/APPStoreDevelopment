// GET /api/reports/milestones/stores?order=8&filter=late&branchId=&bcId=&pmId=
// Returns list of stores at a specific phase order, filtered by status.
//   filter: all | done | active | todo | late
// Used by drill-down modal in PhaseMilestonesTab.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStoresForUser } from "@/lib/queries/stores";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const url = new URL(request.url);
  const order    = Number(url.searchParams.get("order") || "0");
  const filter   = url.searchParams.get("filter") || "all";
  const branchId = url.searchParams.get("branchId") || "";
  const bcId     = url.searchParams.get("bcId") || "";
  const pmId     = url.searchParams.get("pmId") || "";

  if (!order || order < 1) {
    return NextResponse.json({ error: "Invalid phase order" }, { status: 400 });
  }

  const allStores = await getStoresForUser(user);
  const now = Date.now();

  const rows = allStores
    .filter((s: any) => {
      if (branchId && s.bc?.branch?.id !== branchId) return false;
      if (bcId     && s.bc?.id !== bcId) return false;
      if (pmId     && s.pm?.id !== pmId) return false;
      return true;
    })
    .map((s: any) => {
      const ph = s.phases?.find((p: any) => p.order === order);
      if (!ph) return null;
      const isLate = ph.status !== "COMPLETED" && ph.plannedEnd && new Date(ph.plannedEnd).getTime() < now;
      const lateDays = isLate
        ? Math.floor((now - new Date(ph.plannedEnd).getTime()) / 86_400_000)
        : 0;
      let status: "done" | "active" | "todo" = "todo";
      if (ph.status === "COMPLETED") status = "done";
      else if (ph.status === "IN_PROGRESS" || ph.status === "BLOCKED") status = "active";
      return {
        storeId:       s.id,
        storeCode:     s.code,
        storeName:     s.name,
        bcCode:        s.bc?.code ?? "",
        bcId:          s.bc?.id ?? null,
        branchCode:    s.bc?.branch?.code ?? "",
        branchId:      s.bc?.branch?.id ?? null,
        pmId:          s.pm?.id ?? null,
        pmName:        s.pm?.name ?? "",
        phaseId:       ph.id,
        phaseName:     ph.name,
        phaseStatus:   ph.status,
        plannedStart:  ph.plannedStart,
        plannedEnd:    ph.plannedEnd,
        actualStart:   ph.actualStart,
        actualEnd:     ph.actualEnd,
        status,
        late:     isLate,
        lateDays: lateDays || 0,
      };
    })
    .filter(Boolean);

  // Apply status filter
  const filtered = filter === "all"
    ? rows
    : filter === "late"
      ? rows.filter((r: any) => r.late)
      : rows.filter((r: any) => r.status === filter);

  // Counts for filter chips
  const counts = {
    all:    rows.length,
    done:   rows.filter((r: any) => r.status === "done").length,
    active: rows.filter((r: any) => r.status === "active").length,
    todo:   rows.filter((r: any) => r.status === "todo").length,
    late:   rows.filter((r: any) => r.late).length,
  };

  return NextResponse.json({ rows: filtered, counts });
}
