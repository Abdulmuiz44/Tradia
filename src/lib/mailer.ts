// lib/mailer.ts
import nodemailer from "nodemailer";

// Accept both SMTP_* and EMAIL_* envs
const SMTP_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const FROM_EMAIL =
  process.env.FROM_EMAIL || process.env.EMAIL_FROM || "no-reply@yourdomain.com";

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn(
    "Mailer not fully configured. Set SMTP_HOST/EMAIL_HOST, SMTP_USER/EMAIL_USER and SMTP_PASS/EMAIL_PASS."
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth:
    SMTP_USER && SMTP_PASS
      ? { user: SMTP_USER, pass: SMTP_PASS }
      : undefined,
});

/** Build an absolute origin for links inside emails. */
function getAppOrigin() {
  // Prefer an explicit public URL; fall back to NextAuth URL; final fallback is your Vercel domain.
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://tradia-app.vercel.app"
  );
}

/**
 * Send verification email with a link to your custom route:
 *   GET /api/verify-email?token=...
 * (not under /api/auth to avoid NextAuth interference)
 */
export async function sendVerificationEmail(to: string, token: string) {
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
    from: FROM_EMAIL,
    to,
    subject: "Verify your email",
    html,
  });
}

/**
 * Send password reset email that points to your reset page:
 *   /reset-password?token=...
 */
export async function sendPasswordResetEmail(to: string, token: string) {
  const origin = getAppOrigin();
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  const html = `
    <p>Hi —</p>
    <p>We received a request to reset your password. Click the link below to set a new password. This link will expire in 1 hour.</p>
    <p><a href="${resetUrl}">Reset my password</a></p>
    <p>If the link doesn't work, copy and paste this into your browser:</p>
    <pre>${resetUrl}</pre>
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
  `;

  return transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: "Reset your password",
    html,
  });
}
