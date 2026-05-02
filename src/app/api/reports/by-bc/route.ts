// GET /api/reports/by-bc
// Lists Business Centers visible to the current user, with brief stats per BC.
// Used as the dropdown source for the BC tab.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStoresForUser, avgProgress } from "@/lib/queries/reports";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  // Permission scope:
  //   ADMIN          → all BCs
  //   AREA_MANAGER   → BCs in their branch
  //   PM             → BCs of stores assigned to them
  //   SURVEY_STAFF   → also limited to assigned-store BCs
  let bcWhere: any = {};
  if (user.role === "AREA_MANAGER" && user.branchId) {
    bcWhere.branchId = user.branchId;
  } else if (user.role === "PM" || user.role === "SURVEY_STAFF") {
    // Find BCs that contain at least one store the user can see
    const stores = await getStoresForUser(user);
    const bcIds = Array.from(new Set(stores.map((s: any) => s.bc?.id).filter(Boolean)));
    if (bcIds.length === 0) return NextResponse.json([]);
    bcWhere.id = { in: bcIds };
  }

  const bcs = await prisma.businessCenter.findMany({
    where: bcWhere,
    include: {
      branch: { select: { id: true, code: true, name: true } },
      _count: { select: { stores: true } },
    },
    orderBy: { code: "asc" },
  });

  // For avg progress, pull stores once and bucket
  const stores = await getStoresForUser(user);

  const summaries = bcs.map((bc) => {
    const myStores = stores.filter((s: any) => s.bc?.id === bc.id);
    return {
      id: bc.id,
      code: bc.code,
      name: bc.name,
      branch: { id: bc.branch.id, code: bc.branch.code, name: bc.branch.name },
      storeCount: myStores.length,
      avgProgress: avgProgress(myStores as any),
    };
  });

  return NextResponse.json(summaries, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}
