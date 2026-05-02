// Role-scoped store queries. Extracted from /api/stores so that Server Components
// can run the SAME filter logic without going through an extra HTTP hop.
//
// The filter rules:
//   PM           → only stores assigned to this user (by email)
//   AREA_MANAGER → stores under the manager's branch (or fallback to legacy region)
//   ADMIN/other  → all stores
import { prisma } from "@/lib/db";

export type StoreSessionUser = {
  email?: string | null;
  role?: string;
  branchId?: string | null;
  region?: string | null;
};

function buildStoresWhere(user: StoreSessionUser) {
  if (user.role === "PM" && user.email) {
    return { pm: { email: user.email } };
  }
  if (user.role === "AREA_MANAGER") {
    if (user.branchId) return { bc: { branchId: user.branchId } };
    if (user.region)   return { region: user.region };
  }
  return {};
}

/**
 * Fetch all stores visible to the given session user, including the relations needed
 * for list/dashboard/report views (PM, BC + branch, phases, issues count).
 */
export async function getStoresForUser(user: StoreSessionUser) {
  return prisma.storeProject.findMany({
    where: buildStoresWhere(user),
    include: {
      pm: { select: { id: true, name: true, email: true, role: true } },
      bc: { include: { branch: { select: { id: true, name: true, code: true } } } },
      phases: { orderBy: { phaseNumber: "asc" } },
      _count: { select: { issues: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
