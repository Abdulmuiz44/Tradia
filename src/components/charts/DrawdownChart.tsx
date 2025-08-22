// src/components/charts/DrawdownChart.tsx
"use client";

import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
// If TypeScript complains here because chart.js isn't installed or its types aren't present,
// the next line silences the compiler for that specific import. Install chart.js to fix properly.
// @ts-ignore
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// register necessary chart.js pieces (safe to call even if previously registered)
try {
  ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);
} catch {
  // ignore registration errors (if chart.js missing at runtime this will still throw later)
}

type Trade = {
  profit?: number | null; // common field name used in your code
  pnl?: number | null;
  netpl?: number | null;
  time?: string | null;
  openTime?: string | number | null;
  closeTime?: string | number | null;
};

interface Props {
  trades: Trade[];
}

/**
 * DrawdownChart
 * - Builds an equity curve from trade.profit / pnl / netpl
 * - Computes running peak and drawdown (equity - peak)
 * - Renders a filled line chart showing drawdown (negative or zero)
 */
export default function DrawdownChart({ trades }: Props) {
  const { labels, ddSeries } = useMemo(() => {
    let equity = 0;
    // start peak at -Infinity so the first equity becomes the peak
    let peak = -Infinity;
    const labels: string[] = [];
    const ddSeries: number[] = [];

    if (!Array.isArray(trades) || trades.length === 0) {
      return { labels: [], ddSeries: [] };
    }

    for (let i = 0; i < trades.length; i++) {
      const t = trades[i] ?? ({} as Trade);
      const profit =
        Number(t.profit ?? t.pnl ?? t.netpl ?? 0) || 0;

      equity += profit;
      peak = Math.max(peak, equity);
      // drawdown = equity - peak (will be 0 or negative)
      const dd = equity - peak;
      ddSeries.push(Number(Number.isFinite(dd) ? dd : 0));

      // choose a reasonable label: prefer provided time, else index
      let label = `${i + 1}`;
      if (typeof t.time === "string" && t.time.trim()) {
        label = t.time;
      } else if (t.closeTime || t.openTime) {
        label = String(t.closeTime ?? t.openTime);
      }
      labels.push(label);
    }

    return { labels, ddSeries };
  }, [trades]);

  const data = {
    labels,
    datasets: [
      {
        label: "Drawdown",
        data: ddSeries,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            const v = context.raw;
            if (typeof v === "number") return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
            return String(v);
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        ticks: {
          callback: function (val: any) {
            // show dollar formatting for numeric ticks
            if (typeof val === "number") return `$${val}`;
            return String(val);
          },
        },
      },
    },
  };

  return (
    <div className="p-4 border rounded-xl bg-white/4">
      <h2 className="text-lg font-semibold mb-4">Drawdown Chart</h2>
      <div style={{ height: 260 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
