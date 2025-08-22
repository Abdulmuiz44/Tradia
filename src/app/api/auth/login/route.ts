// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createClient } from "@/utils/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // ⚠️ put a strong secret in .env

export async function POST(req: Request) {
  try {
    const body: LoginBody = await req.json();
    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const supabase = createClient();

    // get user
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, email, password, name")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      console.error("Supabase select error:", fetchError.message);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // set cookie
    const response = NextResponse.json({ message: "Login successful." });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    console.error("Login error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
