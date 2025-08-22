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
  const mins = Math.round(Math.abs(b.getTime() - a.getTime()) / 60000);
  return `${mins} min`;
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
  const direction = String(raw.direction ?? (toNumber(raw.takeProfitPrice) >= toNumber(raw.entryPrice) ? "Buy" : "Sell"));
  const orderType = String(raw.orderType ?? "Market Execution");
  const openTime = String(raw.openTime ?? "");
  const closeTime = String(raw.closeTime ?? "");
  const session = String(raw.session ?? "");
  const lotSize = toNumber(raw.lotSize);
  const entryPrice = toNumber(raw.entryPrice);
  const stopLossPrice = toNumber(raw.stopLossPrice);
  const takeProfitPrice = toNumber(raw.takeProfitPrice);
  let pnl = toNumber(raw.pnl);
  const outcome: Trade["outcome"] = (raw.outcome as Trade["outcome"]) ?? "Breakeven";

  // Enforce PnL sign from outcome
  if (outcome === "Win") pnl = Math.abs(pnl);
  else if (outcome === "Loss") pnl = -Math.abs(pnl);
  else pnl = 0;

  const resultRR =
    Number.isFinite(toNumber(raw.resultRR)) && toNumber(raw.resultRR) !== 0
      ? toNumber(raw.resultRR)
      : computeResultRR({ entryPrice, stopLossPrice, takeProfitPrice, outcome });

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

  const [mounted, setMounted] = useState<boolean>(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [exportOpen, setExportOpen] = useState<boolean>(false);

  const [csvMenuOpen, setCsvMenuOpen] = useState<boolean>(false);
  const [csvOpen, setCsvOpen] = useState<boolean>(false);
  const csvMenuRef = useRef<HTMLDivElement | null>(null);
  const csvButtonRef = useRef<HTMLButtonElement | null>(null);

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

  /* close CSV menu on outside click / Esc */
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!csvMenuOpen) return;
      const target = e.target as Node | null;
      if (!csvMenuRef.current || !csvButtonRef.current) return;
      if (csvMenuRef.current.contains(target) || csvButtonRef.current.contains(target))
        return;
      setCsvMenuOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setCsvMenuOpen(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [csvMenuOpen]);

  /* processed data (filters + search + sort) */
  const processed = useMemo(() => {
    const { symbol, outcome, fromDate, toDate, minPNL, maxPNL } = filters;
    const q = query.trim().toLowerCase();
    let filtered = trades.slice();

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
  }, [trades, filters, query, sortField, sortDir]);

  /* summary stats */
  const stats = useMemo(() => {
    const total = trades.length;
    let wins = 0;
    let totalPnl = 0;
    let rrSum = 0;
    let rrCount = 0;
    for (const t of trades) {
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
  }, [trades]);

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

  return (
    <div className="space-y-6">
      {/* Top controls + quick stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
              onClick={() => setFilterOpen(!filterOpen)}
              title="Filters"
              aria-pressed={filterOpen}
            >
              <Filter size={18} className="text-gray-300" />
            </button>

            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search symbol, id or notes..."
                className="px-3 py-2 rounded bg-[#0F1724] border border-zinc-700 text-white w-[320px]"
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

          <div className="hidden md:flex items-center gap-3 text-sm text-zinc-300 ml-4">
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
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={() => setExportOpen(true)}
            title="Export"
          >
            <DownloadCloud size={18} className="text-gray-300" />
          </button>

          <div className="relative">
            <button
              ref={csvButtonRef}
              className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 flex items-center gap-2"
              onClick={() => setCsvMenuOpen((s) => !s)}
              title="Import CSV"
              aria-expanded={csvMenuOpen}
              aria-haspopup="menu"
            >
              <FilePlus size={18} className="text-gray-300" />
            </button>

            <div
              ref={csvMenuRef}
              className={`origin-top-left absolute left-full ml-2 top-0 z-50 transform transition-all duration-200 ${
                csvMenuOpen
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
              }`}
              style={{ minWidth: 180 }}
              role="menu"
              aria-hidden={!csvMenuOpen}
            >
              <div className="bg-gray-900 text-white rounded-lg shadow-lg border border-zinc-700 overflow-hidden">
                <div className="p-3">
                  <div className="text-sm font-medium mb-2">CSV Import</div>
                  <p className="text-xs text-zinc-400 mb-3">
                    Upload CSV and map columns before import.
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 text-sm"
                      onClick={() => {
                        setCsvOpen(true);
                        setCsvMenuOpen(false);
                      }}
                    >
                      Upload CSV
                    </button>
                    <button
                      className="px-3 py-2 bg-zinc-800 rounded hover:bg-zinc-700 text-sm"
                      onClick={() => {
                        setCsvOpen(true);
                        setCsvMenuOpen(false);
                      }}
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            className="px-3 py-1 bg-green-600 rounded hover:bg-green-500 text-sm"
            onClick={() => setIsAddOpen(true)}
          >
            Add Trade
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="grid md:grid-cols-6 gap-2 mb-4 text-sm">
          {(["symbol", "outcome"] as const).map((f) => (
            <input
              key={f}
              type="text"
              className="p-2 rounded bg-gray-800 text-white"
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
              className="p-2 rounded bg-gray-800 text-white"
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
              className="p-2 rounded bg-gray-800 text-white"
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

      <div className="overflow-auto bg-gray-800 rounded-xl shadow-lg">
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
              <th className="px-3 py-2 font-medium border-b border-gray-600">Reason</th>
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
                    <td className="px-3 py-2">{toStringSafe(getField(t, "duration"))}</td>
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

      <div className="mt-3 flex items-center justify-between text-sm text-zinc-300">
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

      {/* CSV */}
      {csvOpen && (
        <CsvUpload
          isOpen={csvOpen}
          onClose={() => setCsvOpen(false)}
          onImport={(imported) => handleCsvImport(imported)}
        />
      )}

      {/* Export */}
      {exportOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg text-gray-200 mb-4">Export As</h3>
            <div className="flex gap-4">
              <button
                onClick={() => exportCsv()}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
              >
                CSV
              </button>
              <button
                onClick={() => alert("PDF export not implemented yet.")}
                className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500"
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
