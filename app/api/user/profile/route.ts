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

    // Try to get user profile from database, but fallback to session data
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, plan, email_verified, created_at")
        .eq("id", session.user.id as string)
        .single();

      if (!error && user) {
        // Combine database data with NextAuth session data
        return NextResponse.json({
          id: user.id,
          name: session.user.name || null,
          email: user.email || session.user.email || '',
          plan: user.plan || 'free',
          emailVerified: user.email_verified || false,
          createdAt: user.created_at,
        });
      }
    } catch (dbError) {
      console.warn("Database query failed, using session data:", dbError);
    }

    // Fallback to session data if database query fails
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
