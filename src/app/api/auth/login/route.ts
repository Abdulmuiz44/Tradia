// app/api/auth/login/route.ts
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
    const normalized = String(email).trim().toLowerCase();

    if (!normalized || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // fetch user
    const { data: user, error } = await supabase
      .from("users")
      .select("id, password, email_verified, name")
      .eq("email", normalized)
      .maybeSingle();

    if (error) {
      console.error("Login select error:", error);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // require email_verified
    if (!user.email_verified) {
      return NextResponse.json({ error: "Email not verified. Please check your email." }, { status: 403 });
    }

    // password check
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // create access JWT (include email_verified claim)
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: normalized,
        name: user.name,
        email_verified: Boolean(user.email_verified),
      },
      JWT_SECRET,
      { expiresIn: "12h" } // short-lived access JWT
    );

    // create refresh token + session id and store only hashed refresh token in DB
    const refreshTokenRaw = crypto.randomBytes(48).toString("hex");
    const refreshId = uuidv4();
    const hashedRefresh = bcrypt.hashSync(refreshTokenRaw, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); // 30 days

    const { error: insertErr } = await supabase.from("sessions").insert([
      {
        id: refreshId,
        user_id: user.id,
        refresh_token: hashedRefresh,
        expires_at: expiresAt,
      },
    ]);

    if (insertErr) {
      console.error("Failed to create session row:", insertErr);
      // don't fail login — but surface a server warning
    }

    // set cookies (httpOnly)
    const res = NextResponse.json({ message: "Login successful." });

    // access cookie — short lived
    res.cookies.set("session", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    // refresh token (raw) + refresh_id for lookup
    res.cookies.set("refresh_token", refreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
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
