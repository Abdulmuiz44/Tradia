// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields required." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Check if pool is working
    if (!pool) {
      return NextResponse.json(
        { error: "Database connection not initialized." },
        { status: 500 }
      );
    }

    const existingRes = await pool.query(
      `SELECT * FROM users WHERE email=$1`,
      [email]
    );
    const existing = existingRes.rows[0];

    if (existing && existing.email_verified) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 409 }
      );
    }

    if (existing && !existing.email_verified) {
      await pool.query(
        `UPDATE users
         SET name=$1, password=$2, verification_token=$3, updated_at=NOW()
         WHERE email=$4`,
        [name, hashedPassword, verificationToken, email]
      );
    } else {
      await pool.query(
        `INSERT INTO users (name, email, password, verification_token, created_at, updated_at)
         VALUES ($1,$2,$3,$4,NOW(),NOW())`,
        [name, email, hashedPassword, verificationToken]
      );
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (err) {
      console.error("Failed to send verification email:", err);
      return NextResponse.json(
        {
          error: "Account created but failed to send verification email. Please request a resend."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Account created. Please check your email to verify." }
    );

  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
