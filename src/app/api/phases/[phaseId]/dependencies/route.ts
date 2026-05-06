/**
 * GET /api/phases/[phaseId]/dependencies
 *
 * List all incoming + outgoing dependency edges for a phase.
 * Public read for any authenticated user (visibility follows existing
 * planning data flow — role filtering is applied at the store level
 * via /api/planning).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phaseId } = await params;

  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { id: true, name: true, storeId: true },
  });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const [predecessors, successors] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { successorId: phaseId },
      include: {
        predecessor: { select: { id: true, name: true, phaseNumber: true, order: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.taskDependency.findMany({
      where: { predecessorId: phaseId },
      include: {
        successor: { select: { id: true, name: true, phaseNumber: true, order: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ phaseId, name: phase.name, predecessors, successors });
}
