// src/context/TradeContext.tsx
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useContext,
} from "react";
import { Trade } from "@/types/trade";

/**
 * TradeContext types
 */
interface SyncResult {
  success: boolean;
  account?: unknown;
  trades?: Trade[];
  positions?: unknown[];
  error?: string;
}

interface TradeContextProps {
  trades: Trade[];
  filteredTrades: Trade[];
  addTrade: (newTrade: Trade) => void;
  updateTrade: (updatedTrade: Trade) => void;
  deleteTrade: (id: string) => void;
  setTradesFromCsv: (csvTrades: unknown[]) => void;
  importTrades: (trades: unknown[]) => void;
  filterTrades: (fromDate: Date, toDate: Date) => void;
  refreshTrades: () => Promise<void>;
  syncFromMT5: (
    login: string,
    password: string,
    server: string,
    backendUrl?: string
  ) => Promise<SyncResult>;
  clearTrades: () => void;
}

export const TradeContext = createContext<TradeContextProps>({
  trades: [],
  filteredTrades: [],
  addTrade: () => {},
  updateTrade: () => {},
  deleteTrade: () => {},
  setTradesFromCsv: () => {},
  importTrades: () => {},
  filterTrades: () => {},
  refreshTrades: async () => {},
  syncFromMT5: async () => ({ success: false }),
  clearTrades: () => {},
});

