// src/app/api/auth/resend-verification/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabase } from "@/utils/supabase/admin";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // Find user by email
    const { data: user, error: selErr } = await supabase
      .from("users")
      .select("id, email_verified")
      .eq("email", email)
      .maybeSingle();

    if (selErr) {
      console.error("Resend select error:", selErr);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({ message: "If the email exists and is not verified, a new verification email has been sent." }, { status: 200 });
    }

    if (user.email_verified) {
      return NextResponse.json({ error: "Email is already verified." }, { status: 400 });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");

    // Update user with new token
    const { error: updErr } = await supabase
      .from("users")
      .update({
        verification_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updErr) {
      console.error("Resend update error:", updErr);
      return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, token);
    } catch (mailErr) {
      console.error("Resend mail failed:", mailErr);
      return NextResponse.json({ error: "Failed to send verification email." }, { status: 500 });
    }

    return NextResponse.json({ message: "Verification email sent." }, { status: 200 });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
