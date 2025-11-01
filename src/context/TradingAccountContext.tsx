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
      const [manualRes, credsRes] = await Promise.all([
        fetch('/api/trading-accounts', { cache: 'no-store' }),
        fetch('/api/mt5/credentials', { cache: 'no-store' }),
      ]);
      const manuals = (await manualRes.json()).accounts || [];
      const credsData = (await credsRes.json());
      const creds = Array.isArray(credsData?.credentials) ? credsData.credentials : [];
      const mappedCreds: TradingAccount[] = creds.map((c: any) => ({
        id: String(c.id), name: c.name || `MT5 ${c.login}`, currency: 'USD', initial_balance: 0,
        current_balance: null, mode: 'broker', broker: 'MT5', credential_id: String(c.id)
      }));
      const list: TradingAccount[] = [...manuals.map((m: any) => ({
        id: String(m.id), name: m.name, currency: m.currency || 'USD', initial_balance: Number(m.initial_balance || 0),
        current_balance: m.current_balance ?? null, mode: 'manual'
      })), ...mappedCreds];
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

