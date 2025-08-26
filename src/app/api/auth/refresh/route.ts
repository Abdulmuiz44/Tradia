import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { createAdminSupabase } from "@/utils/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) console.warn("JWT_SECRET not set");

export async function POST() {
  try {
    const cookieStore = cookies();
    const refreshRaw = cookieStore.get("refresh_token")?.value;
    const refreshId = cookieStore.get("refresh_id")?.value;

    if (!refreshRaw || !refreshId) {
      return NextResponse.json({ error: "Missing refresh credentials" }, { status: 401 });
    }

    const supabase = createAdminSupabase();

    // fetch session by id
    const { data: sessionRow, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, user_id, refresh_token, expires_at")
      .eq("id", refreshId)
      .maybeSingle();

    if (sessionErr || !sessionRow) {
      console.error("Refresh: session lookup failed", sessionErr);
      return NextResponse.json({ error: "Invalid refresh" }, { status: 401 });
    }

    // expiry check
    const now = new Date();
    if (sessionRow.expires_at && new Date(sessionRow.expires_at) < now) {
      return NextResponse.json({ error: "Refresh token expired" }, { status: 401 });
    }

    // compare hashed token
    const match = await bcrypt.compare(refreshRaw, sessionRow.refresh_token);
    if (!match) {
      return NextResponse.json({ error: "Invalid refresh credentials" }, { status: 401 });
    }

    // get user email (to sign access token)
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, email, name, email_verified")
      .eq("id", sessionRow.user_id)
      .maybeSingle();

    if (userErr || !user) {
      console.error("Refresh: user lookup failed", userErr);
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    // create new access JWT
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: Boolean(user.email_verified),
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    // rotate both refresh + session tokens
    const newRefreshRaw = crypto.randomBytes(48).toString("hex");
    const newHashedRefresh = bcrypt.hashSync(newRefreshRaw, 10);
    const newSessionTokenRaw = crypto.randomBytes(32).toString("hex") || uuidv4();
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const { error: updErr } = await supabase
      .from("sessions")
      .update({
        session_token: newSessionTokenRaw,
        refresh_token: newHashedRefresh,
        expires_at: newExpiresAt,
      })
      .eq("id", refreshId);

    if (updErr) {
      console.error("Failed to rotate refresh session:", updErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // set cookies
    const res = NextResponse.json({ message: "ok" });

    res.cookies.set("session", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    res.cookies.set("refresh_token", newRefreshRaw, {
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
    console.error("Refresh error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
