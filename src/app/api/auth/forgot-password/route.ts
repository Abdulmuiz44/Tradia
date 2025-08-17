// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawEmail = String(body?.email ?? "").trim().toLowerCase();

    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // find user by email
    const userRes = await pool.query(`SELECT id, email_verified FROM users WHERE email=$1 LIMIT 1`, [rawEmail]);
    const user = userRes.rows[0];

    // Always respond with success message (prevent enumeration).
    const genericResponse = {
      message: "If an account with that email exists, a password reset link has been sent.",
    };

    if (!user) {
      // just return generic success—not revealing whether account exists
      return NextResponse.json(genericResponse);
    }

    // If user exists, create token and expiry (1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Upsert into password_reset_tokens table (token as primary key)
    // If you prefer multiple tokens per user, don't delete old tokens here.
    await pool.query(
      `INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [token, user.id, expiresAt]
    );

    // send email (don't leak errors to client)
    try {
      await sendPasswordResetEmail(rawEmail, token);
    } catch (mailErr) {
      console.error("Password reset email failed:", mailErr);
      // Still return generic success so UX is consistent; client can request resend later.
    }

    return NextResponse.json(genericResponse);
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
