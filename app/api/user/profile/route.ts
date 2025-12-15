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
        .select("id, email, plan, email_verified, created_at")
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
        name: session.user.name || null,
        email: user.email || session.user.email || '',
        plan: user.plan || 'free',
        emailVerified: user.email_verified ? true : false,
        createdAt: user.created_at,
      });
    }

    // Fallback to session data if database query fails or returns no data
    return NextResponse.json({
      id: session.user.id,
      name: session.user.name || null,
      email: session.user.email || '',
      plan: 'free',
      emailVerified: !!session.user.email_verified,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    // Return 500 only if absolutely necessary; try to provide session fallback
    return NextResponse.json({
      error: "Failed to fetch profile",
    }, { status: 500 });
  }
}
