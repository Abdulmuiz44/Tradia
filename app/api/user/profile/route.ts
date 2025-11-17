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

    // Get user profile from database
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, image, role, created_at, metadata")
      .eq("id", session.user.id as string)
      .single();

    if (error) {
      console.error("Failed to fetch user profile:", error);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role || 'user',
        createdAt: user.created_at,
        marketPreference: user.metadata?.market_preference || 'both',
      }
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { market_preference } = body;

    // Validate market preference
    if (!market_preference || !['forex', 'crypto', 'both'].includes(market_preference)) {
      return NextResponse.json(
        { error: "Invalid market preference. Must be 'forex', 'crypto', or 'both'" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Update user metadata with market preference
    const { data, error } = await supabase
      .from("users")
      .update({
        metadata: {
          market_preference,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id as string)
      .select()
      .single();

    if (error) {
      console.error("Failed to update market preference:", error);
      return NextResponse.json({ error: "Failed to update preference" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      marketPreference: market_preference,
    });
  } catch (error) {
    console.error("Market preference update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // Alias PUT to POST for convenience
  return POST(request);
}
