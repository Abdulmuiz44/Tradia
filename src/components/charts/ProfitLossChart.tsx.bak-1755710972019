// src/components/dashboard/ProfitLossChart.tsx
"use client";

import React from "react";
import Plot from "react-plotly.js";

interface Trade {
  symbol: string;
  entryTime: string;
  closeTime: string;
  profit: number;
}

interface Props {
  trades: Trade[];
}

export default function ProfitLossChart({ trades }: Props) {
  if (!trades.length) return <p>No trade data available.</p>;

  // Sort trades by time
  const sorted = [...trades].sort(
    (a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
  );

  const xLabels = sorted.map((t) => new Date(t.entryTime).toLocaleString());
  const profits = sorted.map((t) => t.profit);
  const colors = profits.map((p) => (p >= 0 ? "#4caf50" : "#ef5350")); // Green for win, red for loss

  const wins = profits.filter((p) => p > 0).length;
  const losses = profits.filter((p) => p < 0).length;

  const cumulativeProfits = profits.reduce<number[]>((acc, p, i) => {
    acc.push((acc[i - 1] || 0) + p);
    return acc;
  }, []);

  return (
    <div className="space-y-10 p-4">
      {/* 📊 Profit/Loss Bar Chart */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Profit / Loss per Trade</h2>
        <Plot
          data={[
            {
              x: xLabels,
              y: profits,
              type: "bar",
              marker: { color: colors },
            },
          ]}
          layout={{
            xaxis: { title: "Trade Time", tickangle: -45 },
            yaxis: { title: "Profit / Loss ($)" },
            plot_bgcolor: "#fff",
            paper_bgcolor: "#fff",
            margin: { t: 30, b: 60 },
          }}
          config={{ responsive: true }}
        />
      </div>

      {/* 🥧 Win/Loss Pie Chart */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Win vs Loss Ratio</h2>
        <Plot
          data={[
            {
              type: "pie",
              labels: ["Wins", "Losses"],
              values: [wins, losses],
              marker: {
                colors: ["#4caf50", "#ef5350"],
              },
              textinfo: "label+percent",
              insidetextorientation: "radial",
            },
          ]}
          layout={{
            showlegend: true,
            plot_bgcolor: "#fff",
            paper_bgcolor: "#fff",
          }}
          config={{ responsive: true }}
        />
      </div>

      {/* 📈 Cumulative Profit Line Chart */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Cumulative Profit Over Time</h2>
        <Plot
          data={[
            {
              x: xLabels,
              y: cumulativeProfits,
              type: "scatter",
              mode: "lines+markers",
              line: { color: "#2196f3" },
            },
          ]}
          layout={{
            xaxis: { title: "Trade Time", tickangle: -45 },
            yaxis: { title: "Cumulative Profit ($)" },
            plot_bgcolor: "#fff",
            paper_bgcolor: "#fff",
            margin: { t: 30, b: 60 },
          }}
          config={{ responsive: true }}
        />
      </div>
    </div>
  );
}
