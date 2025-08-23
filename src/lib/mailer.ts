// lib/mailer.ts
import nodemailer from "nodemailer";
import crypto from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";

// ... your transporter setup stays the same

function getAppOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://tradia-app.vercel.app"
  );
}

export async function sendVerificationEmail(userId: string, to: string) {
  const supabase = createAdminClient();

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");

  // Expire after 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Save to DB
  await supabase.from("email_verification_tokens").insert({
    token,
    user_id: userId,
    expires_at: expiresAt,
  });

  // Build verification URL
  const origin = getAppOrigin();
  const verifyUrl = `${origin}/api/verify-email?token=${encodeURIComponent(
    token
  )}`;

  const html = `
    <p>Hi —</p>
    <p>Thanks for creating an account. Click the link below to verify your email address:</p>
    <p><a href="${verifyUrl}">Verify my email</a></p>
    <p>If the link doesn't work, copy and paste this into your browser:</p>
    <pre>${verifyUrl}</pre>
    <p>If you did not create an account, ignore this email.</p>
  `;

  return transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: "Verify your email",
    html,
  });
}
