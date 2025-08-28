// app/api/user/profile/route.ts
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

export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase not configured correctly" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const email = url.searchParams.get("email")?.trim();

    if (!email) {
      return NextResponse.json(
        { error: "Missing email query param" },
        { status: 400 }
      );
    }

    // Try to read from `profiles` table
    try {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (profileErr && profileErr.code !== "42P01") {
        console.error("profiles table query error:", profileErr);
        return NextResponse.json(
          { error: "Database error reading profile", details: profileErr.message },
          { status: 500 }
        );
      }

      if (profile) {
        return NextResponse.json({
          email,
          name: profile.name ?? null,
          image: profile.image ?? null,
          phone: profile.phone ?? null,
          country: profile.country ?? null,
          tradingStyle:
            profile.trading_style ?? profile.tradingStyle ?? null,
          tradingExperience:
            profile.trading_experience ?? profile.tradingExperience ?? null,
          bio: profile.bio ?? null,
          raw: profile,
        });
      }
    } catch (err: any) {
      console.warn("profiles fetch attempt failed:", err);
      // fall through to auth user fetch
    }

    // Fallback: query auth user
    try {
      const { data: userResult, error: userErr } =
        await supabaseAdmin.auth.admin.getUserByEmail(email);

      if (userErr) {
        console.error("auth.admin.getUserByEmail error:", userErr);
        return NextResponse.json(
          { error: "Unable to fetch user info", details: userErr.message },
          { status: 500 }
        );
      }

      const user = userResult?.user ?? null;
      if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

      const metadata = (user.user_metadata as any) || {};
      return NextResponse.json({
        email: user.email ?? null,
        name: metadata?.full_name ?? metadata?.name ?? user.email,
        image: metadata?.avatar_url ?? metadata?.image ?? null,
        bio: metadata?.bio ?? null,
        rawAuthUser: user,
      });
    } catch (err: any) {
      console.error("auth fallback failed:", err);
      return NextResponse.json(
        { error: "Internal server error", details: String(err) },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("profile GET error:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: String(err) },
      { status: 500 }
    );
  }
}
