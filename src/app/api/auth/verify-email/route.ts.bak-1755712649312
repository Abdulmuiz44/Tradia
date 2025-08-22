// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email/failed`
      );
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE verification_token = $1`,
      [token]
    );
    const user = result.rows[0];

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email/failed`
      );
    }

    // Update user: set email_verified and remove token
    await pool.query(
      `UPDATE users
       SET email_verified = NOW(),
           verification_token = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // ✅ Redirect instead of JSON
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email/success`
    );
  } catch (err) {
    console.error("Email verification error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email/failed`
    );
  }
}
