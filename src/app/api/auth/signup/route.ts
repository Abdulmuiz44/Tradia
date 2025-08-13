// app/api/auth/signup/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer"; // keep your mailer helper here

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const rawEmail = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    // basic validation
    if (!name || !rawEmail || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    // normalize email to avoid duplicates due to case
    const email = rawEmail.toLowerCase();

    // Look up existing user
    const existing = await prisma.user.findUnique({ where: { email } });

    // If already verified, block signup
    if (existing && existing.emailVerified) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    // generate token + hash password
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(password, 12);

    if (existing && !existing.emailVerified) {
      // Update the existing unverified user with fresh details + token
      await prisma.user.update({
        where: { email },
        data: {
          name,
          password: hashedPassword,
          verificationToken,
        },
      });
    } else {
      // Create a new user record (emailVerified stays null)
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          verificationToken,
        },
      });
    }

    // Send verification email (if this fails, client can retry via resend route)
    try {
      // sendVerificationEmail signature in your project may differ:
      // - if you implemented sendVerificationEmail(to, token) use that
      // - if you used sendVerificationEmail({ to, token }) adapt accordingly
      await sendVerificationEmail(email, verificationToken);
    } catch (sendErr) {
      console.error("Failed to send verification email:", sendErr);
      // Keep the created/updated user record so the user can request a resend.
      return NextResponse.json(
        { error: "Account created but failed to send verification email. Please request a resend." },
        { status: 500 }
      );
    }

    // success — do NOT auto-login. Frontend should redirect to check-email page.
    return NextResponse.json({ message: "Account created. Please check your email to verify." });
  } catch (err: any) {
    console.error("signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
