// lib/mailer.ts
import nodemailer from "nodemailer";

// Ensure all required environment variables are set
if (
  !process.env.EMAIL_HOST ||
  !process.env.EMAIL_PORT ||
  !process.env.EMAIL_USER ||
  !process.env.EMAIL_PASS ||
  !process.env.EMAIL_FROM
) {
  throw new Error("Email environment variables not set.");
}

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail app password, no spaces!
  },
});

// Send verification email function
export async function sendVerificationEmail(to: string, token: string) {
  // IMPORTANT: point to the API route, not directly to /verify-email
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Verify your Tradia account",
    html: `
      <h2>Welcome to Tradia!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}" 
         style="padding:10px 20px; background:#4CAF50; color:white; text-decoration:none;">
         Verify Email
      </a>
      <p>If you did not sign up, please ignore this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", info.messageId);
  } catch (err) {
    console.error("Failed to send verification email:", err);
    throw err; // let the calling function handle the error
  }
}