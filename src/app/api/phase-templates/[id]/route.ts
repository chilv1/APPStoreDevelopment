import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeTemplateFromAllStores } from "@/lib/phase-templates";

// GET: count impact before delete (used by confirm dialog)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.phaseTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Count affected phases and tasks across all stores
  const phases = await prisma.phase.findMany({
    where: { order: template.order },
    include: { _count: { select: { tasks: true } } },
  });
  const storeCount = phases.length;
  const taskCount = phases.reduce((s, p) => s + p._count.tasks, 0);

  return NextResponse.json({
    template,
    impact: { storeCount, phaseCount: storeCount, taskCount },
  });
}

// DELETE: remove template + propagate deletion to all stores
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const template = await prisma.phaseTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Must keep at least 1 template
  const totalTemplates = await prisma.phaseTemplate.count();
  if (totalTemplates <= 1) {
    return NextResponse.json({ error: "Phải giữ ít nhất 1 giai đoạn" }, { status: 400 });
  }

  // Remove from all stores first (cascade tasks/notes)
  const { storesAffected, phasesDeleted } = await removeTemplateFromAllStores(template.order);

  // Shift later templates down
  await prisma.$transaction(async (tx) => {
    const later = await tx.phaseTemplate.findMany({
      where: { order: { gt: template.order } },
      orderBy: { order: "asc" },
    });
    for (const tpl of later) {
      await tx.phaseTemplate.update({
        where: { id: tpl.id },
        data: { order: tpl.order - 1 },
      });
    }
    await tx.phaseTemplate.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true, storesAffected, phasesDeleted });
}

// PATCH: update a single field (inline edit)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const template = await prisma.phaseTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.phaseTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.durationDays !== undefined && {
        durationDays: Math.max(1, Math.round(Number(body.durationDays) || 1)),
      }),
      ...(body.taskTitles !== undefined && {
        taskTitles: JSON.stringify(Array.isArray(body.taskTitles) ? body.taskTitles : []),
      }),
      ...(body.defaultDepType !== undefined && { defaultDepType: body.defaultDepType }),
    },
  });

  return NextResponse.json(updated);
}
