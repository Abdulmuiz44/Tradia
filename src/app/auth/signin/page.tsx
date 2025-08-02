"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If the user is already logged in, redirect to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 border rounded-xl shadow-lg space-y-6">
        <h1 className="text-3xl font-bold text-center">Sign In</h1>
        <button
          onClick={() => signIn("google")}
          className="w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
