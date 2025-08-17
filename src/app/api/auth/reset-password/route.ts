// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    // find token record
    const res = await pool.query(
      `SELECT token, user_id, expires_at FROM password_reset_tokens WHERE token=$1 LIMIT 1`,
      [token]
    );
    const row = res.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    // check expiry
    const expiresAt = row.expires_at;
    if (!expiresAt || new Date(expiresAt) < new Date()) {
      // cleanup expired token
      await pool.query(`DELETE FROM password_reset_tokens WHERE token=$1`, [token]);
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    // update user password
    const hashed = await bcrypt.hash(password, 12);
    await pool.query(`UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2`, [hashed, row.user_id]);

    // delete token so it can't be reused
    await pool.query(`DELETE FROM password_reset_tokens WHERE token=$1`, [token]);

    return NextResponse.json({ message: "Password reset successful. You may now sign in." });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
