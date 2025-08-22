// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createClient } from "@/utils/supabase/server";

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body: SignupBody = await req.json();
    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields required." }, { status: 400 });
    }

    const supabase = createClient();

    // check if user already exists
    const { data: existingUser, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error("Supabase select error:", existingError.message);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // insert into users table
    const { error: insertError } = await supabase.from("users").insert({
      name,
      email,
      password: hashedPassword,
    });

    if (insertError) {
      console.error("Supabase insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Account created successfully." },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Signup error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
