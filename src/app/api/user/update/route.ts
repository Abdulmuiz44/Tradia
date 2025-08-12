// app/api/user/update/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // ensure you export authOptions from your NextAuth file

const prisma = new PrismaClient();
export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { name, image } = body as { name?: string; image?: string };

    if (!name && !image) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const email = session.user.email;

    const updated = await prisma.user.update({
      where: { email },
      data: {
        name: name ?? undefined,
        image: image ?? undefined,
      },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    console.error("user update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
