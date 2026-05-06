import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { phaseId } = await params;
  const list = await prisma.resourceAssignment.findMany({
    where: { phaseId },
    include: {
      resource: {
        select: { id: true, name: true, kind: true, group: true, standardRate: true, maxUnits: true,
          user: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(list);
}
