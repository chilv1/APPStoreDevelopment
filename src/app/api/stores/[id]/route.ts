import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const store = await prisma.storeProject.findUnique({
    where: { id },
    include: {
      pm: { select: { id: true, name: true, email: true, role: true, region: true } },
      phases: {
        orderBy: { phaseNumber: "asc" },
        include: {
          tasks: {
            include: {
              assignee: { select: { id: true, name: true, email: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      issues: {
        include: {
          reporter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(store);
}

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await _.json();

  const store = await prisma.storeProject.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.status && { status: body.status }),
      ...(body.progress !== undefined && { progress: body.progress }),
      ...(body.targetOpenDate && { targetOpenDate: new Date(body.targetOpenDate) }),
      ...(body.pmId !== undefined && { pmId: body.pmId }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: { pm: true, phases: true },
  });

  return NextResponse.json(store);
}
