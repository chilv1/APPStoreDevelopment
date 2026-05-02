// GET /api/reports/by-branch
// Lists branches the current user can see, plus a summary card per branch
// (store count, avg progress, status breakdown). Used for the Branch tab dropdown
// and as a "branches at a glance" overview when admins land on the tab.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStoresForUser, statusCounts, avgProgress } from "@/lib/queries/reports";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  // Permission: ADMIN sees all branches; AREA_MANAGER sees only their branch.
  // PM/SURVEY are out (they get redirected from this tab in the UI).
  if (user.role !== "ADMIN" && user.role !== "AREA_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const branchWhere = user.role === "AREA_MANAGER" && user.branchId
    ? { id: user.branchId as string }
    : {};

  const branches = await prisma.branch.findMany({
    where: branchWhere,
    include: {
      _count: { select: { businessCenters: true, users: true } },
      businessCenters: {
        include: { _count: { select: { stores: true } } },
      },
    },
    orderBy: { code: "asc" },
  });

  // Pull all stores once (filtered by user) and bucket per branch in memory.
  const stores = await getStoresForUser(user);

  const summaries = branches.map((b) => {
    const myStores = stores.filter((s: any) => s.bc?.branch?.id === b.id);
    return {
      id: b.id,
      name: b.name,
      code: b.code,
      bcCount: b._count.businessCenters,
      userCount: b._count.users,
      storeCount: myStores.length,
      totalStoresInBCs: b.businessCenters.reduce((sum, bc) => sum + bc._count.stores, 0),
      avgProgress: avgProgress(myStores as any),
      statusBreakdown: statusCounts(myStores as any),
    };
  });

  return NextResponse.json(summaries, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}
