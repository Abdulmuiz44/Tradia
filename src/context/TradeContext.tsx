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
 * - keeps previous API surface
 * - adds refreshTrades and switches syncFromMT5 to Next API + Python backend
 */
interface TradeContextProps {
  trades: Trade[];
  filteredTrades: Trade[];
  addTrade: (newTrade: Trade) => void;
  updateTrade: (updatedTrade: Trade) => void;
  deleteTrade: (id: string) => void;
  setTradesFromCsv: (csvTrades: any[]) => void;
  importTrades: (trades: any[]) => void;
  filterTrades: (fromDate: Date, toDate: Date) => void;
  refreshTrades: () => Promise<void>;
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
  refreshTrades: async () => {},
  syncFromMT5: async () => ({ success: false }),
  clearTrades: () => {},
});

export const TradeProvider = ({ children }: { children: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);

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

  // --- Normalizer: backend trade -> Trade shape (unchanged) ---
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
      t.deal_id ??
      undefined;

    const toISOStringIfValid = (v: any) => {
      if (v === undefined || v === null || v === "") return "";
      if (typeof v === "string") {
        const maybeDate = new Date(v);
        if (!isNaN(maybeDate.getTime())) return maybeDate.toISOString();
        return v;
      }
      if (typeof v === "number") {
        // unix seconds -> ms
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
      profitLoss: typeof profit === "number" ? `$${profit.toFixed(2)}` : String(profitRaw ?? "0"),
      openTime: toISOStringIfValid(openTimeRaw) || (t.time ? toISOStringIfValid(t.time) : ""),
      closeTime: toISOStringIfValid(closeTimeRaw) || "",
      outcome: profit > 0 ? "Win" : profit < 0 ? "Loss" : "Breakeven",
      notes: t.notes ?? t.note ?? t.comment ?? t.client_comment ?? "",
      reasonForTrade: t.reasonForTrade ?? t.reason ?? t.strategy ?? t.strategyName ?? "",
      strategy: t.strategy ?? t.reason ?? t.reasonForTrade ?? "",
      emotion: t.emotion ?? "neutral",
      // @ts-ignore keep raw for debugging
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
   * - Normalizes array and upserts into state
   */
  const setTradesFromCsv = useCallback(
    (csvTrades: any[]) => {
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

  const importTrades = useCallback((incoming: any[]) => {
    setTradesFromCsv(incoming);
  }, [setTradesFromCsv]);

  const clearTrades = useCallback(() => {
    setTrades([]);
    setFilteredTrades([]);
    try {
      if (typeof window !== "undefined") localStorage.removeItem("trade-history");
    } catch {}
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

  /**
   * Refresh trades from Next API (/api/trades) and normalize into state.
   */
  const refreshTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/trades", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load trades");
      const data = await res.json();
      const rows = Array.isArray(data.trades) ? data.trades : [];
      setTradesFromCsv(rows);
    } catch (e) {
      console.error("refreshTrades error:", e);
    }
  }, [setTradesFromCsv]);

  /**
   * syncFromMT5
   * - Calls Python backend (NEXT_PUBLIC_MT5_BACKEND / fallback)
   * - Persists returned trades via Next API /api/mt5/import
   * - Refreshes persisted trades from server
   */
  const syncFromMT5 = useCallback(
    async (
      login: string,
      password: string,
      server: string,
      backendUrl?: string
    ): Promise<{
      success: boolean;
      account?: any;
      trades?: Trade[];
      positions?: any[];
      error?: string;
    }> => {
      if (!login || !password || !server) {
        return { success: false, error: "Missing login, password or server." };
      }

      // default python backend url (client-provided override allowed)
      const backend =
        backendUrl ||
        (process.env.NEXT_PUBLIC_MT5_BACKEND as string) ||
        "http://127.0.0.1:5000/sync_mt5";

      // Abortable fetch with timeout
      const controller = new AbortController();
      const timeoutMs = 60000; // 60s
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // 1) fetch from python mt5 backend
        const mtRes = await fetch(backend, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, password, server }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // try parse JSON response
        let mtData: any = null;
        try {
          mtData = await mtRes.json();
        } catch (e) {
          const txt = await mtRes.text().catch(() => "");
          return { success: false, error: `MT backend returned non-JSON: ${txt}` };
        }

        if (!mtRes.ok) {
          return { success: false, error: mtData?.detail || mtData?.error || `MT backend failed: ${mtRes.status}` };
        }
        if (!mtData?.success) {
          return { success: false, error: mtData?.detail || mtData?.error || "MT backend reported failure" };
        }

        // 2) get trades array (backend uses "trades" or "deals")
        const tradesFromBackend = Array.isArray(mtData.trades)
          ? mtData.trades
          : Array.isArray(mtData.deals)
          ? mtData.deals
          : [];

        // 3) Persist to your Next.js import route so DB stores them
        try {
          const importRes = await fetch("/api/mt5/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account: mtData.account || { login, server }, trades: tradesFromBackend }),
          });

          let importData: any = null;
          try {
            importData = await importRes.json();
          } catch (e) {
            const txt = await importRes.text().catch(() => "");
            console.warn("Import route returned non-JSON:", txt);
            // still continue and import into memory
            const normalizedInMemory = tradesFromBackend.map(normalizeBrokerTrade);
            importTrades(normalizedInMemory);
            return { success: true, account: mtData.account, trades: normalizedInMemory, error: "Imported to memory; DB import returned non-JSON" };
          }

          if (!importRes.ok || !importData?.success) {
            console.warn("Import to DB failed:", importData);
            // still import into memory to give user immediate feedback
            const normalizedInMemory = tradesFromBackend.map(normalizeBrokerTrade);
            importTrades(normalizedInMemory);
            return { success: true, account: mtData.account, trades: normalizedInMemory, error: importData?.error || "Persist to DB failed" };
          }
        } catch (impErr) {
          console.error("Error calling /api/mt5/import:", impErr);
          // import into memory as fallback
          const normalizedInMemory = tradesFromBackend.map(normalizeBrokerTrade);
          importTrades(normalizedInMemory);
          return { success: true, account: mtData.account, trades: normalizedInMemory, error: "Failed to persist trades to DB; shown in-memory" };
        }

        // 4) Refresh persisted trades from DB and return success
        await refreshTrades();

        // convert to normalized trades to return
        const normalizedTrades = tradesFromBackend.map(normalizeBrokerTrade);

        return { success: true, account: mtData.account, trades: normalizedTrades };
      } catch (err: any) {
        clearTimeout(timeout);
        console.error("syncFromMT5 error:", err);
        const isAbort = err && (err.name === "AbortError" || err.code === "ECONNABORTED");
        if (isAbort) {
          return { success: false, error: `Request timed out after ${timeoutMs / 1000}s.` };
        }
        const msg = err?.message || "Unknown error during MT5 sync. Ensure backend reachable.";
        const hint =
          msg.includes("Failed to fetch") || msg.includes("NetworkError")
            ? `${msg} — frontend couldn't reach the MT backend or /api/mt5/import. Check both services.`
            : msg;
        return { success: false, error: hint };
      } finally {
        clearTimeout(timeout);
      }
    },
    [refreshTrades, importTrades, normalizeBrokerTrade]
  );

  // --- Load initial trades ---
  useEffect(() => {
    // Try to show cached trades quickly, then refresh from server
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("trade-history");
        if (stored) setTrades(JSON.parse(stored) as Trade[]);
      }
    } catch {}

    refreshTrades();
  }, [refreshTrades]);

  // --- Persist to localStorage as cache ---
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("trade-history", JSON.stringify(trades));
      }
    } catch {}
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
