// lib/mailer.ts
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@yourdomain.com";

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn("Mailer not fully configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const origin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

  const html = `
    <p>Hi —</p>
    <p>Thanks for creating an account. Click the link below to verify your email address:</p>
    <p><a href="${verifyUrl}">Verify my email</a></p>
    <p>If the link doesn't work, copy and paste this into your browser:</p>
    <pre>${verifyUrl}</pre>
    <p>If you did not create an account, ignore this email.</p>
  `;

  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: "Verify your email",
    html,
  });

  return info;
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const origin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://tradia-app.vercel.app";
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <p>Hi —</p>
    <p>We received a request to reset your password. Click the link below to set a new password. This link will expire in 1 hour.</p>
    <p><a href="${resetUrl}">Reset my password</a></p>
    <p>If the link doesn't work, copy and paste this into your browser:</p>
    <pre>${resetUrl}</pre>
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
  `;

  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: "Reset your password",
    html,
  });

  return info;
}
