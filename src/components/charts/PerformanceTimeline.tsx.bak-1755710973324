// PerformanceTimeline.tsx
"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface Props {
  trades: { profit?: number; closeTime?: string }[];
}

export default function PerformanceTimeline({ trades }: Props) {
  let cumulative = 0;
  const timeline = trades.map(t => {
    cumulative += t.profit ?? 0;
    return cumulative;
  });

  const labels = trades.map(t => t.closeTime?.split("T")[0] ?? "");

  return (
    <div className="p-4 border rounded-xl">
      <h2 className="text-lg font-semibold mb-4">Performance Timeline</h2>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Cumulative P/L",
              data: timeline,
              borderColor: "#3b82f6",
              fill: false,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: { legend: { position: "top" } },
        }}
      />
    </div>
  );
}
