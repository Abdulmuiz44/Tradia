// app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // throw early so devs can catch misconfiguration quickly
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email")?.trim();

    if (!email) {
      return NextResponse.json({ error: "Missing email query param" }, { status: 400 });
    }

    // Try to read the application profile row
    try {
      // We intentionally select '*' so if schema changes we still return available columns
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (profileErr && profileErr.code === "42P01") {
        // table does not exist
        // fall through to auth user fetch
      } else if (profileErr) {
        // other DB error
        console.error("profiles table query error:", profileErr);
        return NextResponse.json({ error: "Database error reading profile", details: profileErr }, { status: 500 });
      }

      if (profile) {
        // return merged minimal object
        return NextResponse.json({
          email,
          name: profile.name ?? null,
          image: profile.image ?? null,
          phone: profile.phone ?? null,
          country: profile.country ?? null,
          tradingStyle: profile.trading_style ?? profile.tradingStyle ?? null,
          tradingExperience: profile.trading_experience ?? profile.tradingExperience ?? null,
          bio: profile.bio ?? null,
          raw: profile,
        });
      }
    } catch (err) {
      // In case the profiles table is absent or other runtime error
      console.warn("profiles fetch attempt failed:", err);
      // continue to attempt auth user fallback below
    }

    // Fallback: query auth user by email using admin API
    try {
      // requires service role key - safe on server
      const { data: userResult, error: userErr } = await supabaseAdmin.auth.admin.getUserByEmail(email);

      if (userErr) {
        console.error("auth.admin.getUserByEmail error:", userErr);
        return NextResponse.json({ error: "Unable to fetch user info", details: userErr }, { status: 500 });
      }

      const user = userResult?.user ?? null;
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // Construct a minimal response from auth data (user_metadata may contain name/image)
      const metadata = (user.user_metadata as any) || {};
      return NextResponse.json({
        email: user.email ?? null,
        name: metadata?.full_name ?? metadata?.name ?? user.email,
        image: metadata?.avatar_url ?? metadata?.image ?? null,
        bio: metadata?.bio ?? null,
        rawAuthUser: user,
      });
    } catch (err) {
      console.error("auth fallback failed:", err);
      return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
    }
  } catch (err: any) {
    console.error("profile GET error:", err);
    return NextResponse.json({ error: "Unexpected error", details: String(err) }, { status: 500 });
  }
}
