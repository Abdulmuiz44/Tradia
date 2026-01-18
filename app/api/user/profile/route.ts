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
    let user = null;

    // Try to get user profile from database
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id, 
          email, 
          name,
          country,
          plan, 
          email_verified, 
          created_at,
          image,
          trading_style,
          experience_level,
          preferred_pairs,
          risk_tolerance,
          bio,
          profile_image_url,
          timezone
        `)
        .eq("id", session.user.id as string)
        .maybeSingle();

      if (error) {
        console.warn("Database query error:", error.message);
      } else if (data) {
        user = data;
      }
    } catch (dbError) {
      console.warn("Database query failed:", dbError);
    }

    // If we got data from database, use it; otherwise use session data
    if (user) {
      return NextResponse.json({
        id: user.id,
        name: user.name || session.user.name || null,
        email: user.email || session.user.email || '',
        country: user.country || null,
        plan: user.plan || 'starter',
        emailVerified: user.email_verified ? true : false,
        createdAt: user.created_at,
        image: user.image || user.profile_image_url || session.user.image || null,
        tradingStyle: user.trading_style || null,
        experienceLevel: user.experience_level || null,
        preferredPairs: user.preferred_pairs || null,
        riskTolerance: user.risk_tolerance || null,
        bio: user.bio || null,
        profileImageUrl: user.profile_image_url || user.image || null,
        timezone: user.timezone || null,
      });
    }

    // Fallback to session data if database query fails or returns no data
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
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    // Return 500 only if absolutely necessary; try to provide session fallback
    return NextResponse.json({
      error: "Failed to fetch profile",
    }, { status: 500 });
  }
}

