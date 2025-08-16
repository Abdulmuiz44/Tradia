"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved =
        typeof window !== "undefined" &&
        localStorage.getItem("tradia_remember_email");
      if (saved) {
        setForm((f) => ({ ...f, email: saved }));
        setRemember(true);
      }
    } catch {}
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const toggleRemember = () => {
    const newVal = !remember;
    setRemember(newVal);
    try {
      if (newVal && form.email) {
        localStorage.setItem("tradia_remember_email", form.email);
      } else {
        localStorage.removeItem("tradia_remember_email");
      }
    } catch {}
  };

  useEffect(() => {
    try {
      if (remember && form.email)
        localStorage.setItem("tradia_remember_email", form.email);
    } catch {}
  }, [form.email, remember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const result: any = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });

      if (result?.error) {
        // Custom error from NextAuth (like unverified email)
        setError(result.error);
        return;
      }

      if (result?.ok) {
        try {
          if (remember) localStorage.setItem("tradia_remember_email", form.email);
          else localStorage.removeItem("tradia_remember_email");
        } catch {}
        router.push("/dashboard");
      } else {
        setError("Invalid credentials or sign-in failed.");
      }
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setError(err?.message || "Sign-in request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-md rounded-2xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400">
          Sign in to Tradia
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email Address"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            aria-label="Email Address"
          />

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            aria-label="Password"
          />

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={toggleRemember}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Remember me
              </span>
            </label>

            <Link
              href="/forgot-password"
              className="text-sm text-indigo-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center text-gray-500 dark:text-gray-400">OR</div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <FcGoogle size={22} />
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Don't have an account?{" "}
          <Link href="/signup" className="text-indigo-600 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
