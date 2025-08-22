"use client";
import { useState } from "react";

export default function PositionSizing() {
  const [accountSize, setAccountSize] = useState(1000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopLossPips, setStopLossPips] = useState(50);

  const riskAmount = (accountSize * riskPercent) / 100;
  const positionSize = stopLossPips !== 0 ? riskAmount / stopLossPips : 0;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Position Sizing Calculator</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1">Account Size ($)</label>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(parseFloat(e.target.value))}
            className="w-full p-2 rounded border bg-white dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block mb-1">Risk %</label>
          <input
            type="number"
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
            className="w-full p-2 rounded border bg-white dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block mb-1">Stop Loss (pips)</label>
          <input
            type="number"
            value={stopLossPips}
            onChange={(e) => setStopLossPips(parseFloat(e.target.value))}
            className="w-full p-2 rounded border bg-white dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="mt-4">
        <p>
          <strong>Risk Amount:</strong> ${riskAmount.toFixed(2)}
        </p>
        <p>
          <strong>Recommended Position Size:</strong> {positionSize.toFixed(2)} lots
        </p>
      </div>
    </div>
  );
}
