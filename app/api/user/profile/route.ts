// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createAdminSupabase } from "@/utils/supabase/admin";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminSupabase();
    let user = null;

    // First try to get user by ID if available
    if (session.user.id) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id as string)
        .maybeSingle();

      if (!error && data) {
        user = data;
      }
    }

    // If ID query didn't work, try by email (more reliable)
    if (!user && session.user.email) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", session.user.email.toLowerCase())
        .maybeSingle();

      if (!error && data) {
        user = data;
      } else if (error) {
        console.error("Database query error by email:", error.message);
      }
    }

    if (!user) {
      console.warn("No user found for session:", {
        id: session.user.id,
        email: session.user.email
      });
      return NextResponse.json({
        id: session.user.id || '',
        name: session.user.name || null,
        email: session.user.email || '',
        country: null,
        plan: 'starter',
        emailVerified: false,
        createdAt: null,
        image: session.user.image || null,
        tradingStyle: null,
        experienceLevel: null,
        preferredPairs: null,
        riskTolerance: null,
        bio: null,
        profileImageUrl: null,
        timezone: null,
        _source: 'session_fallback_no_user',
      });
    }

    // We have real user data from database
    // email_verified can be: null, false, true, or a timestamp string
    const isEmailVerified = Boolean(user.email_verified);

    // Handle both possible column names for experience
    const experienceLevel = user.experience_level || user.trading_experience || null;

    return NextResponse.json({
      id: user.id,
      name: user.name || null,
      email: user.email || session.user.email || '',
      country: user.country || null,
      plan: user.plan || 'starter',
      emailVerified: isEmailVerified,
      createdAt: user.created_at || user.signup_at || null,
      image: user.image || user.profile_image_url || null,
      tradingStyle: user.trading_style || null,
      experienceLevel: experienceLevel,
      preferredPairs: user.preferred_pairs || null,
      riskTolerance: user.risk_tolerance || null,
      bio: user.bio || null,
      profileImageUrl: user.profile_image_url || user.image || null,
      timezone: user.timezone || null,
      _source: 'database',
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({
      error: "Failed to fetch profile",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}



