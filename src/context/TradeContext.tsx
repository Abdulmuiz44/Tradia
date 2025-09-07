// src/context/TradeContext.tsx
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import { Trade } from "@/types/trade";

/**
 * Types
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

  /* Bulk helpers (added to satisfy BulkActionBar and similar components) */
  bulkToggleReviewed: (ids: string[], reviewed: boolean) => void;
  bulkDelete: (ids: string[]) => void;
}

/**
 * Safe helpers (module scope to avoid hook dependency issues)
 */
function getRandomUUID(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto && typeof g.crypto.randomUUID === "function") {
    try {
      return g.crypto.randomUUID();
    } catch {
      // fallback below
    }
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateUniqueId(existingIds?: Set<string>): string {
  let id = getRandomUUID();
  if (!existingIds) return id;
  // loop until unique
  while (existingIds.has(id)) {
    id = getRandomUUID();
  }
  return id;
}

function toNumberSafe(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9eE\.\-+]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toStringSafe(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint")
    return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toISOStringSafe(v: unknown): string {
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
    const s = v.trim();
    if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString();
    if (/^\d{13}$/.test(s)) return new Date(Number(s)).toISOString();
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toISOString();
  }
  const s = toStringSafe(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString();
}

/**
 * Normalize an incoming (unknown-shape) broker object into our Trade type.
 * Permissive — picks common field names and coerces types safely.
 */
function normalizeBrokerTrade(t: unknown): Trade {
  const rec = (t && typeof t === "object") ? (t as Record<string, unknown>) : {};

  const profitRaw =
    rec["profit"] ??
    rec["pnl"] ??
    rec["profitLoss"] ??
    rec["profit_loss"] ??
    rec["netProfit"] ??
    rec["profitAmount"] ??
    rec["netpl"] ??
    rec["net_pnl"] ??
    0;

  const profit = toNumberSafe(profitRaw);

  const entryRaw =
    rec["entryPrice"] ?? rec["entry_price"] ?? rec["open_price"] ?? rec["open"] ?? rec["price"];
  const exitRaw =
    rec["exitPrice"] ?? rec["exit_price"] ?? rec["close_price"] ?? rec["close"];
  const lotsRaw =
    rec["lotSize"] ?? rec["lots"] ?? rec["volume"] ?? rec["size"] ?? rec["contractsize"] ?? rec["quantity"] ?? 1;
  const openTimeRaw =
    rec["openTime"] ?? rec["open_time"] ?? rec["time"] ?? rec["entry_time"] ?? rec["create_time"] ?? rec["time_msc"];
  const closeTimeRaw =
    rec["closeTime"] ?? rec["close_time"] ?? rec["time_done"] ?? rec["exit_time"] ?? rec["close_dt"] ?? rec["close"];

  const idCandidate = rec["id"] ?? rec["ticket"] ?? rec["deal"] ?? rec["trade_id"] ?? rec["ticket_no"] ?? undefined;

  const normalized: Partial<Trade> = {
    id: idCandidate ? toStringSafe(idCandidate) : undefined,
    symbol: toStringSafe(rec["symbol"] ?? rec["instrument"] ?? rec["ticker"] ?? "UNKNOWN"),
    direction: (toStringSafe(rec["direction"] ?? rec["side"] ?? "") as "Buy" | "Sell" | undefined) || undefined,
    orderType: toStringSafe(rec["orderType"] ?? rec["type"] ?? ""),
    openTime: toISOStringSafe(openTimeRaw),
    closeTime: toISOStringSafe(closeTimeRaw),
    session: toStringSafe(rec["session"] ?? ""),
    lotSize: toNumberSafe(lotsRaw),
    entryPrice: Number(toNumberSafe(entryRaw)),
    stopLossPrice: Number(toNumberSafe(rec["stopLossPrice"] ?? rec["stop_loss"] ?? 0)),
    takeProfitPrice: Number(toNumberSafe(rec["takeProfitPrice"] ?? rec["take_profit"] ?? 0)),
    pnl: profit,
    resultRR: Number(toNumberSafe(rec["rr"] ?? rec["resultRR"] ?? 0)),
    outcome: profit > 0 ? "Win" : profit < 0 ? "Loss" : "Breakeven",
    duration: toStringSafe(rec["duration"] ?? ""),
    reasonForTrade: toStringSafe(rec["reasonForTrade"] ?? rec["reason"] ?? rec["strategy"] ?? ""),
    emotion: toStringSafe(rec["emotion"] ?? ""),
    journalNotes: toStringSafe(rec["notes"] ?? rec["note"] ?? rec["comment"] ?? ""),
    // Note: we intentionally do not enforce a strict `reviewed` type here.
    // If your Trade type defines a `reviewed` boolean, it will be set; otherwise
    // it will exist at runtime but we cast the object back to Trade below.
    reviewed: false as unknown as boolean,
  };

  return normalized as Trade;
}

/**
 * Context + Provider
 */
export const TradeContext = createContext<TradeContextProps>({
  trades: [],
  filteredTrades: [],
  addTrade: () => undefined,
  updateTrade: () => undefined,
  deleteTrade: () => undefined,
  setTradesFromCsv: () => undefined,
  importTrades: () => undefined,
  filterTrades: () => undefined,
  refreshTrades: async () => undefined,
  syncFromMT5: async () => ({ success: false }),
  clearTrades: () => undefined,
  bulkToggleReviewed: () => undefined,
  bulkDelete: () => undefined,
});

export const TradeProvider = ({ children }: { children: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);

  // --- Add / update / delete ---
  const addTrade = (newTrade: Trade) => {
    setTrades((prev) => {
  const prevIds = new Set(prev.map((p) => String(p.id)).filter(Boolean));
      const id = newTrade.id && !prevIds.has(newTrade.id) ? newTrade.id : generateUniqueId(prevIds);
      return [...prev, { ...newTrade, id } as Trade];
    });
  };

  const updateTrade = (updatedTrade: Trade) => {
    setTrades((prevTrades) =>
      prevTrades.map((trade) => (trade.id === updatedTrade.id ? ({ ...trade, ...updatedTrade } as Trade) : trade))
    );
  };

  const deleteTrade = (id: string) => {
    setTrades((prevTrades) => prevTrades.filter((trade) => trade.id !== id));
    setFilteredTrades((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Bulk helpers ---
  const bulkToggleReviewed = (ids: string[], reviewed: boolean) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    setTrades((prev) =>
      prev.map((t) => (t.id && ids.includes(t.id) ? ({ ...t, reviewed } as Trade) : t))
    );
    setFilteredTrades((prev) =>
      prev.map((t) => (t.id && ids.includes(t.id) ? ({ ...t, reviewed } as Trade) : t))
    );
    // persist
    try {
      if (typeof window !== "undefined") {
        const next = trades.map((t) => (t.id && ids.includes(t.id) ? ({ ...t, reviewed } as Trade) : t));
        localStorage.setItem("trade-history", JSON.stringify(next));
      }
    } catch {
      // ignore localStorage errors
    }
  };

  const bulkDelete = (ids: string[]) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    setTrades((prev) => prev.filter((t) => !(t.id && ids.includes(t.id))));
    setFilteredTrades((prev) => prev.filter((t) => !(t.id && ids.includes(t.id))));
    try {
      if (typeof window !== "undefined") {
        const next = trades.filter((t) => !(t.id && ids.includes(t.id)));
        localStorage.setItem("trade-history", JSON.stringify(next));
      }
    } catch {
      // ignore
    }
  };

  // --- CSV import/upsert ---
  const setTradesFromCsv = (csvTrades: unknown[]) => {
    if (!Array.isArray(csvTrades) || csvTrades.length === 0) return;

    setTrades((prev) => {
      const byId = new Map<string, Trade>();
      const prevIds = new Set<string>(prev.map(p => String(p.id)).filter(Boolean));
      prev.forEach((p) => {
        if (p.id) {
          byId.set(String(p.id), p as Trade);
        } else {
          const newId = generateUniqueId(prevIds);
          prevIds.add(newId);
          byId.set(newId, { ...p, id: newId } as Trade);
        }
      });

      const normalized = csvTrades.map((t) => normalizeBrokerTrade(t));

      normalized.forEach((nt) => {
        const ntId = nt.id ? String(nt.id) : undefined;
        if (ntId && byId.has(ntId)) {
          const existing = byId.get(ntId)!;
          byId.set(ntId, { ...existing, ...nt, id: ntId } as Trade);
        } else {
          const newId = ntId && !prevIds.has(ntId) ? ntId : generateUniqueId(prevIds);
          prevIds.add(newId);
          byId.set(newId, { ...nt, id: newId } as Trade);
        }
      });

      return Array.from(byId.values());
    });
  };

  const importTrades = (incoming: unknown[]) => {
    setTradesFromCsv(incoming);
  };

  const clearTrades = () => {
    setTrades([]);
    setFilteredTrades([]);
    try {
      if (typeof window !== "undefined") localStorage.removeItem("trade-history");
    } catch {
      // ignore localStorage errors
    }
  };

  const filterTrades = (fromDate: Date, toDate: Date) => {
    const filtered = trades.filter((trade) => {
      const tradeDate = new Date(trade.openTime);
      if (isNaN(tradeDate.getTime())) return false;
      return tradeDate >= fromDate && tradeDate <= toDate;
    });
    setFilteredTrades(filtered);
  };

  // --- Refresh (fetch persisted trades from database) ---
  const refreshTrades = async () => {
    try {
      const res = await fetch("/api/trades", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load trades");
      const data = await res.json();
      const rows = Array.isArray(data?.trades) ? data.trades : [];

      // Convert database format to Trade format
      const normalizedTrades = rows.map((row: any) => ({
        id: row.id,
        symbol: row.symbol,
        direction: row.direction,
        orderType: row.order_type,
        openTime: row.open_time,
        closeTime: row.close_time,
        session: row.session,
        lotSize: row.lot_size,
        entryPrice: row.entry_price,
        exitPrice: row.exit_price,
        stopLossPrice: row.stop_loss_price,
        takeProfitPrice: row.take_profit_price,
        pnl: row.pnl,
        outcome: row.outcome,
        resultRR: row.result_rr,
        duration: row.duration,
        reasonForTrade: row.reason_for_trade,
        emotion: row.emotion,
        journalNotes: row.journal_notes,
        commission: row.commission,
        swap: row.swap,
        source: row.source,
        updated_at: row.updated_at
      }));

      setTradesFromCsv(normalizedTrades);
    } catch (err: unknown) {
      // console error but don't crash
      // eslint-disable-next-line no-console
      console.error("refreshTrades error:", err);
    }
  };

  // --- Sync from MT5 via python backend, persist via /api/mt5/import, fallback to in-memory ---
  const syncFromMT5 = async (
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

      // parse JSON defensively
      let mtData: unknown = null;
      try {
        mtData = await mtRes.json();
      } catch {
        const txt = await mtRes.text().catch(() => "");
        return { success: false, error: `MT backend returned non-JSON: ${txt}` };
      }

      const mtObj = (mtData && typeof mtData === "object") ? (mtData as Record<string, unknown>) : {};

      if (!mtRes.ok) {
        return { success: false, error: (mtObj.detail as string) ?? (mtObj.error as string) ?? `MT backend failed: ${mtRes.status}` };
      }
      if (!(mtObj.success === true)) {
        return { success: false, error: (mtObj.detail as string) ?? (mtObj.error as string) ?? "MT backend reported failure" };
      }

      const tradesFromBackend = Array.isArray(mtObj.trades)
        ? (mtObj.trades as unknown[])
        : Array.isArray(mtObj.deals)
        ? (mtObj.deals as unknown[])
        : [];

      // attempt to persist to Next import route
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
          return { success: true, account: mtObj.account, trades: normalizedInMemory, error: (importObj.error as string) ?? "Persist to DB failed" };
        }
      } catch (impErr: unknown) {
        // eslint-disable-next-line no-console
        console.error("Error calling /api/mt5/import:", impErr);
        const normalizedInMemory = tradesFromBackend.map(normalizeBrokerTrade);
        importTrades(normalizedInMemory);
        return { success: true, account: mtObj.account, trades: normalizedInMemory, error: "Failed to persist trades to DB; shown in-memory" };
      }

      // refresh persisted trades
      await refreshTrades();

      // return normalized trades
      const normalizedTrades = tradesFromBackend.map(normalizeBrokerTrade);
      return { success: true, account: mtObj.account, trades: normalizedTrades };
    } catch (err: unknown) {
      clearTimeout(timeout);
      // eslint-disable-next-line no-console
      console.error("syncFromMT5 error:", err);
      const isAbort =
        typeof err === "object" &&
        err !== null &&
        "name" in err &&
        (err as Record<string, unknown>).name === "AbortError";
      if (isAbort) {
        return { success: false, error: `Request timed out after ${timeoutMs / 1000}s.` };
      }
      const msg = err instanceof Error ? err.message : String(err);
      const hint =
        msg.includes("Failed to fetch") || msg.includes("NetworkError")
          ? `${msg} — frontend couldn't reach the MT backend or /api/mt5/import. Check both services.`
          : msg;
      return { success: false, error: hint };
    } finally {
      clearTimeout(timeout);
    }
  };

  // Load initial trades from local cache and refresh
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("trade-history");
        if (stored) {
          const parsed = JSON.parse(stored) as Trade[] | null;
          if (Array.isArray(parsed)) setTrades(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }

    // fire-and-forget refresh
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    refreshTrades();
  }, []); // refreshTrades is stable (module-level functions are used internally)

  // persist to localStorage
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
        bulkToggleReviewed,
        bulkDelete,
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
