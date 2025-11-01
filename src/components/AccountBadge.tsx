"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTradingAccount } from "@/context/TradingAccountContext";
import { useTrade } from "@/context/TradeContext";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  compact?: boolean;
};

export default function AccountBadge({ className = "", compact = false }: Props) {
  const { selected } = useTradingAccount();
  const { trades = [] } = useTrade() as any;
  const [brokerBalance, setBrokerBalance] = useState<number | null>(null);
  const [brokerCurrency, setBrokerCurrency] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!selected || selected.mode !== 'broker') { setBrokerBalance(null); setBrokerCurrency(null); return; }
        const res = await fetch('/api/mt5/accounts', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
        const match = accounts.find((a: any) => String(a.server) === String((selected as any).server) && String(a.login) === String((selected as any).login));
        const info = match?.account_info || {};
        const bal = Number(info.balance ?? info.equity ?? NaN);
        if (!cancelled) {
          setBrokerBalance(Number.isFinite(bal) ? bal : null);
          setBrokerCurrency((info.currency && String(info.currency)) || null);
        }
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [selected]);

  const { label, amount, currency } = useMemo(() => {
    if (!selected) return { label: "No account", amount: null as number | null, currency: "" };
    const currency = selected.currency || "USD";
    const initial = selected.mode === 'manual' ? Number(selected.initial_balance || 0) : null;
    if (initial === null) {
      const cur = brokerCurrency || currency;
      return { label: selected.name || 'Account', amount: brokerBalance, currency: cur };
    }
    const totalPnl = trades.reduce((s: number, t: any) => s + (Number(t?.pnl ?? t?.profit ?? t?.netpl) || 0), 0);
    return { label: selected.name || 'Account', amount: initial + totalPnl, currency };
  }, [selected, trades, brokerBalance, brokerCurrency]);

  const text = amount === null ? `${label}` : `${label} • ${currency} $${amount.toFixed(2)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-gray-800/60 text-gray-200",
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className
      )}
      title="Selected trading account"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
      {text}
    </span>
  );
}
