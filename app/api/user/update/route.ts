// src/app/api/user/update/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAdminSupabase } from "@/utils/supabase/admin";

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      country,
      tradingStyle,
      experienceLevel,
      preferredPairs,
      riskTolerance,
      bio,
      profileImageUrl,
      timezone
    } = body;

    // Validate input - only name is required
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (country !== undefined) updateData.country = country?.trim() || null;
    if (tradingStyle !== undefined) updateData.trading_style = tradingStyle || null;
    if (experienceLevel !== undefined) updateData.experience_level = experienceLevel || null;
    if (preferredPairs !== undefined) updateData.preferred_pairs = preferredPairs || null;
    if (riskTolerance !== undefined) updateData.risk_tolerance = riskTolerance || null;
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (profileImageUrl !== undefined) updateData.profile_image_url = profileImageUrl || null;
    if (timezone !== undefined) updateData.timezone = timezone || null;

    // Update user profile
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", session.user.id as string)
      .select(`
        id, 
        name, 
        email, 
        country, 
        image, 
        plan,
        trading_style,
        experience_level,
        preferred_pairs,
        risk_tolerance,
        bio,
        profile_image_url,
        timezone,
        updated_at
      `)
      .single();

    if (error) {
      console.error("Failed to update user profile:", error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        country: updatedUser.country,
        plan: updatedUser.plan,
        image: updatedUser.image || updatedUser.profile_image_url,
        tradingStyle: updatedUser.trading_style,
        experienceLevel: updatedUser.experience_level,
        preferredPairs: updatedUser.preferred_pairs,
        riskTolerance: updatedUser.risk_tolerance,
        bio: updatedUser.bio,
        profileImageUrl: updatedUser.profile_image_url,
        timezone: updatedUser.timezone,
      }
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

