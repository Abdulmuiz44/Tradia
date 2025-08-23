// app/check-email/page.tsx
"use client";

import { useSearchParams } from "next/navigation";

export default function CheckEmailPage() {
  const params = useSearchParams();
  const email = params?.get("email") ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-xl p-8 bg-white rounded-lg">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-3">
          We sent a verification link to <strong>{email}</strong>. Open that email and click the verification link to complete registration.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          Didn’t receive the email? Check your spam folder or request a resend from your account settings after logging in.
        </p>
      </div>
    </div>
  );
}
