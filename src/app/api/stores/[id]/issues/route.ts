import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const user = session.user as any;

  const issue = await prisma.issue.create({
    data: {
      storeId: id,
      title: body.title,
      description: body.description,
      type: body.type || "ISSUE",
      severity: body.severity || "MEDIUM",
      status: "OPEN",
      reporterId: user.id,
    },
    include: { reporter: { select: { name: true } } },
  });

  return NextResponse.json(issue, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  const issue = await prisma.issue.update({
    where: { id },
    data: {
      status: body.status,
      resolution: body.resolution,
    },
  });

  return NextResponse.json(issue);
}
