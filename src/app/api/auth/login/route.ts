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
 *
 * NOTE: sessions table schema expected:
 * create table sessions (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references users(id) on delete cascade,
 *   session_token text not null unique,
 *   refresh_token text unique,
 *   expires_at timestamptz not null,
 *   created_at timestamptz default now()
 * );
 */
export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // --- Fetch user record (id, password hash, email_verified, name) ---
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, password, email_verified, name")
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

    // Create access JWT (12h)
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: normalizedEmail,
        name: user.name,
        email_verified: true,
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Create refresh token raw + hashed + id + expiry
    const refreshTokenRaw = crypto.randomBytes(48).toString("hex");
    const refreshId = uuidv4();
    const hashedRefresh = bcrypt.hashSync(refreshTokenRaw, 10);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); // 30 days

    // Create session_token (non-null). Use crypto and fallback to uuid.
    let sessionTokenRaw: string;
    try {
      sessionTokenRaw = crypto.randomBytes(32).toString("hex");
      if (!sessionTokenRaw || sessionTokenRaw.length === 0) throw new Error("empty session token");
    } catch (err) {
      // fallback
      sessionTokenRaw = uuidv4();
    }

    // Defensive check: ensure none are empty
    if (!refreshId || !hashedRefresh || !sessionTokenRaw || !refreshExpiresAt) {
      console.error("Login: invalid session values", {
        refreshId,
        hashedRefreshPresent: Boolean(hashedRefresh),
        sessionTokenRawPresent: Boolean(sessionTokenRaw),
        refreshExpiresAt,
      });
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    // Attempt insert into sessions table
    const rowToInsert = {
      id: refreshId,
      user_id: user.id,
      session_token: sessionTokenRaw,
      refresh_token: hashedRefresh,
      expires_at: refreshExpiresAt,
    };

    const { error: sessionErr } = await supabase.from("sessions").insert([rowToInsert]);

    if (sessionErr) {
      // Log the exact attempted row and DB error for debugging
      console.error("Failed to create refresh session:", sessionErr);
      console.error("Attempted session row:", JSON.stringify(rowToInsert));

      // If inserted row failed due to missing column defaults or constraints, surface clear message
      // Do NOT return DB internals to client; return generic message
      return NextResponse.json({ error: "Failed to create refresh session." }, { status: 500 });
    }

    // Successful insertion — set cookies and return success
    const res = NextResponse.json({ message: "Login successful." });

    // httpOnly server session token (primary server session)
    res.cookies.set("session", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h
    });

    // app_token for client-side checks (not httpOnly) — convenience only
    res.cookies.set("app_token", accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    // refresh token (raw) stored in httpOnly cookie (server will compare with hashed DB value when refreshing)
    res.cookies.set("refresh_token", refreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // refresh id cookie to locate the DB row
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
