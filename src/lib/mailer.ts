import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Tradia" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "Verify Your Tradia Account",
    html: `
      <h2>Welcome to Tradia</h2>
      <p>Click the button below to verify your account:</p>
      <a href="${verifyUrl}" style="padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${verifyUrl}</p>
    `,
  });
}
