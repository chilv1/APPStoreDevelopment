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

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.role !== undefined) data.role = body.role;
  if (body.branchId !== undefined) data.branchId = body.branchId || null;
  if (body.password) {
    const bcrypt = await import("bcryptjs");
    data.password = await bcrypt.hash(body.password, 10);
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true, region: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    const isDuplicate = e?.code === "P2002";
    return NextResponse.json(
      { error: isDuplicate ? `Email "${body.email}" đã tồn tại` : (e?.message || "Lỗi cập nhật") },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === user.id) return NextResponse.json({ error: "Không thể xóa tài khoản đang đăng nhập" }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
