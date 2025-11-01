"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { Progress } from "@/components/ui/progress";

const PLAYBOOK_CALLS = [
  "Unlock the SMC Playbook",
  "Claim the Prop-Challenge Blueprint",
  "Keep your win-streak alive"
];

const POWER_MOVES = [
  "Daily AI forecast drop",
  "Risk guard auto-shutdown",
  "Prop firm simulator boosts",
  "1-click play-by-play journal"
];

export default function ExitIntent() {
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(35);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem("tradia_session_streak")) || 0;
      const next = Math.max(1, stored + 1);
      setStreak(next);
      localStorage.setItem("tradia_session_streak", String(next));
    } catch {}
  }, []);

  useEffect(() => {
    const key = "exit_intent_shown";
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        if (sessionStorage.getItem(key) === "1") return;
        sessionStorage.setItem(key, "1");
        setShow(true);
        try { trackEvent('exit_intent_trigger'); } catch {}
      }
    };
    window.addEventListener("mouseout", onMouseOut);
    return () => window.removeEventListener("mouseout", onMouseOut);
  }, []);

  useEffect(() => {
    if (!show) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [show]);

  const featuredPowerMoves = useMemo(() => {
    const shuffled = [...POWER_MOVES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [show]);

  const headline = useMemo(() => {
    const index = streak % PLAYBOOK_CALLS.length;
    return PLAYBOOK_CALLS[index];
  }, [streak]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShow(false)} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-indigo-500/40 bg-[#050b18] shadow-[0_0_60px_rgba(99,102,241,0.45)]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.45)_0%,transparent_65%)]" />
        <div className="relative grid gap-6 md:grid-cols-[1.2fr_1fr] p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/80">Momentum Alert</p>
            <h3 className="mt-2 text-3xl font-black text-white leading-tight">
              {headline}
            </h3>
            <p className="mt-3 text-sm text-indigo-100/90">
              You are on session streak <span className="font-semibold text-white">#{streak}</span>. Drop now and your AI edge cools off. Stay, and we push another forecast, risk-guard check, and prop-plan tweak into your queue.
            </p>

            <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
              <div className="flex items-center justify-between text-xs text-indigo-200/90">
                <span>Next forecast refresh</span>
                <span>{countdown > 0 ? `${countdown}s` : "Ready"}</span>
              </div>
              <Progress className="mt-2 h-2" value={100 - (countdown / 35) * 100} />
              <div className="mt-3 grid gap-2 text-xs text-indigo-100/80">
                {featuredPowerMoves.map((move) => (
                  <div key={move} className="flex items-center gap-2 rounded-md bg-black/30 px-3 py-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/70 text-[10px] font-bold text-white">
                      •
                    </span>
                    <span>{move}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="flex-1 min-w-[180px] rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90"
                onClick={() => {
                  setShow(false);
                  try { trackEvent('exit_intent_resume'); } catch {}
                }}
              >
                Resume the streak
              </Link>
              <Link
                href="/pricing?source=exit-playbook"
                className="flex-1 min-w-[180px] rounded-lg border border-indigo-400/60 px-5 py-3 text-center text-sm font-semibold text-indigo-200 hover:bg-indigo-500/10"
                onClick={() => {
                  try { trackEvent('exit_intent_cta'); } catch {}
                }}
              >
                Unlock Pro Power Moves
              </Link>
              <button
                onClick={() => setShow(false)}
                className="w-full rounded-lg px-5 py-2 text-xs text-indigo-200/60 hover:text-indigo-100"
              >
                I’ll risk the drawdown
              </button>
            </div>
          </div>

          <div className="relative flex flex-col rounded-xl border border-indigo-500/20 bg-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">Live pulse</p>
            <div className="mt-4 space-y-3 text-sm text-indigo-100/90">
              <div className="flex items-center justify-between">
                <span>AI Forecast queue</span>
                <span className="font-semibold text-white">+3 pending</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Risk guard health</span>
                <span className="font-semibold text-emerald-300">Optimal</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Prop simulator</span>
                <span className="font-semibold text-white">2 power-ups</span>
              </div>
            </div>
            <div className="mt-auto rounded-lg bg-indigo-500/15 p-4 text-xs text-indigo-100/90">
              <p className="font-semibold text-indigo-100">Pro Tip</p>
              <p className="mt-1">Elite members who keep a 5-day streak lift ROI by <span className="font-bold text-white">31%</span>. Stick around and let Tradia keep you in flow.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
