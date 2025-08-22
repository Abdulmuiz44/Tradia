// app/api/auth/resend-verification/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Find user
    const supabase = createClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, email_verified")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email" },
        { status: 404 }
      );
    }

    if (user.email_verified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString("hex");

    // Save new token in DB
  await supabase.from("users").update({ verification_token: newToken }).eq("id", user.id);

    // Resend email
    await sendVerificationEmail(email, newToken);

    return NextResponse.json({ message: "Verification email resent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
