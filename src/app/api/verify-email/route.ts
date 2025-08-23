// app/api/verify-email/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing verification token" },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();

    // Lookup user by token in your "email_verification_tokens" table
    const { data: tokenRow, error: tokenError } = await supabase
      .from("email_verification_tokens")
      .select("user_id, expires_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 400 }
      );
    }

    // Mark user as verified
    const { error: updateError } = await supabase
      .from("users")
      .update({ email_verified: true })
      .eq("id", tokenRow.user_id);

    if (updateError) throw updateError;

    // Optionally delete the used token
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("token", token);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://tradia-app.vercel.app"}/verified-success`
    );
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json(
      { error: "Server error during verification" },
      { status: 500 }
    );
  }
}
