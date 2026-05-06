import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const body = await request.json();
  const user = session.user as any;

  // completedAt logic:
  // - If client sent explicit completedAt, honor it (parsed as date, or null to clear)
  // - Else if status transitions TO DONE, auto-set to now
  // - Else if status transitions AWAY FROM DONE, clear to null
  let completedAtPatch: { completedAt?: Date | null } = {};
  if (body.completedAt !== undefined) {
    completedAtPatch.completedAt = body.completedAt ? new Date(body.completedAt) : null;
  } else if (body.status === "DONE") {
    completedAtPatch.completedAt = new Date();
  } else if (body.status && body.status !== "DONE") {
    completedAtPatch.completedAt = null;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.priority && { priority: body.priority }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...completedAtPatch,
    },
    include: {
      phase: { include: { store: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  // Sync with Planificación: if task dueDate now exceeds the phase's plannedEnd,
  // extend the phase so the Gantt bar reflects the new latest finish.
  if (task.dueDate && task.phase) {
    const phaseEnd = task.phase.plannedEnd ? new Date(task.phase.plannedEnd).getTime() : null;
    const due = new Date(task.dueDate).getTime();
    if (phaseEnd === null || due > phaseEnd) {
      await prisma.phase.update({
        where: { id: task.phaseId },
        data: { plannedEnd: task.dueDate },
      });
    }
  }

  // Log activity (non-critical — ignore FK errors from stale sessions)
  const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
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

  // Auto-update phase status + actualStart/actualEnd based on its tasks.
  const currentPhase = allPhases.find((p) => p.id === task.phaseId);
  if (currentPhase && currentPhase.status !== "BLOCKED") {
    const phaseTasks = currentPhase.tasks;
    const allDone = phaseTasks.length > 0 && phaseTasks.every((t) => t.status === "DONE");
    const anyStarted = phaseTasks.some((t) => t.status === "DONE" || t.status === "IN_PROGRESS");
    const newPhaseStatus = allDone ? "COMPLETED" : anyStarted ? "IN_PROGRESS" : "NOT_STARTED";

    const phaseUpdate: any = {};
    if (newPhaseStatus !== currentPhase.status) phaseUpdate.status = newPhaseStatus;

    // First time the phase actually starts → stamp actualStart so the Gantt
    // bar can shift to reflect on-the-ground progress immediately.
    if (newPhaseStatus !== "NOT_STARTED" && !currentPhase.actualStart) {
      phaseUpdate.actualStart = new Date();
    }
    // All tasks DONE → stamp actualEnd from the latest completed task
    // (or today if none) so the bar's right edge snaps to actual completion.
    if (allDone && !currentPhase.actualEnd) {
      const completedDates = phaseTasks
        .map((t) => t.completedAt ? new Date(t.completedAt).getTime() : null)
        .filter((x): x is number => x !== null);
      const latestDone = completedDates.length > 0 ? new Date(Math.max(...completedDates)) : new Date();
      phaseUpdate.actualEnd = latestDone;
    }
    // Phase became NOT_STARTED again (e.g. all tasks reverted) → clear actuals.
    if (newPhaseStatus === "NOT_STARTED" && (currentPhase.actualStart || currentPhase.actualEnd)) {
      phaseUpdate.actualStart = null;
      phaseUpdate.actualEnd = null;
    }
    if (Object.keys(phaseUpdate).length > 0) {
      await prisma.phase.update({ where: { id: currentPhase.id }, data: phaseUpdate });
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
