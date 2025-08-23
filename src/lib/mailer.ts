// lib/mailer.ts
import { sendEmail } from "@/lib/email";

function getAppOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://tradia-app.vercel.app"
  );
}

export async function sendVerificationEmail(to: string, token: string) {
  // Build verification URL using token provided by caller
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

  return sendEmail(to, "Verify your email", html);
}

// Sends a simple password reset email. The token storage is handled by the caller
// (forgot-password route) so this function only builds and sends the email.
export async function sendPasswordResetEmail(to: string, token: string) {
  const origin = getAppOrigin();
  const resetUrl = `${origin}/api/reset-password?token=${encodeURIComponent(
    token
  )}`;

  const html = `
    <p>Hi —</p>
    <p>We received a request to reset your password. Click the link below to set a new password:</p>
    <p><a href="${resetUrl}">Reset my password</a></p>
    <p>If the link doesn't work, copy and paste this into your browser:</p>
    <pre>${resetUrl}</pre>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
  `;

  return sendEmail(to, "Reset your password", html);
}
