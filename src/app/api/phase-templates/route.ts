import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrInitPhaseTemplates } from "@/lib/phase-templates";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await getOrInitPhaseTemplates();
  // Decode taskTitles from JSON string to array for client convenience
  return NextResponse.json(templates.map(t => ({
    ...t,
    taskTitles: (() => { try { return JSON.parse(t.taskTitles); } catch { return []; } })(),
  })));
}

// Bulk update — receives array of { phaseNumber, name, description, durationDays, taskTitles }
export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden — chỉ Admin được sửa" }, { status: 403 });

  const body = await request.json();
  if (!Array.isArray(body)) return NextResponse.json({ error: "Body must be an array" }, { status: 400 });

  try {
    await prisma.$transaction(
      body.map((t: any) => prisma.phaseTemplate.update({
        where: { phaseNumber: t.phaseNumber },
        data: {
          name: t.name,
          description: t.description ?? null,
          durationDays: Math.max(1, Math.round(Number(t.durationDays) || 1)),
          taskTitles: JSON.stringify(Array.isArray(t.taskTitles) ? t.taskTitles : []),
        },
      }))
    );
    return NextResponse.json({ ok: true, updated: body.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi cập nhật" }, { status: 500 });
  }
}
