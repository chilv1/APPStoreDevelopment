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
      bc: { include: { branch: { select: { id: true, name: true, code: true } } } },
      phases: {
        orderBy: { phaseNumber: "asc" },
        include: {
          tasks: {
            include: {
              assignee: { select: { id: true, name: true, email: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          notes: {
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const store = await prisma.storeProject.update({
    where: { id },
    data: {
      ...(body.name          && { name: body.name }),
      ...(body.address          && { address: body.address }),
      ...(body.region           !== undefined && { region: body.region }),
      ...(body.businessCenterId !== undefined && { businessCenterId: body.businessCenterId || null }),
      ...(body.status        && { status: body.status }),
      ...(body.progress      !== undefined && { progress: body.progress }),
      ...(body.budget        !== undefined && { budget: body.budget !== null ? Number(body.budget) : null }),
      ...(body.targetOpenDate !== undefined && { targetOpenDate: body.targetOpenDate ? new Date(body.targetOpenDate) : null }),
      ...(body.actualOpenDate !== undefined && { actualOpenDate: body.actualOpenDate ? new Date(body.actualOpenDate) : null }),
      ...(body.pmId          !== undefined && { pmId: body.pmId || null }),
      ...(body.notes         !== undefined && { notes: body.notes }),
      ...(body.latitude      !== undefined && { latitude: body.latitude !== null && body.latitude !== "" ? Number(body.latitude) : null }),
      ...(body.longitude     !== undefined && { longitude: body.longitude !== null && body.longitude !== "" ? Number(body.longitude) : null }),
    },
    include: {
      pm: { select: { id: true, name: true, email: true, role: true } },
      bc: { include: { branch: { select: { id: true, name: true, code: true } } } },
      phases: true,
    },
  });

  return NextResponse.json(store);
}
