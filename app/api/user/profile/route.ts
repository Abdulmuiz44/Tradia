// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Try to get user profile from database with essential columns first
    const { data: user, error } = await supabase
      .from("users")
      .select("*")  // Select all to avoid column not found errors
      .eq("id", session.user.id as string)
      .maybeSingle();

    if (error) {
      console.error("Database query error:", error.message, error);
      // Return fallback only if there's a genuine error
      return NextResponse.json({
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || '',
        country: null,
        plan: 'starter',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        image: session.user.image || null,
        tradingStyle: null,
        experienceLevel: null,
        preferredPairs: null,
        riskTolerance: null,
        bio: null,
        profileImageUrl: null,
        timezone: null,
        _source: 'session_fallback_error',
        _error: error.message,
      });
    }

    if (!user) {
      console.warn("No user found in database for ID:", session.user.id);
      return NextResponse.json({
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || '',
        country: null,
        plan: 'starter',
        emailVerified: false,
        createdAt: new Date().toISOString(),
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
    // It's verified if it's truthy (true or has a timestamp value)
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


