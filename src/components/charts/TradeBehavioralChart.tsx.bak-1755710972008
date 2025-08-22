// src/components/charts/TradeBehavioralChart.tsx
"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface Trade {
  symbol: string;
}

interface TradeBehavioralChartProps {
  trades: Trade[];
}

const COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#C084FC"];

export default function TradeBehavioralChart({ trades }: TradeBehavioralChartProps) {
  const count: Record<string, number> = {};
  trades.forEach((t) => {
    count[t.symbol] = (count[t.symbol] || 0) + 1;
  });
  const data = Object.entries(count).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return <div className="text-zinc-500 py-6 text-center">No behavior data</div>;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm w-full h-[300px]">
      <h3 className="mb-2 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
        Trade Symbol Distribution
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={80}
            innerRadius={40}
            label
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend layout="vertical" verticalAlign="middle" align="right" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
