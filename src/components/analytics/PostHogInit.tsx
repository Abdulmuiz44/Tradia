// src/components/analytics/PostHogInit.tsx
"use client";
import { useEffect } from "react";
import posthog from "posthog-js";

export default function PostHogInit() {
  useEffect(() => {
    // Only run on client + when key present
    if (typeof window === "undefined") return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    try {
      posthog.init(key, { api_host: "https://app.posthog.com" });
    } catch (err) {
      // guard: if init throws for any reason, avoid breaking the app
      // eslint-disable-next-line no-console
      console.warn("PostHog init failed:", err);
    }

    return () => {
      // defensive cleanup: shutdown may not be present in the typings for posthog-js
      // so try shutdown, otherwise try reset. cast to any to avoid TS errors.
      try {
        const ph: any = posthog;
        if (ph && typeof ph.shutdown === "function") {
          ph.shutdown();
        } else if (ph && typeof ph.reset === "function") {
          ph.reset();
        }
      } catch {
        // ignore errors during cleanup
      }
    };
  }, []);
  return null;
}
