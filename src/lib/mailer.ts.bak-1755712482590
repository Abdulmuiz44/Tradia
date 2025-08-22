// lib/mailer.ts
import nodemailer from "nodemailer";

if (
  !process.env.EMAIL_HOST ||
  !process.env.EMAIL_PORT ||
  !process.env.EMAIL_USER ||
  !process.env.EMAIL_PASS ||
  !process.env.EMAIL_FROM ||
  !process.env.NEXT_PUBLIC_BASE_URL
) {
  throw new Error("Email environment variables not set. See EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, NEXT_PUBLIC_BASE_URL");
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verification email (existing)
export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Verify your Tradia account",
    html: `
      <h2>Welcome to Tradia!</h2>
      <p>Please verify your email by clicking the button below:</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
      <p>If you did not sign up, please ignore this email.</p>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Verification email sent:", info.messageId);
  return info;
}

// Password reset email (new)
export async function sendPasswordResetEmail(to: string, token: string) {
  // Link goes to the frontend reset page (so user interacts with your UI)
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Tradia — Reset your password",
    html: `
      <h2>Password reset requested</h2>
      <p>We received a request to reset your Tradia password. Click the button below to set a new password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Password reset email sent:", info.messageId);
  return info;
}
