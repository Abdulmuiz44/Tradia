// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", session.user.email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching profile:", error);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    return NextResponse.json({ profile: profile || null });
  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      country,
      phone,
      bio,
      tradingStyle,
      tradingExperience
    } = body;

    const supabase = createClient();

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", session.user.email)
      .single();

    const profileData = {
      email: session.user.email,
      name: name || null,
      country: country || null,
      phone: phone || null,
      bio: bio || null,
      tradingStyle: tradingStyle || null,
      tradingExperience: tradingExperience || null,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingProfile) {
      // Update existing profile
      result = await supabase
        .from("user_profiles")
        .update(profileData)
        .eq("email", session.user.email)
        .select()
        .single();
    } else {
      // Create new profile
      result = await supabase
        .from("user_profiles")
        .insert({
          ...profileData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error saving profile:", result.error);
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: result.data,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
