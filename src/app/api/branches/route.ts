import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branches = await prisma.branch.findMany({
    include: {
      businessCenters: {
        include: { _count: { select: { stores: true } } },
        orderBy: { code: "asc" },
      },
      _count: { select: { users: true } },
    },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(branches);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (!body.name || !body.code) return NextResponse.json({ error: "name và code là bắt buộc" }, { status: 400 });
  if (body.code.length !== 3) return NextResponse.json({ error: "Mã chi nhánh phải đúng 3 ký tự" }, { status: 400 });

  const branch = await prisma.branch.create({
    data: {
      name:        body.name,
      code:        body.code.toUpperCase(),
      description: body.description || null,
    },
    include: { businessCenters: true, _count: { select: { users: true } } },
  });

  return NextResponse.json(branch, { status: 201 });
}
