import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { email },
      data: { verificationToken: token },
    });

    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;

    // Send email via Gmail
    await sendEmail(
      email,
      "Verify Your Tradia Account",
      `<p>Hi ${user.name || "Trader"},</p>
       <p>Please click the link below to verify your email:</p>
       <a href="${verificationLink}">${verificationLink}</a>`
    );

    return NextResponse.json({ ok: true, message: "Verification email sent" });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
