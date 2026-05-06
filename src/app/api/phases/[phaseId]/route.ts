import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cascadeDependents } from "@/lib/phase-scheduler";

// ── Helper: verify PM owns the store that contains this phase ──────────────
async function checkPhaseOwnership(phaseId: string, user: any): Promise<{ storeId: string } | null> {
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { store: { select: { id: true, pmId: true } } },
  });
  if (!phase) return null;

  // ADMIN and AREA_MANAGER can edit any phase
  if (["ADMIN", "AREA_MANAGER"].includes(user.role)) return { storeId: phase.store.id };

  // PM can only edit phases in their assigned stores
  if (user.role === "PM") {
    const dbUser = await prisma.user.findFirst({
      where: { OR: [{ email: user.email }, { id: user.id }] },
      select: { id: true },
    });
    if (!dbUser || phase.store.pmId !== dbUser.id) return null;
    return { storeId: phase.store.id };
  }

  // SURVEY_STAFF — read only, no write
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { phaseId } = await params;

  // Ownership check
  const ownership = await checkPhaseOwnership(phaseId, user);
  if (!ownership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const storeId = ownership.storeId;

  const body = await request.json();

  const data: any = {};
  const parseDate = (v: any) => (v === null || v === "" ? null : new Date(v));

  if (body.plannedStart    !== undefined) data.plannedStart    = parseDate(body.plannedStart);
  if (body.plannedEnd      !== undefined) data.plannedEnd      = parseDate(body.plannedEnd);
  if (body.actualStart     !== undefined) data.actualStart     = parseDate(body.actualStart);
  if (body.actualEnd       !== undefined) data.actualEnd       = parseDate(body.actualEnd);
  if (body.status          !== undefined) data.status          = body.status;
  if (body.dependencyType  !== undefined) data.dependencyType  = body.dependencyType;
  if (body.dependsOnId     !== undefined) {
    // Prevent self-reference and cycles
    if (body.dependsOnId === phaseId) {
      return NextResponse.json({ error: "Una fase no puede depender de sí misma" }, { status: 400 });
    }
    if (body.dependsOnId) {
      // Walk the predecessor chain — if we reach phaseId, there's a cycle
      const visited = new Set<string>([phaseId]);
      let cur: string | null = body.dependsOnId;
      let depth = 0;
      while (cur && depth < 200) {
        if (visited.has(cur)) {
          return NextResponse.json({ error: "Esta dependencia crearía un ciclo" }, { status: 400 });
        }
        visited.add(cur);
        const next: { dependsOnId: string | null } | null = await prisma.phase.findUnique({ where: { id: cur }, select: { dependsOnId: true } });
        cur = next?.dependsOnId ?? null;
        depth++;
      }
    }
    data.dependsOnId = body.dependsOnId ?? null;
  }
  if (body.lagDays         !== undefined) data.lagDays         = Number(body.lagDays) || 0;
  if (body.name            !== undefined) data.name            = body.name;
  if (body.progressPct     !== undefined) data.progressPct     = Math.min(100, Math.max(0, Number(body.progressPct) || 0));

  // Constraint + deadline (MS-Project compat)
  const VALID_CONSTRAINTS = new Set(["ASAP", "ALAP", "MSO", "MFO", "SNET", "SNLT", "FNET", "FNLT"]);
  if (body.constraintType !== undefined) {
    if (body.constraintType === null || body.constraintType === "") {
      data.constraintType = null;
      data.constraintDate = null;
    } else if (!VALID_CONSTRAINTS.has(body.constraintType)) {
      return NextResponse.json({ error: `Invalid constraintType ${body.constraintType}` }, { status: 400 });
    } else {
      data.constraintType = body.constraintType;
    }
  }
  if (body.constraintDate !== undefined) data.constraintDate = parseDate(body.constraintDate);
  if (body.deadline       !== undefined) data.deadline       = parseDate(body.deadline);
  if (body.fixedCost      !== undefined) data.fixedCost      = Math.max(0, Number(body.fixedCost) || 0);
  if (body.fixedCostAccrual !== undefined && ["START", "END", "PRORATED"].includes(body.fixedCostAccrual)) {
    data.fixedCostAccrual = body.fixedCostAccrual;
  }

  // Stream 8 P3 — stage-gate enforcement.
  if (body.gateRequired !== undefined) data.gateRequired = !!body.gateRequired;
  if (body.gateAction === "approve" && ["ADMIN", "AREA_MANAGER"].includes(user.role)) {
    const me = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
    data.gateApprovedAt = new Date();
    data.gateApproverId = me?.id ?? null;
  }
  if (body.gateAction === "reset" && ["ADMIN", "AREA_MANAGER"].includes(user.role)) {
    data.gateApprovedAt = null;
    data.gateApproverId = null;
  }
  // If transitioning to COMPLETED, ensure gate is approved when required.
  if (data.status === "COMPLETED") {
    const cur = await prisma.phase.findUnique({ where: { id: phaseId }, select: { gateRequired: true, gateApprovedAt: true } });
    if (cur?.gateRequired && !cur.gateApprovedAt && data.gateApprovedAt === undefined) {
      return NextResponse.json({ error: "Stage-gate not approved for this phase yet" }, { status: 400 });
    }
  }

  // Cross-validate dates: fetch existing values when only one date is in the request
  const onlyStart = data.plannedStart !== undefined && data.plannedEnd === undefined;
  const onlyEnd   = data.plannedEnd   !== undefined && data.plannedStart === undefined;
  if (onlyStart || onlyEnd) {
    const existing = await prisma.phase.findUnique({ where: { id: phaseId }, select: { plannedStart: true, plannedEnd: true } });
    if (existing) {
      const effectiveStart = data.plannedStart ?? existing.plannedStart;
      const effectiveEnd   = data.plannedEnd   ?? existing.plannedEnd;
      if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) {
        return NextResponse.json({ error: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
      }
    }
  } else if (data.plannedStart && data.plannedEnd && data.plannedEnd < data.plannedStart) {
    return NextResponse.json({ error: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
  }

  if (data.actualStart && data.actualEnd && data.actualEnd < data.actualStart) {
    return NextResponse.json({ error: "Ngày thực tế kết thúc phải sau ngày thực tế bắt đầu" }, { status: 400 });
  }

  try {
    // Bulk-assign all tasks of this phase to a user (or unassign with null).
    // Phase has no assigneeId field of its own; we propagate to its tasks.
    if (body.assigneeId !== undefined) {
      const newAssigneeId: string | null =
        body.assigneeId === null || body.assigneeId === "" ? null : String(body.assigneeId);
      await prisma.task.updateMany({
        where: { phaseId },
        data:  { assigneeId: newAssigneeId },
      });
    }

    const phase = await prisma.phase.update({
      where: { id: phaseId },
      data,
      include: { tasks: true, store: { select: { id: true } } },
    });

    // Recalculate store progress if status changed
    if (body.status !== undefined) {
      const allPhases = await prisma.phase.findMany({
        where: { storeId },
        include: { tasks: { select: { status: true } } },
      });
      const totalTasks = allPhases.reduce((s, p) => s + p.tasks.length, 0);
      const doneTasks  = allPhases.reduce((s, p) => s + p.tasks.filter(t => t.status === "DONE").length, 0);
      const progress   = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      await prisma.storeProject.update({ where: { id: storeId }, data: { progress } });
    }

    let cascadedCount = 0;
    const datesChanged = data.plannedStart !== undefined || data.plannedEnd !== undefined;
    const depSchChanged = data.dependencyType !== undefined || data.lagDays !== undefined || data.dependsOnId !== undefined;

    if (depSchChanged) {
      const updated = await prisma.phase.findUnique({
        where: { id: phaseId },
        select: { dependsOnId: true, dependencyType: true, lagDays: true, plannedStart: true, plannedEnd: true },
      });
      if (updated?.dependsOnId && updated.plannedStart && updated.plannedEnd) {
        const pred = await prisma.phase.findUnique({
          where: { id: updated.dependsOnId },
          select: { plannedStart: true, plannedEnd: true },
        });
        if (pred?.plannedStart && pred?.plannedEnd) {
          const DAY_MS = 86_400_000;
          const lagMs  = (updated.lagDays ?? 0) * DAY_MS;
          const durMs  = new Date(updated.plannedEnd).getTime() - new Date(updated.plannedStart).getTime();
          const dt     = updated.dependencyType;
          let newStartMs: number;
          if      (dt === "SS") newStartMs = new Date(pred.plannedStart).getTime() + lagMs;
          else if (dt === "FF") newStartMs = new Date(pred.plannedEnd).getTime()   + lagMs - durMs;
          else if (dt === "SF") newStartMs = new Date(pred.plannedStart).getTime() + lagMs - durMs;
          else                  newStartMs = new Date(pred.plannedEnd).getTime()   + lagMs;
          await prisma.phase.update({
            where: { id: phaseId },
            data: { plannedStart: new Date(newStartMs), plannedEnd: new Date(newStartMs + durMs) },
          });
        }
      }
      cascadedCount = await cascadeDependents(phaseId, prisma as any);
    } else if (datesChanged) {
      cascadedCount = await cascadeDependents(phaseId, prisma as any);
    }

    const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
    try {
      await prisma.activity.create({
        data: {
          userId:   dbUser?.id ?? null,
          storeId,
          action:   "PHASE_UPDATED",
          entity:   "Phase",
          entityId: phaseId,
          details:  cascadedCount > 0
            ? `Cập nhật GĐ ${phase.order} - ${phase.name} (cascade ${cascadedCount} GĐ)`
            : `Cập nhật giai đoạn ${phase.order} - ${phase.name}`,
        },
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ ...phase, cascadedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi cập nhật" }, { status: 500 });
  }
}

// Delete a single phase — re-links dependents to predecessor, atomic transaction
export async function DELETE(_req: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { phaseId } = await params;

  // Ownership check (ADMIN, AREA_MANAGER, PM-of-store only)
  const ownership = await checkPhaseOwnership(phaseId, user);
  if (!ownership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { id: true, storeId: true, order: true, dependsOnId: true, name: true },
  });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  try {
    // Atomic: re-link → delete → re-sequence → sync targetOpenDate
    await prisma.$transaction(async (tx) => {
      // Re-link dependents to this phase's predecessor
      await tx.phase.updateMany({
        where: { storeId: phase.storeId, dependsOnId: phaseId },
        data: { dependsOnId: phase.dependsOnId ?? null },
      });

      // Delete phase (cascade: tasks, notes)
      await tx.phase.delete({ where: { id: phaseId } });

      // Re-sequence remaining phases (close the gap)
      const remaining = await tx.phase.findMany({
        where: { storeId: phase.storeId, order: { gt: phase.order } },
        orderBy: { order: "asc" },
      });
      for (const p of remaining) {
        await tx.phase.update({
          where: { id: p.id },
          data: { order: p.order - 1, phaseNumber: p.phaseNumber - 1 },
        });
      }

      // Sync store targetOpenDate
      const lastPhase = await tx.phase.findFirst({
        where: { storeId: phase.storeId },
        orderBy: { order: "desc" },
        select: { plannedEnd: true },
      });
      if (lastPhase?.plannedEnd) {
        await tx.storeProject.update({
          where: { id: phase.storeId },
          data: { targetOpenDate: lastPhase.plannedEnd },
        });
      }
    });

    const dbUser = await prisma.user.findFirst({ where: { OR: [{ email: user.email }, { id: user.id }] }, select: { id: true } });
    try {
      await prisma.activity.create({
        data: { userId: dbUser?.id ?? null, storeId: phase.storeId, action: "PHASE_DELETED", entity: "Phase", entityId: phaseId, details: `Xóa giai đoạn "${phase.name}"` },
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi xóa phase" }, { status: 500 });
  }
}
