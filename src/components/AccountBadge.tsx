"use client";

import React, { useMemo } from "react";
import { useTrade } from "@/context/TradeContext";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  compact?: boolean;
};

export default function AccountBadge({ className = "", compact = false }: Props) {
  const { trades = [] } = useTrade() as any;

  const { label, amount, currency } = useMemo(() => {
    const totalPnl = trades.reduce((s: number, t: any) => s + (Number(t?.pnl ?? t?.profit ?? t?.netpl) || 0), 0);
    return { label: "Trading Account", amount: totalPnl, currency: "USD" };
  }, [trades]);

  const text = `${label} • ${currency} $${amount.toFixed(2)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-gray-800/60 text-gray-200",
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className
      )}
      title="Trading account balance"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
      {text}
    </span>
  );
}
