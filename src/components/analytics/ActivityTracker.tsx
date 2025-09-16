"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

// Lightweight client tracker that posts page views and selected actions
export default function ActivityTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const lastPathRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Simple session id for anonymous correlation
  const getClientSessionId = () => {
    try {
      const key = "tradia_client_session_id";
      let id = localStorage.getItem(key);
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return undefined;
    }
  };

  const postEvent = async (payload: Record<string, any>) => {
    try {
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          sessionId: getClientSessionId(),
          viewport: { w: window.innerWidth, h: window.innerHeight },
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        keepalive: true,
      });
    } catch (e) {
      // swallow errors
    }
  };

  // Track page views on route change
  useEffect(() => {
    const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    const referrer = document.referrer || undefined;

    // send time-on-page for previous view
    const now = Date.now();
    if (lastPathRef.current && lastPathRef.current !== fullPath) {
      const durationMs = now - startTimeRef.current;
      postEvent({ type: "page_duration", path: lastPathRef.current, durationMs });
      startTimeRef.current = now;
    } else if (!lastPathRef.current) {
      startTimeRef.current = now;
    }
    lastPathRef.current = fullPath;

    postEvent({
      type: "page_view",
      path: fullPath,
      referrer,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Track clicks on elements explicitly marked with data-track
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const name = el.getAttribute("data-track") || "click";
      const extra = el.getAttribute("data-track-meta");
      let meta: any = undefined;
      if (extra) {
        try { meta = JSON.parse(extra); } catch { meta = { value: extra }; }
      }
      postEvent({ type: "action", name, path: pathname, meta });
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // On unload, try to send last duration
  useEffect(() => {
    const onBeforeUnload = () => {
      if (!lastPathRef.current) return;
      const durationMs = Date.now() - startTimeRef.current;
      navigator.sendBeacon?.(
        "/api/analytics/track",
        new Blob([
          JSON.stringify({ type: "page_duration", path: lastPathRef.current, durationMs, sessionId: getClientSessionId() })
        ], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload as any);
  }, []);

  return null;
}
