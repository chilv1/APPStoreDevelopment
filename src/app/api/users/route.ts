import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const where = user.role === "PM"
    ? { email: user.email }
    : user.role === "SURVEY_STAFF"
    ? { email: user.email }
    : {};

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, region: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bcrypt = await import("bcryptjs");
  const body = await request.json();
  const hashed = await bcrypt.hash(body.password || "123456", 10);

  const newUser = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashed,
      role: body.role || "SURVEY_STAFF",
      region: body.region,
    },
    select: { id: true, name: true, email: true, role: true, region: true },
  });

  return NextResponse.json(newUser, { status: 201 });
}
