"use client";

import React, { useEffect, useState } from "react";

export default function AIForecastWidget({ userId, symbol = "BTCUSD", apiBase = "http://localhost:4001" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const resp = await fetch(`${apiBase}/api/forecast/${encodeURIComponent(userId || 'unknown')}?symbol=${encodeURIComponent(symbol)}`);
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}));
          throw new Error(j?.message || `Request failed: ${resp.status}`);
        }
        const j = await resp.json();
        if (mounted) setData(j);
      } catch (e) {
        if (mounted) setError(String(e.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [userId, symbol, apiBase]);

  if (loading) {
    return (
      <div className="p-4 rounded border border-white/10">
        <div className="animate-pulse">Loading AI forecast…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded border border-red-400/40 bg-red-500/10 text-red-200">
        <div className="font-medium mb-1">Forecast unavailable</div>
        <div className="text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3 p-4 rounded border border-white/10 bg-white/5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Symbol</div>
        <div className="font-semibold">{data.symbol}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Predicted Price (next day)</div>
        <div className="text-xl font-bold">${Number(data.forecast).toFixed(2)}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Confidence</div>
        <div className="font-medium">{Math.round(Number(data.confidence) * 100)}%</div>
      </div>
      <div className="text-sm text-blue-200/90">{data.personalizedInsight}</div>
      <div className="text-xs text-muted-foreground">Generated at {new Date(data.timestamp).toLocaleString()}</div>
      <div className="text-[11px] text-amber-300/90">AI forecasts are probabilistic — not financial advice.</div>
    </div>
  );
}

