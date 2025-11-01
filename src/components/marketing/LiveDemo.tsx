"use client";

import { useState } from "react";

export default function LiveDemo(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [gated, setGated] = useState(true);
  const [pair, setPair] = useState("EUR/USD");
  const [direction, setDirection] = useState("Buy");
  const [price, setPrice] = useState("1.1000");
  const [output, setOutput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const unlock = async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    try {
      setSubmitting(true);
      await fetch("/api/marketing/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "live_demo" }),
      });
      setGated(false);
    } catch {
      setGated(false);
    } finally {
      setSubmitting(false);
    }
  };

  const runDemo = () => {
    const patterns = [
      "Bullish hammer — 80% win potential",
      "Breakout pullback — 72% RR efficiency",
      "Mean reversion window — 65% confidence",
    ];
    const idx = Math.floor(Math.random() * patterns.length);
    setOutput(
      `Pattern: ${patterns[idx]}\nEntry: ${direction} ${pair} @ ${price}\nAI Hint: Consider SL 1.0985, TP 1.1040 (R~1.8).`
    );
  };

  return (
    <div className="w-full max-w-xl p-5 rounded-2xl border border-gray-800 bg-[#0a1222]">
      <h3 className="text-xl font-bold text-white">Interactive Demo</h3>
      <p className="text-gray-300 mt-1 text-sm">
        Try a sample trade and see an instant AI summary.
      </p>

      {gated ? (
        <div className="mt-4">
          <label className="block text-sm text-gray-300 mb-1">Work email</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white placeholder-gray-400"
              placeholder="you@trader.com"
            />
            <button
              disabled={submitting}
              onClick={unlock}
              className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {submitting ? "Unlocking..." : "Unlock Demo"}
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">Leads first 50 get 1 month free.</div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white"
            />
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white"
            >
              <option>Buy</option>
              <option>Sell</option>
            </select>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white"
            />
          </div>
          <button onClick={runDemo} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            Generate AI Summary
          </button>
          {output && (
            <pre className="whitespace-pre-wrap text-sm text-indigo-200 bg-black/20 border border-white/10 rounded-md p-3">{output}</pre>
          )}
        </div>
      )}
    </div>
  );
}

