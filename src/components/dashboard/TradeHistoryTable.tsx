// src/components/dashboard/TradeHistoryTable.tsx
"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Trash2, Pencil, Filter, DownloadCloud, FilePlus } from "lucide-react";
import { TradeContext } from "@/context/TradeContext";
import type { Trade } from "@/types/trade";
import AddTradeModal from "@/components/modals/AddTradeModal";
import CsvUpload from "@/components/dashboard/CsvUpload";
import JournalModal from "@/components/modals/JournalModal";
import { useUser } from "@/context/UserContext";

/* ---------------- helpers ---------------- */
const toNumber = (v: unknown): number => {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9eE.+-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
const toStringSafe = (v: unknown): string => {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint")
    return String(v);
  if (v instanceof Date) return v.toISOString();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};
const toDateOrNull = (v: unknown): Date | null => {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
};
const getField = (t: Trade, k: string): unknown =>
  (t as unknown as Record<string, unknown>)[k];

const calcDuration = (openIso?: string, closeIso?: string): string => {
  if (!openIso || !closeIso) return "";
  const a = new Date(openIso);
  const b = new Date(closeIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return "";
  let secs = Math.max(0, Math.round(Math.abs(b.getTime() - a.getTime()) / 1000));
  const days = Math.floor(secs / 86400); secs -= days * 86400;
  const hours = Math.floor(secs / 3600); secs -= hours * 3600;
  const mins = Math.floor(secs / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

/** Compute planned/realized RR using price levels.
 * - risk = |entry - stop|
 * - Win: RR = |tp - entry| / risk (if tp provided), else keep positive 1R as minimum signal
 * - Loss: RR = -1
 * - Breakeven or risk=0: 0
 */
const computeResultRR = (t: Partial<Trade>): number => {
  const outcome = String(t.outcome ?? "").toLowerCase();
  const entry = toNumber(t.entryPrice);
  const sl = toNumber(t.stopLossPrice);
  const tp = toNumber(t.takeProfitPrice);
  const risk = Math.abs(entry - sl);

  if (!risk || !Number.isFinite(risk)) return 0;

  if (outcome === "breakeven") return 0;
  if (outcome === "loss") return -1;

  // Default for wins: use planned RR from TP vs SL; if no TP, 1R floor.
  const rr = tp ? Math.abs(tp - entry) / risk : 1;
  return Number.isFinite(rr) ? rr : 0;
};

/** Enforce PnL sign from outcome and fill derived fields */
const normalizeTrade = (raw: Partial<Trade>): Trade => {
  const id = String(raw.id ?? `${raw.symbol ?? "TRD"}-${Date.now()}`);
  const symbol = String(raw.symbol ?? "");
  const direction = String(
    raw.direction ??
      (toNumber(raw.takeProfitPrice) >= toNumber(raw.entryPrice)
        ? "Buy"
        : "Sell")
  );
  const orderType = String(raw.orderType ?? "Market Execution");
  const openTime = String(raw.openTime ?? "");
  const closeTime = String(raw.closeTime ?? "");
  const session = String(raw.session ?? "");
  const lotSize = toNumber(raw.lotSize);
  const entryPrice = toNumber(raw.entryPrice);
  const stopLossPrice = toNumber(raw.stopLossPrice);
  const takeProfitPrice = toNumber(raw.takeProfitPrice);
  let pnl = toNumber(raw.pnl);
  const outcome: Trade["outcome"] =
    (raw.outcome as Trade["outcome"]) ?? "Breakeven";

  // Enforce PnL sign from outcome
  if (outcome === "Win") pnl = Math.abs(pnl);
  else if (outcome === "Loss") pnl = -Math.abs(pnl);
  else pnl = 0;

  const resultRR =
    Number.isFinite(toNumber(raw.resultRR)) && toNumber(raw.resultRR) !== 0
      ? toNumber(raw.resultRR)
      : computeResultRR({
          entryPrice,
          stopLossPrice,
          takeProfitPrice,
          outcome,
        });

  const duration =
    String(raw.duration ?? "") ||
    calcDuration(openTime || undefined, closeTime || undefined);

  return {
    id,
    symbol,
    direction,
    orderType,
    openTime,
    closeTime,
    session,
    lotSize,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    pnl,
    resultRR,
    outcome,
    duration,
    reasonForTrade: String(raw.reasonForTrade ?? ""),
    emotion: String(raw.emotion ?? "neutral"),
    journalNotes: String(raw.journalNotes ?? raw.notes ?? ""),
    notes: String(raw.notes ?? raw.journalNotes ?? ""),
    updated_at: new Date().toISOString(),
  } as Trade;
};

const formatRR = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)}R` : "—";
};

/* ---------------- main component ---------------- */
export default function TradeHistoryTable() {
  const {
    trades,
    updateTrade,
    addTrade,
    deleteTrade,
    setTradesFromCsv,
    importTrades,
  } = useContext(TradeContext);
  const { plan } = useUser();

  const [mounted, setMounted] = useState<boolean>(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [exportOpen, setExportOpen] = useState<boolean>(false);

  // CSV modal state (now opens a modal directly)
  const [csvOpen, setCsvOpen] = useState<boolean>(false);

  const hasLoaded = useRef<boolean>(false);

  const [filters, setFilters] = useState<{
    symbol: string;
    outcome: string;
    fromDate: string;
    toDate: string;
    minPNL: string;
    maxPNL: string;
  }>({
    symbol: "",
    outcome: "",
    fromDate: "",
    toDate: "",
    minPNL: "",
    maxPNL: "",
  });

  const [query, setQuery] = useState<string>("");
  const [sortField, setSortField] = useState<
    "openTime" | "closeTime" | "pnl" | "symbol"
  >("closeTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  /* init from localStorage */
  useEffect(() => {
    if (!hasLoaded.current) {
      try {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("userTrades");
          if (stored) {
            const parsed = JSON.parse(stored) as unknown;
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Normalize on load so RR exists for old records too
              const normalized = (parsed as Partial<Trade>[]).map(normalizeTrade);
              setTradesFromCsv(normalized as unknown[]);
            }
          }
        }
      } catch {
        // ignore
      }
      hasLoaded.current = true;
    }
    setMounted(true);
  }, [setTradesFromCsv]);

  /* persist to localStorage */
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("userTrades", JSON.stringify(trades));
      }
    } catch {
      // ignore
    }
  }, [trades]);

  /* processed data (filters + search + sort) */
  // Plan-limited trades window
  const planLimitedTrades = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;
    if (plan === 'free') {
      cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
    } else if (plan === 'pro') {
      cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 6);
    }
    if (!cutoff) return trades;
    return trades.filter((t) => {
      const o = toDateOrNull(getField(t, 'openTime'));
      const c = toDateOrNull(getField(t, 'closeTime'));
      const d = c || o;
      return d ? d >= cutoff! : true;
    });
  }, [trades, plan]);

  const processed = useMemo(() => {
    const { symbol, outcome, fromDate, toDate, minPNL, maxPNL } = filters;
    const q = query.trim().toLowerCase();
    let filtered = planLimitedTrades.slice();

    filtered = filtered.filter((t) => {
      const pnl = toNumber(getField(t, "pnl") ?? getField(t, "profit") ?? getField(t, "netpl"));
      const sym = toStringSafe(getField(t, "symbol")).toLowerCase();
      const out = toStringSafe(getField(t, "outcome")).toLowerCase();
      const open = toDateOrNull(getField(t, "openTime") ?? getField(t, "time"));
      const close = toDateOrNull(getField(t, "closeTime") ?? getField(t, "close"));

      if (symbol && !sym.includes(symbol.toLowerCase())) return false;
      if (outcome && out !== outcome.toLowerCase()) return false;
      if (fromDate) {
        const fromD = new Date(fromDate);
        if ((open && open < fromD) || (!open && close && close < fromD)) return false;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        if ((open && open > toD) || (!open && close && close > toD)) return false;
      }
      if (minPNL !== "" && !Number.isNaN(Number(minPNL)) && pnl < Number(minPNL)) return false;
      if (maxPNL !== "" && !Number.isNaN(Number(maxPNL)) && pnl > Number(maxPNL)) return false;
      return true;
    });

    if (q) {
      filtered = filtered.filter((t) => {
        const sym = toStringSafe(getField(t, "symbol")).toLowerCase();
        const notes = toStringSafe(getField(t, "notes") ?? getField(t, "journalNotes")).toLowerCase();
        const id = toStringSafe(getField(t, "id")).toLowerCase();
        return sym.includes(q) || notes.includes(q) || id.includes(q);
      });
    }

    filtered.sort((a, b) => {
      if (sortField === "pnl") {
        const pa = toNumber(getField(a, "pnl") ?? getField(a, "profit") ?? getField(a, "netpl"));
        const pb = toNumber(getField(b, "pnl") ?? getField(b, "profit") ?? getField(b, "netpl"));
        return sortDir === "asc" ? pa - pb : pb - pa;
      }
      if (sortField === "symbol") {
        const sa = toStringSafe(getField(a, "symbol"));
        const sb = toStringSafe(getField(b, "symbol"));
        const cmp = sa.localeCompare(sb);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const ta = toDateOrNull(getField(a, sortField));
      const tb = toDateOrNull(getField(b, sortField));
      const tA = ta ? ta.getTime() : 0;
      const tB = tb ? tb.getTime() : 0;
      return sortDir === "asc" ? tA - tB : tB - tA;
    });

    return filtered;
  }, [planLimitedTrades, filters, query, sortField, sortDir]);

  /* summary stats */
  const stats = useMemo(() => {
    const total = planLimitedTrades.length;
    let wins = 0;
    let totalPnl = 0;
    let rrSum = 0;
    let rrCount = 0;
    for (const t of planLimitedTrades) {
      const pnl = toNumber(getField(t, "pnl") ?? getField(t, "profit") ?? getField(t, "netpl"));
      totalPnl += pnl;
      const outcome = toStringSafe(getField(t, "outcome")).toLowerCase();
      if (outcome === "win") wins++;
      const rr = Number(getField(t, "resultRR") ?? getField(t, "rr") ?? NaN);
      if (Number.isFinite(rr)) {
        rrSum += rr;
        rrCount++;
      }
    }
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const avgRR = rrCount > 0 ? rrSum / rrCount : 0;
    return { total, wins, winRate, totalPnl, avgRR };
  }, [planLimitedTrades]);

  if (!mounted) return null;

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const pageItems = processed.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(f);
      setSortDir("desc");
    }
    setPage(1);
  };

  const handleCsvImport = (imported: Partial<Trade>[]) => {
    if (!Array.isArray(imported) || imported.length === 0) return;
    const normalized = imported.map(normalizeTrade);
    importTrades(normalized as unknown[]);
    setCsvOpen(false);
  };

  const exportCsv = () => {
    const hdr = [
      "symbol","direction","orderType","openTime","closeTime","session",
      "lotSize","entryPrice","stopLossPrice","takeProfitPrice","pnl",
      "outcome","resultRR","notes"
    ];
    const rows = processed.map((t) => [
      toStringSafe(getField(t, "symbol")),
      toStringSafe(getField(t, "direction")),
      toStringSafe(getField(t, "orderType")),
      toStringSafe(getField(t, "openTime")),
      toStringSafe(getField(t, "closeTime")),
      toStringSafe(getField(t, "session")),
      toStringSafe(getField(t, "lotSize")),
      toStringSafe(getField(t, "entryPrice")),
      toStringSafe(getField(t, "stopLossPrice")),
      toStringSafe(getField(t, "takeProfitPrice")),
      toStringSafe(getField(t, "pnl")),
      toStringSafe(getField(t, "outcome")),
      toStringSafe(getField(t, "resultRR")),
      toStringSafe(getField(t, "notes") ?? getField(t, "journalNotes")),
    ]);
    const csv = [hdr, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trade_history_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const headerCell = (
    label: string,
    sortable?: boolean,
    keyField?: typeof sortField
  ) => {
    const isActive = sortable && keyField === sortField;
    const indicator = isActive ? (sortDir === "asc" ? " ▲" : " ▼") : "";
    return (
      <th
        key={label}
        className={`px-3 py-2 font-medium border-b border-gray-600 ${
          sortable ? "cursor-pointer select-none" : ""
        }`}
        onClick={() => sortable && keyField && toggleSort(keyField)}
        role={sortable ? "button" : undefined}
        aria-sort={
          isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        {label}
        <span className="text-xs">{indicator}</span>
      </th>
    );
  };

  /* small helper: mobile card for a trade */
  const MobileTradeCard = ({ t, idx }: { t: Trade; idx: number }) => {
    const pnl = toNumber(getField(t, "pnl") ?? getField(t, "profit") ?? getField(t, "netpl"));
    const open = toDateOrNull(getField(t, "openTime"));
    const close = toDateOrNull(getField(t, "closeTime"));
    return (
      <div key={toStringSafe(getField(t, "id")) || `card-${idx}`} className="bg-[#071022] border border-zinc-700 rounded-lg p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">{toStringSafe(getField(t, "symbol"))}</div>
            <div className="text-xs text-zinc-400">{toStringSafe(getField(t, "direction"))} • {toStringSafe(getField(t, "orderType"))}</div>
          </div>
          <div className="text-right">
            <div className={`font-semibold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>${pnl.toFixed(2)}</div>
            <div className="text-xs text-zinc-400">{formatRR(getField(t, "resultRR") ?? getField(t, "rr"))}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
          <div>
            <div className="text-[11px] text-zinc-400">Open</div>
            <div className="text-[12px]">{open ? format(open, "Pp") : "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-400">Close</div>
            <div className="text-[12px]">{close ? format(close, "Pp") : "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-400">Outcome</div>
            <div className="text-[12px]">{toStringSafe(getField(t, "outcome"))}</div>
          </div>
          <div>
            <div className="text-[11px] text-zinc-400">Duration</div>
            <div className="text-[12px]">{toStringSafe(getField(t, "duration"))}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="text-xs text-zinc-400 truncate">{toStringSafe(getField(t, "journalNotes") ?? getField(t, "notes"))}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingTrade(t)} className="p-1 hover:text-blue-400" aria-label="Edit trade">
              <Pencil size={16} />
            </button>
            <button onClick={() => deleteTrade(String(getField(t, "id")))} className="p-1 hover:text-red-400" aria-label="Delete trade">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top controls + quick stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <button
              className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
              onClick={() => setFilterOpen(!filterOpen)}
              title="Filters"
              aria-pressed={filterOpen}
            >
              <Filter size={18} className="text-gray-300" />
            </button>

            <div className="relative w-full max-w-xs md:max-w-md">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search symbol, id or notes..."
                className="px-3 py-2 rounded bg-[#0F1724] border border-zinc-700 text-white w-full"
                aria-label="Search trades"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  className="absolute right-1 top-1.5 text-xs px-2 py-1 bg-zinc-700 rounded"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* quick stats (compact on mobile) */}
          <div className="flex gap-3 ml-2">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <div className="hidden md:flex items-center gap-3">
                <div className="px-3 py-2 rounded bg-zinc-800">
                  <div className="text-xs">Trades</div>
                  <div className="font-medium">{stats.total}</div>
                </div>
                <div className="px-3 py-2 rounded bg-zinc-800">
                  <div className="text-xs">Win Rate</div>
                  <div className="font-medium">{stats.winRate}%</div>
                </div>
                <div className="px-3 py-2 rounded bg-zinc-800">
                  <div className="text-xs">Total PnL</div>
                  <div
                    className={`font-medium ${
                      stats.totalPnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ${stats.totalPnl.toFixed(2)}
                  </div>
                </div>
                <div className="px-3 py-2 rounded bg-zinc-800">
                  <div className="text-xs">Avg RR</div>
                  <div className="font-medium">
                    {Number.isFinite(stats.avgRR) ? stats.avgRR.toFixed(2) : "—"}
                  </div>
                </div>
              </div>

              {/* compact summary for mobile */}
              <div className="md:hidden flex items-center gap-2 text-xs text-zinc-300">
                <div className="px-2 py-1 rounded bg-zinc-800">T:{stats.total}</div>
                <div className="px-2 py-1 rounded bg-zinc-800">W:{stats.winRate}%</div>
                <div className="px-2 py-1 rounded bg-zinc-800">{stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={() => setExportOpen(true)}
            title="Export"
          >
            <DownloadCloud size={18} className="text-gray-300" />
          </button>

          {/* Clicking this icon now opens the CSV import modal directly (no dropdown) */}
          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={() => setCsvOpen(true)}
            title="Import CSV"
            aria-haspopup="dialog"
          >
            <FilePlus size={18} className="text-gray-300" />
          </button>

          <button
            className="px-3 py-1 bg-green-600 rounded hover:bg-green-500 text-sm"
            onClick={() => setIsAddOpen(true)}
          >
            Add Trade
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 mb-4 text-sm">
          {(["symbol", "outcome"] as const).map((f) => (
            <input
              key={f}
              type="text"
              className="p-2 rounded bg-gray-800 text-white w-full"
              placeholder={f}
              value={(filters as Record<string, string>)[f]}
              onChange={(e) =>
                setFilters((p) => ({ ...p, [f]: e.target.value }))
              }
            />
          ))}
          {(["fromDate", "toDate"] as const).map((f) => (
            <input
              key={f}
              type="date"
              className="p-2 rounded bg-gray-800 text-white w-full"
              value={(filters as Record<string, string>)[f]}
              onChange={(e) =>
                setFilters((p) => ({ ...p, [f]: e.target.value }))
              }
            />
          ))}
          {(["minPNL", "maxPNL"] as const).map((f) => (
            <input
              key={f}
              type="number"
              className="p-2 rounded bg-gray-800 text-white w-full"
              placeholder={f}
              value={(filters as Record<string, string>)[f]}
              onChange={(e) =>
                setFilters((p) => ({ ...p, [f]: e.target.value }))
              }
            />
          ))}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setFilters({
                  symbol: "",
                  outcome: "",
                  fromDate: "",
                  toDate: "",
                  minPNL: "",
                  maxPNL: "",
                })
              }
              className="px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700 text-sm"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Table for desktop/tablet and Cards for mobile */}
      <div className="space-y-3">
        {/* Mobile list (cards) */}
        <div className="sm:hidden space-y-2">
          {pageItems.length === 0 ? (
            <div className="p-4 text-center text-zinc-400">No trades found.</div>
          ) : (
            pageItems.map((t, idx) => <MobileTradeCard key={String(getField(t, "id")) || idx} t={t} idx={idx} />)
          )}
        </div>

        {/* Table for sm+ */}
        <div className="hidden sm:block overflow-x-auto bg-gray-800 rounded-xl shadow-lg">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-700 text-gray-200 sticky top-0">
              <tr>
                {headerCell("Symbol", true, "symbol")}
                <th className="px-3 py-2 font-medium border-b border-gray-600">Direction</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Order Type</th>
                {headerCell("Open Time", true, "openTime")}
                {headerCell("Close Time", true, "closeTime")}
                <th className="px-3 py-2 font-medium border-b border-gray-600">Session</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Lot Size</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Entry Price</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Stop Loss</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Take Profit</th>
                {headerCell("PNL ($)", true, "pnl")}
                <th className="px-3 py-2 font-medium border-b border-gray-600">Duration</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Outcome</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">RR</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Strategy</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Emotion</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Notes</th>
                <th className="px-3 py-2 font-medium border-b border-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-4 text-center text-zinc-400">
                    No trades found.
                  </td>
                </tr>
              ) : (
                pageItems.map((t, idx) => {
                  const pnl = toNumber(
                    getField(t, "pnl") ?? getField(t, "profit") ?? getField(t, "netpl")
                  );
                  const idKey =
                    toStringSafe(getField(t, "id")) ||
                    `${toStringSafe(getField(t, "symbol"))}-${idx}`;
                  return (
                    <tr key={idKey} className="hover:bg-gray-700 transition-colors">
                      <td className="px-3 py-2">{toStringSafe(getField(t, "symbol"))}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "direction"))}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "orderType"))}</td>
                      <td className="px-3 py-2">
                        {toDateOrNull(getField(t, "openTime"))
                          ? format(toDateOrNull(getField(t, "openTime")) as Date, "Pp")
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {toDateOrNull(getField(t, "closeTime"))
                          ? format(toDateOrNull(getField(t, "closeTime")) as Date, "Pp")
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "session"))}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "lotSize"))}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "entryPrice"))}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "stopLossPrice"))}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "takeProfitPrice"))}</td>
                      <td className={`px-3 py-2 ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ${pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">{(() => { const o=toDateOrNull(getField(t,"openTime")); const c=toDateOrNull(getField(t,"closeTime")); return (o&&c)? calcDuration(o.toISOString(), c.toISOString()) : toStringSafe(getField(t,"duration")); })()}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "strategy") || getField(t, "reasonForTrade"))}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "outcome"))}</td>
                      <td className="px-3 py-2">
                        {formatRR(getField(t, "resultRR") ?? getField(t, "rr"))}
                      </td>
                      <td className="px-3 py-2">
                        {toStringSafe(getField(t, "reasonForTrade"))}
                      </td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "emotion"))}</td>
                      <td className="px-3 py-2">
                        {toStringSafe(getField(t, "journalNotes") ?? getField(t, "notes"))}
                      </td>
                      <td className="px-3 py-2 flex items-center gap-2">
                        <button
                          onClick={() => setEditingTrade(t)}
                          className="p-1 hover:text-blue-400"
                          aria-label="Edit trade"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deleteTrade(String(getField(t, "id")))}
                          className="p-1 hover:text-red-400"
                          aria-label="Delete trade"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row items-center justify-between text-sm text-zinc-300 gap-3">
        <div>
          Showing {processed.length === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, processed.length)} of {processed.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 rounded bg-zinc-700 disabled:opacity-50"
          >
            Prev
          </button>
          <div>
            Page {page} / {Math.max(1, totalPages)}
          </div>
          <button
            onClick={() =>
              setPage((p) => Math.min(Math.max(1, totalPages), p + 1))
            }
            disabled={page >= totalPages}
            className="px-3 py-1 rounded bg-zinc-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* EDIT with JournalModal — resultRR is recalculated here */}
      <JournalModal
        isOpen={!!editingTrade}
        trade={editingTrade}
        onClose={() => setEditingTrade(null)}
        onSave={(t) => {
          const normalized = normalizeTrade(t);
          updateTrade(normalized);
          setEditingTrade(null);
        }}
      />

      {/* ADD — normalize to compute RR immediately */}
      <AddTradeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={(t) => {
          const normalized = normalizeTrade(t);
          const id = normalized.id || `${normalized.symbol}-${Date.now()}`;
          addTrade({ ...normalized, id });
          setIsAddOpen(false);
        }}
      />

      {/* CSV Upload modal (responsive): render a bottom-sheet on small screens, centered on larger screens */}
      {csvOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCsvOpen(false)}
            aria-hidden
          />
          <div className="relative w-full sm:max-w-3xl bg-gray-900 rounded-t-lg sm:rounded-lg p-4 max-h-[90dvh] overflow-auto">
            {/* CsvUpload is expected to manage its own internal UI. We pass the handlers.
                Note: we avoid inline // comments inside JSX to prevent parser issues. */}
            <CsvUpload
              isOpen={csvOpen}
              onClose={() => setCsvOpen(false)}
              onImport={handleCsvImport}
            />
          </div>
        </div>
      )}

      {/* Export modal (responsive): bottom sheet on mobile, centered on larger */}
      {exportOpen && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/50 z-50 p-4">
          <div
            className="absolute inset-0"
            onClick={() => setExportOpen(false)}
            aria-hidden
          />
          <div className="relative w-full sm:max-w-md bg-gray-900 rounded-t-lg sm:rounded-lg p-6 z-10">
            <h3 className="text-lg text-gray-200 mb-4">Export As</h3>
            <div className="flex gap-4">
              <button
                onClick={() => exportCsv()}
                className="flex-1 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
              >
                CSV
              </button>
              <button
                onClick={() => alert("PDF export not implemented yet.")}
                className="flex-1 px-4 py-2 bg-purple-600 rounded hover:bg-purple-500"
              >
                PDF
              </button>
            </div>
            <button
              onClick={() => setExportOpen(false)}
              className="mt-4 text-sm text-gray-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
