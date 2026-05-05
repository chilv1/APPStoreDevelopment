// GET /api/reports/milestones?branchId=&bcId=&pmId=
// Returns 3 rollups in one response:
//   1. byPhase   — for each phase order (1-13), count stores done/active/todo/late + ETA
//   2. byBC      — for each BC, status of F.1/F.6/F.8/F.13 milestones + ETA
//   3. byPM      — for each PM, workload (active phases, capacity, overdue, F.6/F.8 status)
//
// Permission-scoped via getStoresForUser. Filters refine further.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStoresForUser } from "@/lib/queries/stores";

const DAY_MS = 86_400_000;

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId") || "";
  const bcId     = url.searchParams.get("bcId") || "";
  const pmId     = url.searchParams.get("pmId") || "";

  // 1. Pull all stores visible to user (with phases + PM + BC.branch)
  const allStores = await getStoresForUser(user);

  // 2. Apply UI filters in memory (small dataset)
  const stores = allStores.filter((s: any) => {
    if (branchId && s.bc?.branch?.id !== branchId) return false;
    if (bcId     && s.bc?.id !== bcId) return false;
    if (pmId     && s.pm?.id !== pmId) return false;
    return true;
  });

  const now = Date.now();

  // 3. byPhase — 13 phases, aggregate counts
  // Build a phase-order index so we group by order, not by name (template may rename phases)
  const phaseTemplates = await prisma.phaseTemplate.findMany({ orderBy: { order: "asc" } });

  const byPhase = phaseTemplates.map((tpl: any) => {
    let done = 0, active = 0, todo = 0, late = 0;
    let earliestDone: Date | null = null;
    let latestPlanned: Date | null = null;
    let latestActiveEnd: Date | null = null;

    for (const s of stores as any[]) {
      const ph = s.phases?.find((p: any) => p.order === tpl.order);
      if (!ph) continue;

      if (ph.status === "COMPLETED") {
        done++;
        const d = ph.actualEnd ?? ph.plannedEnd;
        if (d && (!earliestDone || new Date(d) < earliestDone)) earliestDone = new Date(d);
      } else if (ph.status === "IN_PROGRESS" || ph.status === "BLOCKED") {
        active++;
        if (ph.plannedEnd && new Date(ph.plannedEnd).getTime() < now) {
          late++;
        }
        if (ph.plannedEnd && (!latestActiveEnd || new Date(ph.plannedEnd) > latestActiveEnd)) {
          latestActiveEnd = new Date(ph.plannedEnd);
        }
      } else {
        todo++;
      }

      if (ph.plannedEnd && (!latestPlanned || new Date(ph.plannedEnd) > latestPlanned)) {
        latestPlanned = new Date(ph.plannedEnd);
      }
    }

    // ETA all done = latestPlanned + late buffer
    // If everything is done, ETA = latestActualEnd. Otherwise = max(latestPlanned, today + estimated catch-up)
    let etaAllDone: Date | null = null;
    let health: "green" | "yellow" | "red" = "green";

    if (done > 0 && active === 0 && todo === 0) {
      etaAllDone = latestPlanned;
      health = "green";
    } else if (latestPlanned) {
      // Add buffer for late stores: avg lateDays × stores still pending / 2
      const pending = active + todo;
      const buffer = late > 0 ? Math.ceil(late * 5) : 0; // 5d slack per late store
      etaAllDone = new Date(latestPlanned.getTime() + buffer * DAY_MS);
      // Health: if late > 25% of active OR pending > 50% of total → red; if any late → yellow
      const total = done + active + todo;
      const lateRatio = active > 0 ? late / active : 0;
      const pendingRatio = total > 0 ? pending / total : 0;
      if (lateRatio > 0.5 || pendingRatio > 0.7) health = "red";
      else if (late > 0 || pendingRatio > 0.3) health = "yellow";
    }

    return {
      order:        tpl.order,
      name:         tpl.name,
      done, active, todo, late,
      earliestDone: earliestDone?.toISOString() ?? null,
      latestPlanned: latestPlanned?.toISOString() ?? null,
      etaAllDone:   etaAllDone?.toISOString() ?? null,
      atRiskCount:  late,
      health,
    };
  });

  // 4. byBC — group stores by BC, compute milestone status for F.1/F.6/F.8/F.13
  const bcMap = new Map<string, any>();
  for (const s of stores as any[]) {
    const bcKey = s.bc?.id;
    if (!bcKey) continue;
    if (!bcMap.has(bcKey)) {
      bcMap.set(bcKey, {
        id:        bcKey,
        code:      s.bc.code,
        name:      s.bc.name,
        branchId:  s.bc.branch?.id ?? null,
        branch:    s.bc.branch?.code ?? "",
        stores:    [],
      });
    }
    bcMap.get(bcKey).stores.push(s);
  }

  const byBC = Array.from(bcMap.values()).map((bc) => {
    const total = bc.stores.length;
    const avgProgress = total ? Math.round(bc.stores.reduce((s: number, x: any) => s + (x.progress ?? 0), 0) / total) : 0;
    const milestones: Record<string, { done: number; total: number }> = {};
    [1, 6, 8, 13].forEach((order) => {
      let done = 0;
      for (const st of bc.stores) {
        const ph = st.phases?.find((p: any) => p.order === order);
        if (ph?.status === "COMPLETED") done++;
      }
      milestones[`f${order}`] = { done, total };
    });
    // ETA all open: max plannedEnd of last phase across stores
    const eta = bc.stores
      .map((st: any) => st.targetOpenDate)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    // Health: avgProgress > 70 = green, > 30 = yellow, else red
    const health = avgProgress >= 70 ? "green" : avgProgress >= 30 ? "yellow" : "red";

    return {
      id: bc.id, code: bc.code, name: bc.name, branch: bc.branch, branchId: bc.branchId,
      storeCount: total, avgProgress, milestones, eta, health,
    };
  }).sort((a, b) => b.avgProgress - a.avgProgress);

  // 5. byPM — group by PM, compute workload
  const pmMap = new Map<string, any>();
  for (const s of stores as any[]) {
    const pmKey = s.pm?.id;
    if (!pmKey) continue;
    if (!pmMap.has(pmKey)) {
      pmMap.set(pmKey, {
        id:     pmKey,
        name:   s.pm.name,
        email:  s.pm.email,
        branch: s.bc?.branch?.code ?? "",
        stores: [],
      });
    }
    pmMap.get(pmKey).stores.push(s);
  }

  const byPM = Array.from(pmMap.values()).map((pm) => {
    const total = pm.stores.length;
    const avgProgress = total ? Math.round(pm.stores.reduce((s: number, x: any) => s + (x.progress ?? 0), 0) / total) : 0;
    let activePhases = 0;
    let overdue = 0;
    let f6done = 0, f8done = 0;
    for (const st of pm.stores) {
      for (const ph of (st.phases ?? [])) {
        if (ph.status === "IN_PROGRESS") activePhases++;
        if (ph.plannedEnd && ph.status !== "COMPLETED" && new Date(ph.plannedEnd).getTime() < now) {
          overdue++;
        }
      }
      const f6 = st.phases?.find((p: any) => p.order === 6);
      if (f6?.status === "COMPLETED") f6done++;
      const f8 = st.phases?.find((p: any) => p.order === 8);
      if (f8?.status === "COMPLETED") f8done++;
    }
    // Capacity: 5 active phases = 100%
    const capacity = Math.round((activePhases / 5) * 100);
    const eta = pm.stores
      .map((st: any) => st.targetOpenDate)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    const status = capacity > 100 ? "red" : capacity > 80 ? "yellow" : "green";

    return {
      id: pm.id, name: pm.name, email: pm.email, branch: pm.branch,
      storeCount: total, avgProgress,
      activePhases, capacity, overdue,
      f6: { done: f6done, total }, f8: { done: f8done, total },
      eta, status,
    };
  }).sort((a, b) => b.avgProgress - a.avgProgress);

  // 6. Top KPIs for quick cards
  const summary = {
    totalStores: stores.length,
    f1Done:  byPhase.find((p) => p.order === 1)?.done ?? 0,
    f6Done:  byPhase.find((p) => p.order === 6)?.done ?? 0,
    f8Done:  byPhase.find((p) => p.order === 8)?.done ?? 0,
    f13Done: byPhase.find((p) => p.order === 13)?.done ?? 0,
    bottleneckPhase: byPhase.reduce((max, p) => p.late > (max?.late ?? 0) ? p : max, null as any),
  };

  return NextResponse.json(
    { summary, byPhase, byBC, byPM },
    { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } },
  );
}
