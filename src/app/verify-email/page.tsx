// src/app/verify-email/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // safe read — searchParams can be null
  const token = searchParams?.get("token") ?? "";

  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    if (!token) {
      setStatus("Invalid verification link.");
      return;
    }

    let mounted = true;

    (async () => {
      try {
        // encode token to be safe in URL
        const url = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;

        // keep GET to match your original usage; change to POST on server if needed
        const res = await fetch(url, { method: "GET" });

        if (!mounted) return;

        if (!res.ok) {
          // attempt to show useful message from server
          const text = await res.text().catch(() => "");
          setStatus(text || `Verification failed (${res.status})`);
          return;
        }

        const data = (await res.json().catch(() => null)) as any;
        if (!mounted) return;

        if (data && data.success) {
          // success path — navigate to success page
          router.push("/verify-email/success");
        } else {
          setStatus((data && data.error) || "Verification failed.");
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(msg || "Verification failed.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="px-4 py-6 rounded-md bg-white/6 text-center">
        <p className="text-sm">{status}</p>
      </div>
    </div>
  );
}
