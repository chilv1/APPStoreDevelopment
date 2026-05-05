import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getOrInitPhaseTemplates,
  addTemplateToAllStores,
  applyNameChangeToAllStores,
  applyDepConfigToAllStores,
} from "@/lib/phase-templates";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await getOrInitPhaseTemplates();
  const data = templates.map((t: any) => ({
    ...t,
    defaultPredOrder: t.defaultPredOrder ?? null,
    defaultLagDays:   t.defaultLagDays ?? 0,
    taskTitles: (() => { try { return JSON.parse(t.taskTitles); } catch { return []; } })(),
  }));

  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}

// Bulk save — array of { id, order, name, description, durationDays, taskTitles, defaultDepType }
// Applies name/description/depType changes to ALL existing stores.
// Duration changes only update the template (don't retroactively change store schedules).
export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (!Array.isArray(body)) return NextResponse.json({ error: "Body must be array" }, { status: 400 });

  try {
    for (const t of body) {
      if (!t.id) continue;

      const current = await prisma.phaseTemplate.findUnique({ where: { id: t.id } }) as any;
      if (!current) continue;

      const nameChanged = t.name !== current.name || (t.description ?? null) !== current.description;
      const newPredOrder: number | null = t.defaultPredOrder ?? null;
      const newLagDays   = Math.max(0, Number(t.defaultLagDays) || 0);
      const depConfigChanged =
            t.defaultDepType   !== current.defaultDepType
         || newPredOrder       !== (current.defaultPredOrder ?? null)
         || newLagDays          !== (current.defaultLagDays ?? 0);

      await prisma.phaseTemplate.update({
        where: { id: t.id },
        data: {
          name: t.name,
          description: t.description ?? null,
          durationDays: Math.max(1, Math.round(Number(t.durationDays) || 1)),
          taskTitles: JSON.stringify(Array.isArray(t.taskTitles) ? t.taskTitles : []),
          defaultDepType: t.defaultDepType ?? "FS",
          defaultPredOrder: newPredOrder,
          defaultLagDays:   newLagDays,
          order: t.order,
        } as any,
      });

      // Propagate name/desc changes to all stores
      if (nameChanged) {
        await applyNameChangeToAllStores(current.order, t.name, t.description ?? null);
      }

      // Propagate dep config (type + pred + lag) to all stores
      if (depConfigChanged) {
        await applyDepConfigToAllStores(current.order, t.defaultDepType ?? "FS", newPredOrder, newLagDays);
      }
    }

    return NextResponse.json({ ok: true, updated: body.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi cập nhật" }, { status: 500 });
  }
}

// Add new phase template — propagates to ALL existing stores
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, description, durationDays, taskTitles, defaultDepType, defaultPredOrder, defaultLagDays, insertAfterOrder } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Tên phase là bắt buộc" }, { status: 400 });

  // Determine new order position
  const maxTemplate = await prisma.phaseTemplate.findFirst({ orderBy: { order: "desc" } });
  const newOrder =
    typeof insertAfterOrder === "number"
      ? insertAfterOrder + 1
      : (maxTemplate?.order ?? 0) + 1;

  // Shift existing templates at order >= newOrder
  const toShift = await prisma.phaseTemplate.findMany({
    where: { order: { gte: newOrder } },
    orderBy: { order: "desc" },
  });
  for (const tpl of toShift) {
    await prisma.phaseTemplate.update({
      where: { id: tpl.id },
      data: { order: tpl.order + 1 },
    });
  }

  const titles: string[] = Array.isArray(taskTitles) ? taskTitles.filter(Boolean) : [];
  const depType  = defaultDepType ?? "FS";
  const predOrd: number | null = defaultPredOrder ?? null;
  const lagDays  = Math.max(0, Number(defaultLagDays) || 0);

  const newTemplate = await prisma.phaseTemplate.create({
    data: {
      order: newOrder,
      name: name.trim(),
      description: description ?? null,
      durationDays: Math.max(1, Math.round(Number(durationDays) || 7)),
      taskTitles: JSON.stringify(titles),
      defaultDepType: depType,
      defaultPredOrder: predOrd,
      defaultLagDays:   lagDays,
    } as any,
  });

  // Propagate to all stores
  const storesAffected = await addTemplateToAllStores(
    newOrder,
    newTemplate.id,
    newTemplate.name,
    newTemplate.description,
    newTemplate.durationDays,
    titles,
    depType,
    predOrd,
    lagDays,
  );

  return NextResponse.json({ ok: true, template: newTemplate, storesAffected }, { status: 201 });
}
