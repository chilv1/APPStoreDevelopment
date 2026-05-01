import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { issueId } = await params;
  const body = await request.json();

  const data: any = {};
  if (body.status     !== undefined) data.status     = body.status;
  if (body.resolution !== undefined) data.resolution = body.resolution;
  if (body.title      !== undefined) data.title      = body.title;
  if (body.description!== undefined) data.description= body.description;
  if (body.type       !== undefined) data.type       = body.type;
  if (body.severity   !== undefined) data.severity   = body.severity;

  try {
    const issue = await prisma.issue.update({
      where: { id: issueId },
      data,
      include: { reporter: { select: { name: true } } },
    });
    return NextResponse.json(issue);
  } catch {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { issueId } = await params;
  try {
    await prisma.issue.delete({ where: { id: issueId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }
}
