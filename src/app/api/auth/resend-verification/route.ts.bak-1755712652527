// app/api/auth/resend-verification/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db"; // our Postgres pool
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Find user
    const { rows } = await pool.query(
      "SELECT id, email, email_verified FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    const user = rows[0];
    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email" },
        { status: 404 }
      );
    }

    if (user.email_verified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString("hex");

    // Save new token in DB
    await pool.query(
      "UPDATE users SET verification_token = $1 WHERE id = $2",
      [newToken, user.id]
    );

    // Resend email
    await sendVerificationEmail(email, newToken);

    return NextResponse.json({ message: "Verification email resent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
