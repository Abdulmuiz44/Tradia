import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { createAdminSupabase } from "@/utils/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) console.warn("JWT_SECRET not set");

export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // --- Fetch latest user info including email_verified ---
    const { data: user, error } = await supabase
      .from("users")
      .select("id, password, email_verified, name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("Login select error:", error);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // Check password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // Ensure email is verified
    if (!user.email_verified) {
      return NextResponse.json({ error: "Email not verified. Please check your email." }, { status: 403 });
    }

    // --- Create short-lived access JWT ---
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: normalizedEmail,
        name: user.name,
        email_verified: true, // always true here because we checked above
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    // --- Create refresh token (client will get raw, DB stores a hashed copy) ---
    const refreshTokenRaw = crypto.randomBytes(48).toString("hex");
    const refreshId = uuidv4();
    const hashedRefresh = bcrypt.hashSync(refreshTokenRaw, 10);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); // 30 days

    // --- Create a session_token (DB expects non-null) ---
    // This is a server-side token for identifying the session row (not the same as the refresh_token).
    const sessionTokenRaw = crypto.randomBytes(32).toString("hex");

    // Insert session row — include session_token to satisfy NOT NULL constraint
    const { error: sessionErr } = await supabase.from("sessions").insert([
      {
        id: refreshId,
        user_id: user.id,
        session_token: sessionTokenRaw, // <-- required non-null column
        refresh_token: hashedRefresh,
        expires_at: refreshExpiresAt,
      },
    ]);

    if (sessionErr) {
      console.error("Failed to create refresh session:", sessionErr);
      // surface the failure to the client so it's actionable
      return NextResponse.json({ error: "Failed to create refresh session." }, { status: 500 });
    }

    // --- Set cookies ---
    const res = NextResponse.json({ message: "Login successful." });

    // httpOnly server-side session token (used by server)
    res.cookies.set("session", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h
    });

    // client-readable mirror token (convenience for client-side checks like email_verified)
    res.cookies.set("app_token", accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h
    });

    // store raw refresh token in a secure httpOnly cookie (server will verify against hashed DB value)
    res.cookies.set("refresh_token", refreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30d
    });

    // store refresh id so server can locate the DB row
    res.cookies.set("refresh_id", refreshId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Optionally (not httpOnly) expose the session_token to client if you need it — usually unnecessary.
    // res.cookies.set("session_token", sessionTokenRaw, { httpOnly: false, maxAge: 60 * 60 * 24 * 30 });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
