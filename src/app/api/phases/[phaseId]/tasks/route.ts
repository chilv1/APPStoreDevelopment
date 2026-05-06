import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/phases/:phaseId/tasks
// Returns tasks of a phase with assignee info (id, name, role).
export async function GET(_req: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { phaseId } = await params;
  const tasks = await prisma.task.findMany({
    where: { phaseId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      notes: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(tasks);
}
