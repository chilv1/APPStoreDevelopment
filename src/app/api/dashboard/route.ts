import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const storeWhere = user.role === "PM"
    ? { pm: { email: user.email } }
    : user.role === "AREA_MANAGER"
    ? { region: user.region }
    : {};

  const [stores, totalStores] = await Promise.all([
    prisma.storeProject.findMany({
      where: storeWhere,
      include: {
        phases: { include: { tasks: true } },
        _count: { select: { issues: true } },
      },
    }),
    prisma.storeProject.count({ where: storeWhere }),
  ]);

  const statusCounts = stores.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const regionProgress = stores.reduce((acc, s) => {
    if (!acc[s.region]) acc[s.region] = { total: 0, progress: 0 };
    acc[s.region].total += 1;
    acc[s.region].progress += s.progress;
    return acc;
  }, {} as Record<string, { total: number; progress: number }>);

  const overdueStores = stores.filter(
    (s) => s.targetOpenDate && new Date(s.targetOpenDate) < new Date() && s.status !== "COMPLETED"
  );

  const allTasks = stores.flatMap((s) => s.phases.flatMap((p) => p.tasks));
  const overdueTasks = allTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE"
  );

  const activities = await prisma.activity.findMany({
    include: {
      user: { select: { name: true, role: true } },
      store: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return NextResponse.json({
    totalStores,
    statusCounts,
    regionProgress,
    overdueStores: overdueStores.length,
    overdueTasks: overdueTasks.length,
    avgProgress: stores.length > 0
      ? Math.round(stores.reduce((s, p) => s + p.progress, 0) / stores.length)
      : 0,
    recentActivities: activities,
    stores: stores.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      region: s.region,
      status: s.status,
      progress: s.progress,
      targetOpenDate: s.targetOpenDate,
      issueCount: s._count.issues,
    })),
  });
}