function getRandomUUID(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto && typeof g.crypto.randomUUID === "function") {
    try {
      return g.crypto.randomUUID();
    } catch {
      // fall through to fallback
    }
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const TradeProvider = ({ children }: { children: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);

  const generateUniqueId = useCallback((existingIds?: Set<string>) => {
    let id = getRandomUUID();
    if (existingIds) {
      while (existingIds.has(id)) {
        id = getRandomUUID();
      }
    }
    return id;
  }, []);

  // Safe conversion helpers
  const toNumberSafe = (v: unknown): number => {
    if (v === undefined || v === null || v === "") return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") {
      const cleaned = v.replace(/[^0-9\.\-eE]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    if (typeof v === "bigint") return Number(v);
    return 0;
  };

  const toStringSafe = (v: unknown): string => {
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
      return String(v);
    }
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };

  const toISOStringSafe = (v: unknown): string => {
    if (v === undefined || v === null || v === "") return "";
    if (v instanceof Date) {
      return isNaN(v.getTime()) ? "" : v.toISOString();
    }
    if (typeof v === "number") {
      const s = String(v);
      if (/^\d{10}$/.test(s)) return new Date(v * 1000).toISOString();
      if (/^\d{13}$/.test(s)) return new Date(v).toISOString();
      const d = new Date(v);
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    if (typeof v === "string") {
      if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000).toISOString();
      if (/^\d{13}$/.test(v)) return new Date(Number(v)).toISOString();
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toISOString();
    }
    const s = toStringSafe(v);
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toISOString();
  };

  // Normalize a broker trade (unknown) into our Trade shape
  const normalizeBrokerTrade = useCallback((t: unknown): Trade => {
    const rec = (t && typeof t === "object") ? (t as Record<string, unknown>) : {};

    const profitRaw =
      rec["profit"] ??
      rec["pnl"] ??
      rec["profitLoss"] ??
      rec["profit_loss"] ??
      rec["netProfit"] ??
      rec["profitAmount"] ??
      rec["netpl"] ??
      rec["net_pnl"];

    const profit = toNumberSafe(profitRaw);

    const entryRaw = rec["entryPrice"] ?? rec["entry_price"] ?? rec["open_price"] ?? rec["open"];
    const exitRaw = rec["exitPrice"] ?? rec["exit_price"] ?? rec["close_price"] ?? rec["close"];
    const lotsRaw = rec["lotSize"] ?? rec["lots"] ?? rec["volume"] ?? rec["size"] ?? rec["contractsize"];
    const openTimeRaw = rec["openTime"] ?? rec["open_time"] ?? rec["time"] ?? rec["entry_time"] ?? rec["create_time"];
    const closeTimeRaw = rec["closeTime"] ?? rec["close_time"] ?? rec["time_done"] ?? rec["exit_time"] ?? rec["close_dt"] ?? rec["close"];

    const idCandidate = rec["id"] ?? rec["ticket"] ?? rec["deal"] ?? rec["trade_id"] ?? rec["ticket_no"];

    const normalized: Partial<Trade> = {
      id: idCandidate ? toStringSafe(idCandidate) : undefined,
      symbol: toStringSafe(rec["symbol"] ?? rec["instrument"] ?? rec["ticker"] ?? "UNKNOWN"),
      entryPrice: Number(toStringSafe(entryRaw) || 0),
      stopLossPrice: Number(toStringSafe(rec["stopLossPrice"] ?? rec["stop_loss"] ?? 0)),
      takeProfitPrice: Number(toStringSafe(rec["takeProfitPrice"] ?? rec["take_profit"] ?? 0)),
      lotSize: Number(toStringSafe(lotsRaw) || 1),
      pnl: profit,
      resultRR: 0,
      openTime: toISOStringSafe(openTimeRaw),
      closeTime: toISOStringSafe(closeTimeRaw),
      outcome: profit > 0 ? "Win" : profit < 0 ? "Loss" : "Breakeven",
      duration: "",
      reasonForTrade: toStringSafe(rec["reasonForTrade"] ?? rec["reason"] ?? rec["strategy"] ?? ""),
      emotion: toStringSafe(rec["emotion"] ?? ""),
      journalNotes: toStringSafe(rec["notes"] ?? rec["note"] ?? rec["comment"] ?? ""),
    };

    return normalized as Trade;
  }, []);

  // Add / update / delete handlers
  const addTrade = useCallback(
    (newTrade: Trade) => {
      setTrades((prev) => {
        const prevIds = new Set(prev.map((p) => p.id));
        const id = newTrade.id && !prevIds.has(newTrade.id) ? newTrade.id : generateUniqueId(prevIds);
        return [...prev, { ...newTrade, id }];
      });
    },
    [generateUniqueId]
  );

  const updateTrade = useCallback((updatedTrade: Trade) => {
    setTrades((prevTrades) => prevTrades.map((trade) => (trade.id === updatedTrade.id ? { ...trade, ...updatedTrade } : trade)));
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setTrades((prevTrades) => prevTrades.filter((trade) => trade.id !== id));
  }, []);

  // setTradesFromCsv: normalize and upsert
  const setTradesFromCsv = useCallback(
    (csvTrades: unknown[]) => {
      if (!Array.isArray(csvTrades) || csvTrades.length === 0) return;

      setTrades((prev) => {
        const byId = new Map<string, Trade>();
        const prevIds = new Set<string>();
        prev.forEach((p) => {
          if (p.id) {
            byId.set(p.id, p);
            prevIds.add(p.id);
          } else {
            const newId = generateUniqueId(prevIds);
            prevIds.add(newId);
            byId.set(newId, { ...p, id: newId });
          }
        });

        const normalized = csvTrades.map((t) => normalizeBrokerTrade(t));

        normalized.forEach((nt) => {
          const ntId = nt.id ? String(nt.id) : undefined;
          if (ntId && byId.has(ntId)) {
            const existing = byId.get(ntId)!;
            byId.set(ntId, { ...existing, ...nt, id: ntId });
          } else {
            const newId = ntId && !prevIds.has(ntId) ? ntId : generateUniqueId(prevIds);
            prevIds.add(newId);
            byId.set(newId, { ...nt, id: newId });
          }
        });

        return Array.from(byId.values());
      });
    },
    [normalizeBrokerTrade, generateUniqueId]
  );

  const importTrades = useCallback((incoming: unknown[]) => {
    setTradesFromCsv(incoming);
  }, [setTradesFromCsv]);

  const clearTrades = useCallback(() => {
    setTrades([]);
    setFilteredTrades([]);
    try {
      if (typeof window !== "undefined") localStorage.removeItem("trade-history");
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const filterTrades = useCallback(
    (fromDate: Date, toDate: Date) => {
      const filtered = trades.filter((trade) => {
        const tradeDate = new Date(trade.openTime);
        if (isNaN(tradeDate.getTime())) return false;
        return tradeDate >= fromDate && tradeDate <= toDate;
      });
      setFilteredTrades(filtered);
    },
    [trades]
  );

  const refreshTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/trades", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load trades");
      const data = await res.json();
      const rows = Array.isArray(data.trades) ? data.trades : [];
      setTradesFromCsv(rows);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("refreshTrades error:", err);
    }
  }, [setTradesFromCsv]);

  const syncFromMT5 = useCallback(
    async (
      login: string,
      password: string,
      server: string,
      backendUrl?: string
    ): Promise<SyncResult> => {
      if (!login || !password || !server) {
        return { success: false, error: "Missing login, password or server." };
      }

      const backend =
        backendUrl || (process.env.NEXT_PUBLIC_MT5_BACKEND as string) || "http://127.0.0.1:5000/sync_mt5";

      const controller = new AbortController();
      const timeoutMs = 60000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const mtRes = await fetch(backend, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, password, server }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        let mtData: unknown = null;
        try {
          mtData = await mtRes.json();
        } catch {
          const txt = await mtRes.text().catch(() => "");
          return { success: false, error: `MT backend returned non-JSON: ${txt}` };
        }

        const mtObj = (mtData && typeof mtData === "object") ? (mtData as Record<string, unknown>) : {};
        if (!mtRes.ok) {
          return { success: false, error: (mtObj.detail as string) || (mtObj.error as string) || `MT backend failed: ${mtRes.status}` };
        }
        if (!(mtObj.success === true)) {
          return { success: false, error: (mtObj.detail as string) || (mtObj.error as string) || "MT backend reported failure" };
        }

        const tradesFromBackend = Array.isArray(mtObj.trades)
          ? (mtObj.trades as unknown[])
          : Array.isArray(mtObj.deals)
          ? (mtObj.deals as unknown[])
          : [];

        try {
          const importRes = await fetch("/api/mt5/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account: mtObj.account ?? { login, server }, trades: tradesFromBackend }),
          });

          let importData: unknown = null;
          try {
            importData = await importRes.json();
          } catch {
            const normalizedInMemory = tradesFromBackend.map(normalizeBrokerTrade);
            importTrades(normalizedInMemory);
            return { success: true, account: mtObj.account, trades: normalizedInMemory, error: "Imported to memory; DB import returned non-JSON" };
          }

          const importObj = (importData && typeof importData === "object") ? (importData as Record<string, unknown>) : {};
          if (!importRes.ok || importObj.success !== true) {
            const normalizedInMemory = tradesFromBackend.map(normalizeBrokerTrade);
            importTrades(normalizedInMemory);
            return { success: true, account: mtObj.account, trades: normalizedInMemory, error: importObj.error as string || "Persist to DB failed" };
          }
        } catch (impErr: unknown) {
          // eslint-disable-next-line no-console
          console.error("Error calling /api/mt5/import:", impErr);
          const normalizedInMemory = tradesFromBackend.map(normalizeBrokerTrade);
          importTrades(normalizedInMemory);
          return { success: true, account: mtObj.account, trades: normalizedInMemory, error: "Failed to persist trades to DB; shown in-memory" };
        }

        await refreshTrades();

        const normalizedTrades = tradesFromBackend.map(normalizeBrokerTrade);

        return { success: true, account: mtObj.account, trades: normalizedTrades };
      } catch (err: unknown) {
        clearTimeout(timeout);
        // eslint-disable-next-line no-console
        console.error("syncFromMT5 error:", err);
        const isAbort = typeof err === "object" && err !== null && ("name" in err ? (err as any).name === "AbortError" : false);
        if (isAbort) {
          return { success: false, error: `Request timed out after ${timeoutMs / 1000}s.` };
        }
        const msg = err instanceof Error ? err.message : String(err);
        const hint = msg.includes("Failed to fetch") || msg.includes("NetworkError")
          ? `${msg} — frontend couldn't reach the MT backend or /api/mt5/import. Check both services.`
          : msg;
        return { success: false, error: hint };
      } finally {
        clearTimeout(timeout);
      }
    },
    [refreshTrades, importTrades, normalizeBrokerTrade]
  );

  // Load initial trades (cache then refresh)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("trade-history");
        if (stored) setTrades(JSON.parse(stored) as Trade[]);
      }
    } catch {
      // ignore parse errors
    }

    refreshTrades();
  }, [refreshTrades]);

  // Persist to localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("trade-history", JSON.stringify(trades));
      }
    } catch {
      // ignore
    }
  }, [trades]);

  return (
    <TradeContext.Provider
      value={{
        trades,
        filteredTrades,
        addTrade,
        updateTrade,
        deleteTrade,
        setTradesFromCsv,
        importTrades,
        filterTrades,
        refreshTrades,
        syncFromMT5,
        clearTrades,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
};

export const useTrade = () => {
  const ctx = useContext(TradeContext);
  if (!ctx) throw new Error("useTrade must be used within a TradeProvider");
  return ctx;
};
