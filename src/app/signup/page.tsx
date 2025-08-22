// app/signup/page.tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Keep checkbox controlled only
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const form = formRef.current;
    if (!form) return setError("Form not ready.");

    const fd = new FormData(form);
    const rawName = fd.get("name");
    const rawEmail = fd.get("email");
    const rawPassword = fd.get("password");
    const rawConfirm = fd.get("confirmPassword");

    const name = typeof rawName === "string" ? rawName.trim() : "";
    const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
    const password = typeof rawPassword === "string" ? rawPassword : "";
    const confirmPassword = typeof rawConfirm === "string" ? rawConfirm : "";

    if (!name || !email || !password || !confirmPassword) {
      return setError("All fields are required.");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (!agreed) {
      return setError("You must agree to Tradia’s Terms & Conditions and Privacy Policy.");
    }

    setLoading(true);
    try {
      // Supabase signup with email + password
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }, // store name in user_metadata
          emailRedirectTo: `${window.location.origin}/auth/callback`, // where Supabase sends user after email verification
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setNotice("Account created! We’ve sent a verification link to your email. Please verify to continue.");

      // redirect user to check-email page
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error("Signup failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`, // Supabase will handle the redirect back
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-md rounded-2xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400">
          Create Your Tradia Account
        </h2>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm text-center"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md text-sm text-center"
          >
            {notice}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="name"
          />

          {/* Email */}
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="email"
          />

          {/* Password */}
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="new-password"
          />

          {/* Confirm Password */}
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="new-password"
          />

          {/* Terms */}
          <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              id="agree"
              name="agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              aria-required="true"
            />
            <span>
              I agree to Tradia’s{" "}
              <Link href="/terms" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="text-center text-gray-500 dark:text-gray-400">OR</div>

        <button
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <FcGoogle size={22} />
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
