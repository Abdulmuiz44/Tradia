// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export async function GET() {
  try {
    // Try NextAuth session first
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as SessionUser | undefined)?.id ?? undefined;
    } catch (e) {
      // ignore
    }

    // If no NextAuth session, use server-side supabase client which can read cookies
    if (!userId) {
      try {
        const supabase = createClient();
        const { data: authData, error: authErr } = await (supabase.auth as any).getUser();
        if (!authErr && authData?.user?.id) userId = String(authData.user.id);
      } catch (e) {
        console.error("profile: supabase cookie client failed:", e);
      }
    }

    if (!userId) return NextResponse.json({}, { status: 401 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,image,phone,country,trading_style,trading_experience,bio")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({}, { status: 404 });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("GET /api/user/profile error:", err);
    return NextResponse.json({}, { status: 500 });
  }
}
