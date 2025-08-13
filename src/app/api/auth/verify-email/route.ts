import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/verify-email/failure`);
  }

  const user = await prisma.user.findFirst({ where: { verificationToken: token } });

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/verify-email/failure`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
    },
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/verify-email/success`);
}
