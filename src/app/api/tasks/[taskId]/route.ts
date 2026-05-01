import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const body = await request.json();
  const user = session.user as any;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.priority && { priority: body.priority }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.status === "DONE" && { completedAt: new Date() }),
      ...(body.status !== "DONE" && body.status && { completedAt: null }),
    },
    include: {
      phase: { include: { store: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      userId: user.id,
      storeId: task.phase.storeId,
      action: "TASK_UPDATED",
      entity: "Task",
      entityId: taskId,
      details: `Cập nhật task "${task.title}" → ${body.status || "updated"}`,
    },
  });

  // Recalculate store progress
  const allPhases = await prisma.phase.findMany({
    where: { storeId: task.phase.storeId },
    include: { tasks: true },
  });

  const totalTasks = allPhases.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = allPhases.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.status === "DONE").length,
    0
  );
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Auto-update store status from progress (don't override ON_HOLD/CANCELLED)
  const currentStatus = task.phase.store.status;
  let newStatus = currentStatus;
  if (!["ON_HOLD", "CANCELLED"].includes(currentStatus)) {
    if (progress === 100) newStatus = "COMPLETED";
    else if (progress > 0) newStatus = "IN_PROGRESS";
    else newStatus = "PLANNING";
  }

  await prisma.storeProject.update({
    where: { id: task.phase.storeId },
    data: { progress, ...(newStatus !== currentStatus && { status: newStatus }) },
  });

  return NextResponse.json({ ...task, storeProgress: progress });
}
