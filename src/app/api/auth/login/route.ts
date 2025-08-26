import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { createAdminSupabase } from "@/utils/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) console.warn("JWT_SECRET not set");

/**
 * POST /api/auth/login
 * - Authenticates user (email+password)
 * - Requires user.email_verified === true
 * - Issues access JWT and a refresh session row in `sessions`
 */
export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // --- Fetch user record ---
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, password, email_verified, name, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userErr) {
      console.error("Login select error:", userErr);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // Ensure email verified
    if (!user.email_verified) {
      return NextResponse.json({ error: "Email not verified. Please check your email." }, { status: 403 });
    }

    // Create access JWT (12h) - align with refresh route
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        email_verified: Boolean(user.email_verified),
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Create refresh token raw + hashed + id + expiry
    const refreshTokenRaw = crypto.randomBytes(48).toString("hex");
    const refreshId = uuidv4();
    const hashedRefresh = bcrypt.hashSync(refreshTokenRaw, 10);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); // 30 days

    // Create session_token for tracking/debugging
    const sessionTokenRaw = crypto.randomBytes(32).toString("hex") || uuidv4();

    // Insert session row
    const { error: sessionErr } = await supabase.from("sessions").insert([
      {
        id: refreshId,
        user_id: user.id,
        session_token: sessionTokenRaw,
        refresh_token: hashedRefresh,
        expires_at: refreshExpiresAt,
      },
    ]);

    if (sessionErr) {
      console.error("Failed to create refresh session:", sessionErr);
      return NextResponse.json({ error: "Failed to create refresh session." }, { status: 500 });
    }

    // Successful insertion — set cookies
    const res = NextResponse.json({ message: "Login successful." });

    res.cookies.set("session", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h
    });

    res.cookies.set("app_token", accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    res.cookies.set("refresh_token", refreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    res.cookies.set("refresh_id", refreshId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
