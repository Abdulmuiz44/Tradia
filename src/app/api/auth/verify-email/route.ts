// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email/failed`
      );
    }

    const supabase = createClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("verification_token", token)
      .maybeSingle();
    if (error) throw error;

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email/failed`
      );
    }

    // Update user: set email_verified and remove token
    await supabase
      .from("users")
      .update({ email_verified: new Date().toISOString(), verification_token: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    // ✅ Redirect instead of JSON
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email/success`
    );
  } catch (err) {
    console.error("Email verification error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email/failed`
    );
  }
}
