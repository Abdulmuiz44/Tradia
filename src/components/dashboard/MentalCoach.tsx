"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";
import { useTrade } from "@/context/TradeContext";
import { analyzeTradeSentiment } from "@/lib/trade-sentiment";
import { Brain, Coffee, Award, Zap, Smile } from "lucide-react";
import FeatureLock from "@/components/FeatureLock";

type BreakState = {
  running: boolean;
  endsAt?: number; // epoch ms
};

export default function MentalCoach(): React.ReactElement | null {
  const { plan } = useUser();
  const { trades = [] } = useTrade();

  const sentiment = useMemo(() => analyzeTradeSentiment(trades as any), [trades]);
  const [breakState, setBreakState] = useState<BreakState>({ running: false });
  const [remaining, setRemaining] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);

  // load points from server
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/coach/points', { cache: 'no-store' });
        if (res.ok) { const j = await res.json(); setPoints(Number(j.points || 0)); }
      } catch {}
    })();
  }, []);

  // Countdown ticker
  useEffect(() => {
    const id = setInterval(() => {
      if (breakState.running && breakState.endsAt) {
        const diff = Math.max(0, breakState.endsAt - Date.now());
        setRemaining(diff);
        if (diff <= 0) {
          clearInterval(id);
          setBreakState({ running: false });
          // award points (plus/pro/elite only)
          const award = plan === 'elite' ? 30 : plan === 'pro' ? 20 : plan === 'plus' ? 10 : 0;
          if (award > 0) {
            (async () => {
              try {
                const res = await fetch('/api/coach/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'add', value: award }) });
                if (res.ok) {
                  const j = await res.json();
                  setPoints(Number(j.points || 0));
                  alert(`Nice job taking a break. +${award} points!`);
                }
              } catch {}
            })();
          }
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [breakState, plan, points]);

  const startBreak = (minutes = 10) => {
    setBreakState({ running: true, endsAt: Date.now() + minutes * 60 * 1000 });
  };

  const formatRemaining = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const quickMoods = ["Calm", "Focused", "Tired", "Revengeful", "Overconfident", "Distracted", "Confident"];
  const stampMood = (m: string) => {
    try {
      const logs = JSON.parse(localStorage.getItem('coach_moods') || '[]');
      logs.push({ at: new Date().toISOString(), mood: m });
      localStorage.setItem('coach_moods', JSON.stringify(logs));
    } catch {}
  };

  // Only render if we have trades or coaching is needed
  if (!trades || trades.length === 0) return null;

  const baseCard = (
    <div className="rounded-xl p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-indigo-500" />
          <div>
            <div className="font-semibold">AI Mental Coach</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{sentiment.suggestion}</div>
            {(sentiment.lossStreak >= 3 || sentiment.overtrading || sentiment.revengeRisk) && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {sentiment.lossStreak >= 3 && <span className="mr-2">Loss streak: {sentiment.lossStreak}</span>}
                {sentiment.overtrading && <span className="mr-2">High activity</span>}
                {sentiment.revengeRisk && <span>Revenge risk</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!breakState.running ? (
            <button onClick={() => startBreak(10)} className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-500 inline-flex items-center gap-1">
              <Coffee className="h-4 w-4" /> Take 10‑min break
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 text-sm border border-yellow-500/30">
              Break: {formatRemaining(remaining)}
            </div>
          )}
        </div>
      </div>

      {/* Quick mood stamps (all plans) */}
      <div className="mt-3 flex flex-wrap gap-2">
        {quickMoods.map((m) => (
          <button key={m} onClick={() => stampMood(m)} className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20">
            <Smile className="h-3.5 w-3.5 inline mr-1" /> {m}
          </button>
        ))}
      </div>
    </div>
  );

  const plusBlock = (
    <div className="rounded-xl p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-indigo-500" /> Guided reset (Plus)</div>
      <ul className="mt-2 text-sm list-disc pl-5 text-gray-700 dark:text-gray-300">
        <li>1‑minute mindful breathing</li>
        <li>Review last loss: was it within plan?</li>
        <li>Confirm risk per trade ≤ your rule</li>
      </ul>
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Complete the 10‑min break to earn points.</div>
    </div>
  );

  const proBlock = (
    <div className="rounded-xl p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-indigo-500" /> Coaching upgrades (Pro)</div>
      <ul className="mt-2 text-sm list-disc pl-5 text-gray-700 dark:text-gray-300">
        <li>AI journal prompts for post‑loss review</li>
        <li>Daily target checklist & streak tracking</li>
        <li>Extra rewards for consistency</li>
      </ul>
    </div>
  );

  return (
    <div className="space-y-3">
      {baseCard}
      {/* Gated enhancements */}
      <FeatureLock requiredPlan="plus">
        {plusBlock}
      </FeatureLock>
      <FeatureLock requiredPlan="pro">
        {proBlock}
      </FeatureLock>

      {(plan === 'plus' || plan === 'pro' || plan === 'elite') && (
        <div className="text-xs text-gray-600 dark:text-gray-400">Coach points: <strong>{points}</strong></div>
      )}
    </div>
  );
}
