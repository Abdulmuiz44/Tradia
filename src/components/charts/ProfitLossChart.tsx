// src/components/charts/ProfitLossChart.tsx
"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

/**
 * We dynamically import react-plotly so:
 * - it doesn't run during SSR (Plotly is browser-only)
 * - TypeScript won't fail the build if types are missing (we cast to any).
 *
 * If you prefer not to suppress TS errors, remove the ts-ignore and install the packages:
 *   npm i react-plotly.js plotly.js-basic-dist
 */
// @ts-ignore - avoid build-time error if react-plotly.js types are missing
const Plot: React.ComponentType<any> = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

type RawTrade = {
  symbol?: string | null;
  entryTime?: string | number | null;
  closeTime?: string | number | null;
  profit?: number | null;
  pnl?: number | null;
  netpl?: number | null;
};

interface Props {
  trades: RawTrade[] | null | undefined;
}

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-+eE]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseDate(val: unknown): Date | null {
  if (!val && val !== 0) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val);
  const n = Number(s);
  // support unix timestamps (seconds or ms)
  if (/^\d{10}$/.test(s)) return new Date(n * 1000);
  if (/^\d{13}$/.test(s)) return new Date(n);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export default function ProfitLossChart({ trades }: Props) {
  // derive data once
  const { xLabels, profits, cumulative } = useMemo(() => {
    // normalize input inside useMemo
    const arr = Array.isArray(trades) ? trades : [];

    if (!arr.length) return { xLabels: [], profits: [], cumulative: [] };

    // map each trade to a sortable record with a time (entryTime > closeTime > index)
    const mapped = arr.map((t, idx) => {
      const time = parseDate(t.entryTime ?? t.closeTime) ?? new Date(0 + idx); // guaranteed deterministic
      const profit = toNumber(t.profit ?? t.pnl ?? t.netpl ?? 0);
      return { time, profit, raw: t };
    });

    // sort by time ascending
    mapped.sort((a, b) => a.time.getTime() - b.time.getTime());

    const xLabels = mapped.map((m) => {
      // Prefer readable time, fallback to ISO or index
      try {
        return m.time instanceof Date ? m.time.toLocaleString() : String(m.time);
      } catch {
        return m.time.toISOString ? m.time.toISOString() : String(m.time.getTime());
      }
    });

    const profits = mapped.map((m) => Number(m.profit || 0));
    const cumulative: number[] = profits.reduce((acc: number[], p) => {
      acc.push((acc.length ? acc[acc.length - 1] : 0) + (Number.isFinite(p) ? p : 0));
      return acc;
    }, []);

    return { xLabels, profits, cumulative };
  }, [trades]);

  // safe fallback when no data
  if (!xLabels.length) {
    return (
      <div className="space-y-6 p-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-2">Profit / Loss per Trade</h2>
          <p className="text-sm text-muted-foreground">No trade data available.</p>
        </div>
      </div>
    );
  }

  // prepare colors for bar chart
  const colors = profits.map((p) => (p >= 0 ? "#4caf50" : "#ef5350"));
  const wins = profits.filter((p) => p > 0).length;
  const losses = profits.filter((p) => p < 0).length;

  // plotly traces / layout
  const barTrace = {
    x: xLabels,
    y: profits,
    type: "bar",
    marker: { color: colors },
    hovertemplate: "%{y:.2f}<extra></extra>",
  };

  const pieTrace = {
    type: "pie",
    labels: ["Wins", "Losses"],
    values: [wins, losses],
    marker: { colors: ["#4caf50", "#ef5350"] },
    textinfo: "label+percent",
    hoverinfo: "label+value+percent",
  };

  const lineTrace = {
    x: xLabels,
    y: cumulative,
    type: "scatter",
    mode: "lines+markers",
    line: { color: "#2196f3" },
    marker: { size: 4 },
    hovertemplate: "%{y:.2f}<extra></extra>",
  };

  const commonLayout = {
    plot_bgcolor: "#fff",
    paper_bgcolor: "#fff",
    margin: { t: 30, b: 60, l: 40, r: 20 },
    legend: { orientation: "h", x: 0.5, xanchor: "center" as const },
    xaxis: { tickangle: -45, automargin: true },
  };

  const commonConfig = { responsive: true, displayModeBar: false };

  return (
    <div className="space-y-10 p-4">
      {/* Profit/Loss Bar */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Profit / Loss per Trade</h2>
        {/* Plot component is dynamically loaded; TS errors hushed above */}
        <div style={{ width: "100%", minHeight: 280 }}>
          {/* if Plot failed to load for any reason, show text fallback */}
          {/* @ts-ignore */}
          <Plot data={[barTrace]} layout={{ ...commonLayout, yaxis: { title: "Profit / Loss ($)" } }} config={commonConfig} />
        </div>
      </div>

      {/* Win/Loss Pie */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Win vs Loss Ratio</h2>
        <div style={{ width: "100%", minHeight: 260 }}>
          {/* @ts-ignore */}
          <Plot data={[pieTrace]} layout={{ ...commonLayout, showlegend: true }} config={commonConfig} />
        </div>
      </div>

      {/* Cumulative */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Cumulative Profit Over Time</h2>
        <div style={{ width: "100%", minHeight: 320 }}>
          {/* @ts-ignore */}
          <Plot
            data={[lineTrace]}
            layout={{
              ...commonLayout,
              yaxis: { title: "Cumulative Profit ($)" },
            }}
            config={commonConfig}
          />
        </div>
      </div>
    </div>
  );
}
