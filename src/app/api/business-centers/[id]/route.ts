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
  if (body.code && body.code.length !== 7) return NextResponse.json({ error: "Mã BC phải đúng 7 ký tự" }, { status: 400 });

  const bc = await prisma.businessCenter.update({
    where: { id },
    data: {
      ...(body.name        && { name: body.name }),
      ...(body.code        && { code: body.code.toUpperCase() }),
      ...(body.branchId    && { branchId: body.branchId }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.address     !== undefined && { address: body.address }),
    },
    include: { branch: { select: { id: true, name: true, code: true } }, _count: { select: { stores: true } } },
  });

  return NextResponse.json(bc);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const count = await prisma.storeProject.count({ where: { businessCenterId: id } });
  if (count > 0) return NextResponse.json({ error: "Không thể xoá BC còn cửa hàng" }, { status: 400 });

  await prisma.businessCenter.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
