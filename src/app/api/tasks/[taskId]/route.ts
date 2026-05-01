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

  // Log activity (non-critical — ignore FK errors from stale sessions)
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  try { await prisma.activity.create({
    data: {
      userId:  dbUser ? user.id : null,
      storeId: task.phase.storeId,
      action:  "TASK_UPDATED",
      entity:  "Task",
      entityId: taskId,
      details: `Cập nhật task "${task.title}" → ${body.status || "updated"}`,
    },
  }); } catch { /* non-critical */ }

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

  // Auto-update phase status based on its tasks (don't override BLOCKED)
  const currentPhase = allPhases.find((p) => p.id === task.phaseId);
  if (currentPhase && currentPhase.status !== "BLOCKED") {
    const phaseTasks = currentPhase.tasks;
    const allDone = phaseTasks.length > 0 && phaseTasks.every((t) => t.status === "DONE");
    const anyStarted = phaseTasks.some((t) => t.status === "DONE" || t.status === "IN_PROGRESS");
    const newPhaseStatus = allDone ? "COMPLETED" : anyStarted ? "IN_PROGRESS" : "NOT_STARTED";
    if (newPhaseStatus !== currentPhase.status) {
      await prisma.phase.update({ where: { id: currentPhase.id }, data: { status: newPhaseStatus } });
    }
  }

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
