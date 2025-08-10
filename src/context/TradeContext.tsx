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
 * TradeContextProps
 * - keeps the previous API surface so existing components still work
 * - adds syncFromMT5 and importTrades utilities
 */
interface TradeContextProps {
  trades: Trade[];
  filteredTrades: Trade[];
  addTrade: (newTrade: Trade) => void;
  updateTrade: (updatedTrade: Trade) => void;
  deleteTrade: (id: string) => void;
  setTradesFromCsv: (csvTrades: any[]) => void; // keep name for compatibility, accepts broker shaped objects
  importTrades: (trades: any[]) => void;
  filterTrades: (fromDate: Date, toDate: Date) => void;
  syncFromMT5: (
    login: string,
    password: string,
    server: string,
    backendUrl?: string
  ) => Promise<{
    success: boolean;
    account?: any;
    trades?: Trade[];
    positions?: any[];
    error?: string;
  }>;
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
  syncFromMT5: async () => ({ success: false }),
  clearTrades: () => {},
});

export const TradeProvider = ({ children }: { children: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);

  // --- Persist / Load from localStorage (client-only) ---
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem("trade-history");
      if (stored) {
        const parsed = JSON.parse(stored) as Trade[];
        setTrades(parsed);
      }
    } catch (err) {
      console.error("Failed to load trade-history from localStorage:", err);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem("trade-history", JSON.stringify(trades));
    } catch (err) {
      console.error("Failed to save trade-history to localStorage:", err);
    }
  }, [trades]);

  // --- Utility: generate unique id ---
  const generateUniqueId = useCallback((existingIds?: Set<string>) => {
    let id =
      (typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    if (existingIds) {
      while (existingIds.has(id)) {
        id =
          (typeof crypto !== "undefined" && (crypto as any).randomUUID
            ? (crypto as any).randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      }
    }
    return id;
  }, []);

  // --- Normalizer: defensive mapping of backend trade -> Trade shape ---
  const normalizeBrokerTrade = useCallback((t: any): Trade => {
    const profitRaw =
      t.profit ??
      t.pnl ??
      t.profitLoss ??
      t.profit_loss ??
      t.netProfit ??
      t.profitAmount ??
      t.netpl ??
      t.net_pnl;
    const profit =
      typeof profitRaw === "number"
        ? profitRaw
        : parseFloat(String(profitRaw ?? "0").replace(/[^0-9\.-]/g, "")) || 0;

    const entryRaw =
      t.entryPrice ??
      t.entry_price ??
      t.open_price ??
      t.open ??
      t.price_open ??
      t.openPrice ??
      t.openPriceRaw;
    const exitRaw =
      t.exitPrice ??
      t.exit_price ??
      t.close_price ??
      t.close ??
      t.price_close ??
      t.closePrice ??
      t.closePriceRaw;

    const lotsRaw =
      t.lotSize ?? t.lots ?? t.volume ?? t.size ?? t.contractsize ?? t.quantity ?? t.qty;

    const openTimeRaw =
      t.openTime ??
      t.open_time ??
      t.time_setup ??
      t.entry_time ??
      t.time ??
      t.create_time ??
      t.open_dt;
    const closeTimeRaw =
      t.closeTime ?? t.close_time ?? t.time_done ?? t.exit_time ?? t.close_dt ?? t.close;

    const idCandidate =
      t.id ??
      t.ticket ??
      t.order ??
      t.orderId ??
      t.order_id ??
      t.trade_id ??
      t.ticket_no ??
      t.ticketId ??
      t.ticket_id ??
      undefined;

    const toISOStringIfValid = (v: any) => {
      if (v === undefined || v === null || v === "") return "";
      if (typeof v === "string") {
        const maybeDate = new Date(v);
        if (!isNaN(maybeDate.getTime())) return maybeDate.toISOString();
        return v;
      }
      if (typeof v === "number") {
        if (String(v).length === 10) return new Date(v * 1000).toISOString();
        return new Date(v).toISOString();
      }
      return String(v);
    };

    const normalized: Partial<Trade> = {
      id: idCandidate ? String(idCandidate) : undefined,
      symbol: t.symbol ?? t.instrument ?? t.ticker ?? "UNKNOWN",
      entryPrice:
        entryRaw !== undefined
          ? String(entryRaw)
          : t.entry !== undefined
          ? String(t.entry)
          : "",
      exitPrice:
        exitRaw !== undefined
          ? String(exitRaw)
          : t.exit !== undefined
          ? String(t.exit)
          : "",
      lotSize:
        lotsRaw !== undefined
          ? String(lotsRaw)
          : t.volume
          ? String(t.volume)
          : t.lots
          ? String(t.lots)
          : "1",
      pnl: profit,
      // keep a readable formatted P/L field for UIs
      profitLoss: typeof profit === "number" ? `$${profit.toFixed(2)}` : String(profitRaw ?? "0"),
      openTime: toISOStringIfValid(openTimeRaw) || (t.time ? toISOStringIfValid(t.time) : ""),
      closeTime: toISOStringIfValid(closeTimeRaw) || "",
      outcome: profit > 0 ? "Win" : profit < 0 ? "Loss" : "Breakeven",
      notes: t.notes ?? t.note ?? t.comment ?? t.client_comment ?? "",
      reasonForTrade: t.reasonForTrade ?? t.reason ?? t.strategy ?? t.strategyName ?? "",
      strategy: t.strategy ?? t.reason ?? t.reasonForTrade ?? "",
      emotion: t.emotion ?? "neutral",
      // attach original raw for traceability
      // @ts-ignore
      raw: t,
    };

    return normalized as Trade;
  }, []);

  // ---- core handlers (add/update/delete) ----
  const addTrade = useCallback(
    (newTrade: Trade) => {
      setTrades((prev) => {
        const prevIds = new Set(prev.map((p) => p.id));
        const id =
          newTrade.id && !prevIds.has(newTrade.id) ? newTrade.id : generateUniqueId(prevIds);
        return [...prev, { ...newTrade, id }];
      });
    },
    [generateUniqueId]
  );

  const updateTrade = useCallback((updatedTrade: Trade) => {
    setTrades((prevTrades) =>
      prevTrades.map((trade) => (trade.id === updatedTrade.id ? { ...trade, ...updatedTrade } : trade))
    );
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setTrades((prevTrades) => prevTrades.filter((trade) => trade.id !== id));
  }, []);

  /**
   * setTradesFromCsv
   * - Accepts array of broker/backend-shaped trades
   * - Normalizes each entry to our Trade shape
   * - Upserts into state (if id exists -> replace, else add)
   * - Ensures unique ids
   */
  const setTradesFromCsv = useCallback(
    (csvTrades: any[]) => {
      if (!Array.isArray(csvTrades) || csvTrades.length === 0) return;

      setTrades((prev) => {
        // Map existing trades by id for upsert
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

        // Normalize incoming
        const normalized = csvTrades.map((t) => normalizeBrokerTrade(t));

        // Upsert normalized
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

        // Return array in insertion order (existing first, then new ones)
        return Array.from(byId.values());
      });
    },
    [normalizeBrokerTrade, generateUniqueId]
  );

  // alias importTrades => same behavior but clearer naming
  const importTrades = useCallback((incoming: any[]) => {
    setTradesFromCsv(incoming);
  }, [setTradesFromCsv]);

  // Clear trades
  const clearTrades = useCallback(() => {
    setTrades([]);
    setFilteredTrades([]);
    try {
      if (typeof window !== "undefined") localStorage.removeItem("trade-history");
    } catch (e) {
      // ignore
    }
  }, []);

  // Filter trades by date range (inclusive)
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

  /**
   * syncFromMT5
   * - calls backend endpoint to fetch account, trades, positions
   * - normalizes trades and imports them into context (and into localStorage via effect)
   *
   * backendUrl default:
   * - "http://127.0.0.1:5000/sync_mt5" (Flask backend)
   * - Or your Next API route: "/api/integrations/mt5/sync"
   */
  const syncFromMT5 = useCallback(
    async (
      login: string,
      password: string,
      server: string,
      backendUrl = (process.env.NEXT_PUBLIC_MT5_BACKEND as string) || "http://127.0.0.1:5000/sync_mt5"
    ): Promise<{
      success: boolean;
      account?: any;
      trades?: Trade[];
      positions?: any[];
      error?: string;
    }> => {
      // validate input quickly
      if (!login || !password || !server) {
        return { success: false, error: "Missing login, password or server." };
      }

      // Abortable fetch with timeout
      const controller = new AbortController();
      const timeoutMs = 20000; // 20s
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, password, server }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          // try to extract JSON error if provided
          let bodyText = "";
          try {
            const t = await res.text();
            bodyText = t;
          } catch (_) {
            bodyText = `HTTP ${res.status}`;
          }
          const msg =
            bodyText ||
            `Sync failed with status ${res.status} - ${res.statusText || "Unknown status"}`;
          return { success: false, error: msg };
        }

        const data = await res.json();

        const brokerTrades = Array.isArray(data.trades) ? data.trades : [];

        // normalize + import (upsert)
        setTradesFromCsv(brokerTrades);

        const normalizedTrades = brokerTrades.map(normalizeBrokerTrade);

        return {
          success: true,
          account: data.account,
          trades: normalizedTrades,
          positions: data.positions || [],
        };
      } catch (err: any) {
        clearTimeout(timeout);
        console.error("syncFromMT5 error:", err);

        // Friendly guidance for typical 'Failed to fetch' / network / CORS issues
        const isAbort = err && (err.name === "AbortError" || err.code === "ECONNABORTED");
        if (isAbort) {
          return { success: false, error: `Request timed out after ${timeoutMs / 1000}s.` };
        }

        const msg =
          (err && err.message) ||
          String(err) ||
          "Unknown error during MT5 sync. Ensure the backend is running and reachable, and CORS is enabled.";

        // Helpful hint for developers / users
        const hint =
          msg.includes("Failed to fetch") || msg.includes("NetworkError")
            ? `${msg} — frontend couldn't reach the backend. Check that your backend (e.g. Flask on port 5000) is running and accessible from the browser and that CORS is enabled. If you're testing on a mobile device or a VM, replace 'localhost' with your machine's LAN IP (e.g. http://127.0.0.1:5000).`
            : msg;

        return { success: false, error: hint };
      } finally {
        clearTimeout(timeout);
      }
    },
    [setTradesFromCsv, normalizeBrokerTrade]
  );

  // Provide context value
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
        syncFromMT5,
        clearTrades,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
};

/**
 * convenience hook used across the app (keeps previous useTrade usage)
 */
export const useTrade = () => {
  const ctx = useContext(TradeContext);
  if (!ctx) {
    throw new Error("useTrade must be used within a TradeProvider");
  }
  return ctx;
};
