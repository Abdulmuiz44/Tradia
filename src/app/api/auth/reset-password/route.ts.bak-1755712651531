// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";

type ResetRequestBody = { token?: unknown; password?: unknown };

function asString(v: unknown): string {
  return typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResetRequestBody;
    const token = asString(body?.token).trim();
    const password = asString(body?.password);

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    // lookup token
    const res = await pool.query<{ token: string; user_id: string; expires_at: Date | string }>(
      `SELECT token, user_id, expires_at FROM password_reset_tokens WHERE token=$1 LIMIT 1`,
      [token]
    );
    const row = res.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    const expiresAt = new Date(row.expires_at);
    if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      // cleanup expired token
      await pool.query(`DELETE FROM password_reset_tokens WHERE token=$1`, [token]);
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    // hash and update password
    const hashed = await bcrypt.hash(password, 12);
    await pool.query(`UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2`, [hashed, row.user_id]);

    // delete token
    await pool.query(`DELETE FROM password_reset_tokens WHERE token=$1`, [token]);

    return NextResponse.json({ message: "Password reset successful. You may now sign in." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Reset password error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
