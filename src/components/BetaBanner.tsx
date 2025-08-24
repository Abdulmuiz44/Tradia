// src/components/BetaBanner.tsx
"use client";
import React, { useEffect, useState } from "react";

export default function BetaBanner() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("tradia_beta_banner_hidden");
      setHidden(v === "1");
    } catch {
      // ignore
    }
  }, []);

  if (hidden) return null;

  return (
    <div className="w-full bg-yellow-600/10 border border-yellow-500 text-yellow-100 p-2 rounded-md flex items-center justify-between gap-3">
      <div className="text-sm">
        <strong>Tradia — Public Beta</strong>{" "}
        <span className="text-xs text-yellow-200">Free during launch. Pricing & billing coming soon.</span>
      </div>
      <div className="flex items-center gap-2">
        <a href="/docs/launch" className="text-xs underline">More</a>
        <button
          aria-label="Dismiss banner"
          className="text-xs px-2 py-1 bg-yellow-700/20 rounded"
          onClick={() => {
            try {
              localStorage.setItem("tradia_beta_banner_hidden", "1");
            } catch {}
            setHidden(true);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
