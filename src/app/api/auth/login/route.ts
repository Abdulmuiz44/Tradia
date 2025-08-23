// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

    // require email_verified not null
    if (!user.email_verified) {
      return NextResponse.json({ error: "Email not verified. Please check your email." }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    // create JWT
    const token = jwt.sign({ id: user.id, email: normalized, name: user.name }, JWT_SECRET, { expiresIn: "7d" });

    const res = NextResponse.json({ message: "Login successful." });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
