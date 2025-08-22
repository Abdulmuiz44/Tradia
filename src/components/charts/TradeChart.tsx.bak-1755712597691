// src/components/charts/TradeChart.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Spinner from "@/components/ui/spinner";
import type { Data as PlotlyData, Layout as PlotlyLayout } from "plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type TradePoint = {
  openTime: string | number | Date;
  profit: number | string;
};

interface TradeChartProps {
  trades: ReadonlyArray<TradePoint>;
}

export default function TradeChart({ trades }: TradeChartProps): JSX.Element {
  const [data, setData] = useState<PlotlyData[]>([]);

  useEffect(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      setData([]);
      return;
    }

    const time = trades.map((t) => t.openTime);
    const profit = trades.map((t) => Number(t.profit));

    const series: PlotlyData = {
      x: time,
      y: profit,
      type: "scatter",
      mode: "lines+markers",
      marker: { color: "green" },
      name: "Profit",
    };

    setData([series]);
  }, [trades]);

  if (!Array.isArray(trades) || trades.length === 0) return <Spinner />;

  const layout: Partial<PlotlyLayout> = {
    title: "Trade Profit Over Time",
    xaxis: { title: "Open Time" },
    yaxis: { title: "Profit ($)" },
    autosize: true,
    margin: { l: 50, r: 20, t: 40, b: 40 },
  };

  return (
    <div className="w-full h-96">
      <Plot
        data={data}
        layout={layout}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
