"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";

type Trade = {
  strategy?: string;
};

interface StrategyTaggingProps {
  trades: Trade[];
}

const COLORS = ["#34D399", "#60A5FA", "#FBBF24", "#F87171", "#C084FC", "#818CF8"];

const defaultStrategies = [
  "Breakout",
  "Trendline",
  "Scalping",
  "SMC",
  "Swing",
  "News",
  "Reversal",
  "Unspecified",
];

const StrategyTagging: React.FC<StrategyTaggingProps> = ({ trades }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-500 dark:text-zinc-400">
        No strategy tagging data available.
      </div>
    );
  }

  const strategyCount: Record<string, number> = {};
  defaultStrategies.forEach((strategy) => (strategyCount[strategy] = 0));

  trades.forEach((trade) => {
    const strat = trade.strategy || "Unspecified";
    strategyCount[strat] = (strategyCount[strat] || 0) + 1;
  });

  const strategyData = Object.entries(strategyCount).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="bg-white bg-[#0f1319] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
        Strategy Tagging Overview
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={strategyData}
          margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-30}
            textAnchor="end"
            height={60}
            interval={0}
            stroke="#888"
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {strategyData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StrategyTagging;
