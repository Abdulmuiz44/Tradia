// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

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

    // ensure supabase url is configured
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!SUPABASE_URL) {
      console.error("SIGNUP ERROR: NEXT_PUBLIC_SUPABASE_URL not set");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    // Prefer creating an admin client with the service role key if available
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let supabase: ReturnType<typeof createSupabaseAdminClient> | ReturnType<typeof createServerClient>;

    if (SERVICE_ROLE_KEY) {
      supabase = createSupabaseAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
    } else {
      // fallback to your server client (uses anon key / cookie-aware client)
      supabase = createServerClient();
    }

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

    // hash password (bcryptjs)
    const hashedPassword = await bcrypt.hash(password, 12);

    // insert into users table
    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password: hashedPassword,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("Supabase insert error:", insertError.message);
      // if unique constraint violated for some race condition, return 409
      if (insertError.code === "23505" || /unique/i.test(insertError.message || "")) {
        return NextResponse.json({ error: "Email already registered." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
    }

    // success
    return NextResponse.json({ message: "Account created successfully.", userId: inserted?.id ?? null }, { status: 201 });
  } catch (err: unknown) {
    console.error("Signup error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
