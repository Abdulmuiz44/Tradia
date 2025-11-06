// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";

type ForgotRequestBody = { email?: unknown };

function asString(v: unknown): string {
  return typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ForgotRequestBody;
    const rawEmail = asString(body?.email).trim().toLowerCase();

    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // find user by email
    const userRes = await pool.query<{ id: string; email_verified?: string | null }>(
      `SELECT id, email_verified FROM users WHERE email=$1 LIMIT 1`,
      [rawEmail]
    );
    const user = userRes.rows[0];

    // Always respond with the same generic message (prevent enumeration).
    const genericResponse = {
      message: "If an account with that email exists, a password reset link has been sent.",
    };

    if (!user) {
      return NextResponse.json(genericResponse);
    }

    // create token and expiry (1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // store token
    await pool.query(
      `INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [token, user.id, expiresAt]
    );

    // try sending email, but don't leak errors to client
    try {
      await sendPasswordResetEmail(rawEmail, token);
    } catch (mailErr: unknown) {
      // log but still return generic response
      console.error("Password reset email failed:", mailErr);
    }

    return NextResponse.json(genericResponse);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Forgot password error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
