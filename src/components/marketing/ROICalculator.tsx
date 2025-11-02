"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

export default function ROICalculator() {
  const [trades, setTrades] = useState<string>("");
  const [winRate, setWinRate] = useState<string>("");
  const [result, setResult] = useState<string>("");

  const onCalc = () => {
    const t = Math.max(0, Math.floor(Number(trades) || 0));
    const w = Math.min(100, Math.max(0, Number(winRate) || 0));
    // Simple illustrative calc: potential +15% relative lift on win rate
    const potential = Math.round(w * 1.15);
    const msg = `Potential +15% win-rate lift → ~${potential}% (from ${w}%) over ${t} trades.`;
    setResult(msg);
    try { trackEvent('feature_used', { featureName: 'roi_calculator', trades: t, win_rate: w }); } catch {}
  };

  return (
    <div className="mt-6 w-full max-w-xl rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-gray-300 mb-3">Quick ROI estimator</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="number"
          min={0}
          value={trades}
          onChange={(e) => setTrades(e.target.value)}
          placeholder="Avg monthly trades"
          className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white placeholder-gray-400"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={winRate}
          onChange={(e) => setWinRate(e.target.value)}
          placeholder="Current win rate %"
          className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white placeholder-gray-400"
        />
        <button
          onClick={onCalc}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          Calculate
        </button>
      </div>
      {result && <div className="mt-3 text-sm text-indigo-300">{result}</div>}
    </div>
  );
}

