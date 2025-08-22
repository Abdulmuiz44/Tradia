// src/components/charts/TradeChart.tsx
"use client";

// @ts-expect-error: react-plotly.js has no types
import Plot from "react-plotly.js";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Spinner from "@/components/ui/spinner";

/**
 * Dynamically load react-plotly.js on client only.
 * We cast to any so TypeScript doesn't require plotly.js types to be present.
 * Install `react-plotly.js` + a plotly bundle (e.g. plotly.js-basic-dist) for full runtime support.
 */
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as unknown as React.ComponentType<any>;

type TradePoint = {
  openTime: string | number | Date;
  profit: number | string;
};

interface TradeChartProps {
  trades: ReadonlyArray<TradePoint>;
}

function parseTime(v: string | number | Date): string | number {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    // treat 10-digit numbers as seconds, 13-digit as ms
    const s = String(v);
    if (/^\d{10}$/.test(s)) return new Date(Number(v) * 1000).toISOString();
    return new Date(Number(v)).toISOString();
  }
  // string
  const n = Number(v);
  if (!Number.isNaN(n) && /^\d+$/.test(String(v))) {
    // numeric string timestamp
    const s = String(v);
    if (/^\d{10}$/.test(s)) return new Date(Number(v) * 1000).toISOString();
    if (/^\d{13}$/.test(s)) return new Date(Number(v)).toISOString();
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}

export default function TradeChart({ trades }: TradeChartProps) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      setData([]);
      return;
    }

    // Build series
    const x = trades.map((t) => parseTime(t.openTime));
    const y = trades.map((t) => {
      const p = t.profit;
      if (typeof p === "number") return p;
      if (typeof p === "string") {
        const n = Number(p.replace(/[^0-9.\-+eE]/g, ""));
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    });

    const series = {
      x,
      y,
      type: "scatter",
      mode: "lines+markers",
      marker: { color: "#10b981" },
      line: { shape: "linear" },
      name: "Profit",
      hovertemplate: "%{y:.2f}<extra></extra>",
    };

    setData([series]);
  }, [trades]);

  if (!Array.isArray(trades) || trades.length === 0) {
    return <Spinner />;
  }

  const layout: any = {
    title: "Trade Profit Over Time",
    xaxis: { title: "Open Time", type: "date", automargin: true },
    yaxis: { title: "Profit ($)" },
    autosize: true,
    margin: { l: 50, r: 20, t: 40, b: 80 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
  };

  const config = { responsive: true, displayModeBar: false };

  return (
    <div className="w-full h-96">
      {/* if Plot fails to load at runtime, React will show nothing — ensure react-plotly.js & a plotly bundle are installed */}
      <Plot data={data} layout={layout} config={config} useResizeHandler style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
