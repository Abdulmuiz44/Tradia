"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type TradingAccount = {
  id: string;
  name: string;
  currency: string;
  initial_balance: number;
  current_balance?: number | null;
  mode: 'manual' | 'broker';
  broker?: string | null;
  credential_id?: string | null;
};

type Ctx = {
  accounts: TradingAccount[];
  selectedId: string | null;
  selected?: TradingAccount | null;
  refresh: () => Promise<void>;
  select: (id: string | null) => void;
  createManual: (input: { name: string; currency?: string; initial_balance: number }) => Promise<void>;
};

const TradingAccountContext = createContext<Ctx | null>(null);

export function TradingAccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const manualRes = await fetch('/api/trading-accounts', { cache: 'no-store' });
      const manuals = (await manualRes.json()).accounts || [];
      const list: TradingAccount[] = manuals.map((m: any) => ({
        id: String(m.id), name: m.name, currency: m.currency || 'USD', initial_balance: Number(m.initial_balance || 0),
        current_balance: m.current_balance ?? null, mode: 'manual'
      }));
      setAccounts(list);
      // ensure selection
      const persisted = typeof window !== 'undefined' ? localStorage.getItem('selected-trading-account') : null;
      const initial = (persisted && list.find(a => a.id === persisted)) ? persisted : (list[0]?.id ?? null);
      setSelectedId(initial);
      if (typeof window !== 'undefined') localStorage.setItem('selected-trading-account', initial ?? '');
    } catch {
      setAccounts([]);
    }
  };

  const select = (id: string | null) => {
    setSelectedId(id);
    try { if (typeof window !== 'undefined') localStorage.setItem('selected-trading-account', id ?? ''); } catch {}
  };

  const createManual: Ctx['createManual'] = async (input) => {
    await fetch('/api/trading-accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
    });
    await refresh();
  };

  useEffect(() => { void refresh(); }, []);

  const selected = useMemo(() => accounts.find(a => a.id === selectedId) ?? null, [accounts, selectedId]);

  const value: Ctx = { accounts, selectedId, selected, refresh, select, createManual };
  return <TradingAccountContext.Provider value={value}>{children}</TradingAccountContext.Provider>;
}

export function useTradingAccount() {
  const ctx = useContext(TradingAccountContext);
  if (!ctx) throw new Error('useTradingAccount must be used within TradingAccountProvider');
  return ctx;
}

