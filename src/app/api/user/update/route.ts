// app/api/user/update/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

export async function PATCH(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase not configured correctly" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email ?? "").toString().trim();

    if (!email) {
      return NextResponse.json(
        { error: "Missing email in body" },
        { status: 400 }
      );
    }

    // Normalize payload fields
    const payload: Record<string, unknown> = {};
    if (typeof body.name === "string") payload.name = body.name;
    if (typeof body.image === "string") payload.image = body.image;
    if (typeof body.phone === "string") payload.phone = body.phone;
    if (typeof body.country === "string") payload.country = body.country;
    if (typeof body.tradingStyle === "string")
      payload.trading_style = body.tradingStyle;
    if (typeof body.tradingExperience === "string")
      payload.trading_experience = body.tradingExperience;
    if (typeof body.bio === "string") payload.bio = body.bio;
    payload.email = email;

    // Try to upsert into profiles table (create if missing)
    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .upsert(payload, { onConflict: "email" })
        .select()
        .maybeSingle();

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json(
            {
              error:
                "profiles table does not exist. Create it in Supabase. See docs or run provided SQL.",
            },
            { status: 500 }
          );
        }
        console.error("profiles upsert error:", error);
        return NextResponse.json(
          { error: "Failed to save profile", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, user: data ?? null });
    } catch (err: any) {
      console.error("profiles upsert runtime error:", err);
      return NextResponse.json(
        { error: "Internal server error", details: String(err) },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("profile PATCH error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: String(err) },
      { status: 500 }
    );
  }
}
