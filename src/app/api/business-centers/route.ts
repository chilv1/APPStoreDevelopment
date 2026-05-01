import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bcs = await prisma.businessCenter.findMany({
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { stores: true } },
    },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(bcs);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (!body.name || !body.code || !body.branchId) return NextResponse.json({ error: "name, code và branchId là bắt buộc" }, { status: 400 });
  if (body.code.length !== 7) return NextResponse.json({ error: "Mã BC phải đúng 7 ký tự" }, { status: 400 });

  const bc = await prisma.businessCenter.create({
    data: {
      name:        body.name,
      code:        body.code.toUpperCase(),
      branchId:    body.branchId,
      description: body.description || null,
      address:     body.address || null,
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { stores: true } },
    },
  });

  return NextResponse.json(bc, { status: 201 });
}
