import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  if (body.code && body.code.length !== 3) return NextResponse.json({ error: "Mã chi nhánh phải đúng 3 ký tự" }, { status: 400 });

  const branch = await prisma.branch.update({
    where: { id },
    data: {
      ...(body.name        && { name: body.name }),
      ...(body.code        && { code: body.code.toUpperCase() }),
      ...(body.description !== undefined && { description: body.description }),
    },
    include: { businessCenters: { include: { _count: { select: { stores: true } } } }, _count: { select: { users: true } } },
  });

  return NextResponse.json(branch);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const count = await prisma.businessCenter.count({ where: { branchId: id } });
  if (count > 0) return NextResponse.json({ error: "Không thể xoá chi nhánh còn Business Center" }, { status: 400 });

  await prisma.branch.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
