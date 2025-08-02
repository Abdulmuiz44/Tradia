"use client"

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface TradeChartProps { trades: any[] };

export default function TradeChart({ trades }: TradeChartProps) { const [data, setData] = useState<any[]>([]);

useEffect(() => { if (trades && trades.length > 0);

{ const time = trades.map(t => t.openTime);
const profit = trades.map(t => t.profit);

setData([
    {
      x: time,
      y: profit,
      type: "scatter",
      mode: "lines+markers",
      marker: { color: "green" },
      name: "Profit"
    }
  ])
}

}, [trades])

if (!trades || trades.length === 0) return <Spinner />

return ( <div className="w-full h-96"> <Plot data={data} layout={{ title: "Trade Profit Over Time", xaxis: { title: "Open Time" }, yaxis: { title: "Profit ($)" }, autosize: true, }} useResizeHandler style={{ width: "100%", height: "100%" }} /> </div> ) }

