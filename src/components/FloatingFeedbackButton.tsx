// src/components/FloatingFeedbackButton.tsx
"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

/**
 * FloatingFeedbackButton
 *
 * Props:
 *  - showOnPaths?: string[]  => optional list of path prefixes (e.g. ['/dashboard']) when the button should show.
 *  - position?: 'bottom-right' | 'bottom-left' => optional position (default bottom-right)
 *
 * Usage:
 *  <FloatingFeedbackButton />
 *  <FloatingFeedbackButton showOnPaths={['/dashboard']} />
 */
export default function FloatingFeedbackButton({
  showOnPaths,
  position = "bottom-right",
}: {
  showOnPaths?: string[] | undefined;
  position?: "bottom-right" | "bottom-left";
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Defensive pathname detection so component works with both app & pages router
  const getPath = (): string => {
    try {
      // app-router hook (only available in app router)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { usePathname } = require("next/navigation");
      return usePathname() ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    } catch {
      // fallback for pages router or when require fails
      return typeof window !== "undefined" ? window.location.pathname : "/";
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (!showOnPaths || showOnPaths.length === 0) {
      setVisible(true);
      return;
    }
    const path = getPath();
    // show if any prefix matches
    const ok = showOnPaths.some((p) => path.startsWith(p));
    setVisible(ok);
    // We also want to respond to client-side navigation (app router) changes.
    // Minimal listener to update on popstate.
    const onNav = () => {
      const newPath = getPath();
      const matches = showOnPaths.some((p) => newPath.startsWith(p));
      setVisible(matches);
    };
    window.addEventListener("popstate", onNav);
    window.addEventListener("pushstate" as any, onNav); // unsupported but harmless
    window.addEventListener("replacestate" as any, onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("pushstate" as any, onNav);
      window.removeEventListener("replacestate" as any, onNav);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnPaths, mounted]);

  if (!visible) return null;

  const posClasses =
    position === "bottom-left"
      ? "left-4 sm:left-6 right-auto"
      : "right-4 sm:right-6 left-auto";

  return (
    <>
      <div
        aria-hidden={open ? "true" : "false"}
        className={`fixed ${posClasses} bottom-4 sm:bottom-6 z-50`}
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex items-center">
          {/* optional label (hidden on xs screens to save space) */}
          <div className="hidden sm:flex items-center mr-2">
            <div className="rounded-full bg-slate-900/80 border border-zinc-700 px-3 py-2 text-xs text-zinc-200 shadow">
              Feedback
            </div>
          </div>

          <button
            aria-label="Send feedback"
            title="Send feedback"
            onClick={() => setOpen(true)}
            className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 inline-flex items-center justify-center w-12 h-12 sm:w-12 sm:h-12 rounded-full bg-slate-900/90 hover:scale-105 transition-transform shadow-xl border border-zinc-700"
          >
            <MessageSquare size={18} className="text-zinc-100 group-hover:text-sky-300" />
          </button>
        </div>
      </div>

      {/* Feedback modal (re-uses your existing modal) */}
      <FeedbackModal
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
