// src/components/dashboard/TradeHistoryTable.tsx
"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Trash2, Pencil, Filter, DownloadCloud, FilePlus, Trash, UploadCloud } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import { useTrade } from "@/context/TradeContext";
import type { Trade } from "@/types/trade";
import AddTradeModal from "@/components/modals/AddTradeModal";
import CsvUpload from "@/components/dashboard/CsvUpload";
import JournalModal from "@/components/modals/JournalModal";
import { useUser } from "@/context/UserContext";
import { useTradingAccount } from "@/context/TradingAccountContext";
import AccountBadge from "@/components/AccountBadge";
import Modal from "@/components/ui/Modal";

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

  // Always compute RR from prices and outcome so changes to outcome reflect instantly
  const resultRR = computeResultRR({
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    outcome,
  });

  const duration =
    String(raw.duration ?? "") ||
    calcDuration(openTime || undefined, closeTime || undefined);

  // Preserve optional metadata fields provided by UI (strategy and screenshots)
  const strategy = String((raw as any).strategy ?? raw.reasonForTrade ?? "");
  const beforeScreenshotUrl = (raw as any).beforeScreenshotUrl
    ? String((raw as any).beforeScreenshotUrl)
    : undefined;
  const afterScreenshotUrl = (raw as any).afterScreenshotUrl
    ? String((raw as any).afterScreenshotUrl)
    : undefined;

  return {
  id: String(raw.id ?? ""),
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
  strategy,
  emotion: String(raw.emotion ?? "neutral"),
  journalNotes: String(raw.journalNotes ?? raw.notes ?? ""),
  notes: String(raw.notes ?? raw.journalNotes ?? ""),
  beforeScreenshotUrl,
  afterScreenshotUrl,
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
    importTrades,
    importLoading,
    deleteTrade,
    clearTrades,
  } = useTrade();
  const { plan } = useUser();
  const { notify } = useNotification();
  const { selected, accounts, select } = useTradingAccount();

  const [mounted, setMounted] = useState<boolean>(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [exportOpen, setExportOpen] = useState<boolean>(false);

  // CSV modal state (now opens a modal directly)
  const [csvOpen, setCsvOpen] = useState<boolean>(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);

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
  "openTime" | "closeTime" | "pnl" | "symbol" | "direction" | "lotSize" | "entryPrice" | "stopLossPrice" | "takeProfitPrice" | "duration" | "outcome" | "resultRR" | "strategy"
  >("closeTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // TODO: Implement full cloud migration logic
  const migrateLocalTrades = () => {
    notify({
      variant: "info",
      title: "Cloud Sync In Development",
      description: "This feature to migrate local trades to the cloud is coming soon!",
    });
  };

  // Migrate any old 'userTrades' cache into the unified TradeContext store ('trade-history').
  useEffect(() => {
    if (!hasLoaded.current) {
      try {
        if (typeof window !== "undefined") {
        const stored = localStorage.getItem("userTrades");
        if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = (parsed as Partial<Trade>[]).map(normalizeTrade);
        // Upsert into context-managed state
        importTrades(normalized).catch(console.error);
        // Clear legacy key to prevent divergence
        localStorage.removeItem("userTrades");
        }
        }
        }
      } catch {
        // ignore
      }
      hasLoaded.current = true;
    }
    setMounted(true);
  }, [importTrades]);

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
    let aVal: any, bVal: any;

    switch (sortField) {
    case "pnl":
        aVal = toNumber(getField(a, "pnl") ?? getField(a, "profit") ?? getField(a, "netpl"));
        bVal = toNumber(getField(b, "pnl") ?? getField(b, "profit") ?? getField(b, "netpl"));
      break;
    case "symbol":
    case "direction":
    case "outcome":
      case "strategy":
        aVal = toStringSafe(getField(a, sortField));
        bVal = toStringSafe(getField(b, sortField));
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case "lotSize":
      case "entryPrice":
        case "stopLossPrice":
        case "takeProfitPrice":
        case "resultRR":
          aVal = toNumber(getField(a, sortField));
          bVal = toNumber(getField(b, sortField));
          break;
        case "duration":
          // Parse duration string like "4h 32m" to minutes
          const parseDuration = (d: string) => {
            const hours = d.match(/(\d+)h/) ? parseInt(d.match(/(\d+)h/)![1]) : 0;
            const minutes = d.match(/(\d+)m/) ? parseInt(d.match(/(\d+)m/)![1]) : 0;
            return hours * 60 + minutes;
          };
          aVal = parseDuration(toStringSafe(getField(a, sortField)));
          bVal = parseDuration(toStringSafe(getField(b, sortField)));
          break;
        default:
          // Handle date fields
          const ta = toDateOrNull(getField(a, sortField));
          const tb = toDateOrNull(getField(b, sortField));
          aVal = ta ? ta.getTime() : 0;
          bVal = tb ? tb.getTime() : 0;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
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

  const handleCsvImport = async (imported: Partial<Trade>[]) => {
    if (!Array.isArray(imported) || imported.length === 0) return;
    const normalized = imported.map(normalizeTrade);
    await importTrades(normalized);
    setCsvOpen(false);
    // Notification is handled in importTrades
  };

  const exportCsv = () => {
    const hdr = [
      "symbol","direction","orderType","openTime","closeTime","session",
      "lotSize","entryPrice","stopLossPrice","takeProfitPrice","pnl",
      "outcome","resultRR","duration","strategy","emotion","reasonForTrade",
      "journalNotes","notes","commission","swap","tags"
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
      toStringSafe(getField(t, "duration")),
      toStringSafe(getField(t, "strategy")),
      toStringSafe(getField(t, "emotion")),
      toStringSafe(getField(t, "reasonForTrade")),
      toStringSafe(getField(t, "journalNotes")),
      toStringSafe(getField(t, "notes")),
      toStringSafe(getField(t, "commission")),
      toStringSafe(getField(t, "swap")),
      Array.isArray(getField(t, "tags")) ? (getField(t, "tags") as string[]).join("; ") : toStringSafe(getField(t, "tags")),
    ]);
    const csv = [hdr, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `trades_export_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);

    try { notify({ variant: 'success', title: 'Export completed', description: `${processed.length} trades exported to CSV.` }); } catch {}
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

          {/* Current trading account selector */}
          <div className="hidden md:flex items-center gap-3 mr-2">
            <span className="text-xs text-zinc-400">Account:</span>
            <select
              className="px-2 py-1 bg-zinc-800 text-white text-sm rounded border border-zinc-700"
              value={selected?.id || ''}
              onChange={(e) => select(e.target.value || null)}
              title="Select trading account"
            >
              {accounts.length === 0 && <option value="">None</option>}
              {accounts.map(a => {
                const isManual = a.mode === 'manual';
                const bal = isManual ? (typeof (a as any).initial_balance === 'number' ? (a as any).initial_balance : Number((a as any).initial_balance || 0)) : null;
                const label = isManual && Number.isFinite(bal)
                  ? `${a.name} (Manual — $${Number(bal).toFixed(2)})`
                  : `${a.name}${isManual ? ' (Manual)' : ''}`;
                return (
                  <option key={a.id} value={a.id}>{label}</option>
                );
              })}
            </select>
            <AccountBadge compact />
          </div>

          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={migrateLocalTrades}
            title="Migrate to Cloud"
          >
            <UploadCloud size={18} className="text-gray-300" />
          </button>

          <button
            className="p-2 bg-red-900/50 rounded-full hover:bg-red-800/70"
            onClick={() => setConfirmClearOpen(true)}
            title="Clear History"
            aria-haspopup="dialog"
          >
            <Trash size={18} className="text-red-300" />
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
        <div className="sm:hidden space-y-2 max-h-96 overflow-y-auto">
          {pageItems.length === 0 ? (
            <div className="p-4 text-center text-zinc-400">No trades found.</div>
          ) : (
            pageItems.map((t, idx) => (
              <MobileTradeCard key={String(getField(t, "id")) || idx} t={t} idx={idx} />
            ))
          )}
        </div>

        {/* Table for sm+ */}
        <div className="hidden sm:block overflow-x-auto bg-gray-800 rounded-xl shadow-lg max-h-96 w-full">
          {
            <table className="min-w-full text-sm text-left table-fixed">
            <thead className="bg-gray-700 text-gray-200 sticky top-0">
              <tr>
              {headerCell("Symbol", true, "symbol")}
              {headerCell("Direction", true, "direction")}
              <th className="px-3 py-2 font-medium border-b border-gray-600">Order Type</th>
              {headerCell("Open Time", true, "openTime")}
              {headerCell("Close Time", true, "closeTime")}
              <th className="px-3 py-2 font-medium border-b border-gray-600">Session</th>
              {headerCell("Lot Size", true, "lotSize")}
              {headerCell("Entry Price", true, "entryPrice")}
              {headerCell("Stop Loss", true, "stopLossPrice")}
              {headerCell("Take Profit", true, "takeProfitPrice")}
              {headerCell("PNL ($)", true, "pnl")}
              {headerCell("Duration", true, "duration")}
              {headerCell("Outcome", true, "outcome")}
              {headerCell("RR", true, "resultRR")}
              {headerCell("Strategy", true, "strategy")}
              <th className="px-3 py-2 font-medium border-b border-gray-600">Emotion</th>
              <th className="px-3 py-2 font-medium border-b border-gray-600">Notes</th>
              <th className="px-3 py-2 font-medium border-b border-gray-600">Before</th>
              <th className="px-3 py-2 font-medium border-b border-gray-600">After</th>
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
                      {/* Outcome column */}
                      <td className="px-3 py-2">{toStringSafe(getField(t, "outcome"))}</td>
                      {/* RR column */}
                      <td className="px-3 py-2">{formatRR(getField(t, "resultRR") ?? getField(t, "rr"))}</td>
                      {/* Strategy column */}
                      <td className="px-3 py-2">{toStringSafe(getField(t, "strategy") || getField(t, "reasonForTrade"))}</td>
                      <td className="px-3 py-2">{toStringSafe(getField(t, "emotion"))}</td>
                      <td className="px-3 py-2">
                        {toStringSafe(getField(t, "journalNotes") ?? getField(t, "notes"))}
                      </td>
                      <td className="px-3 py-2">
                        {toStringSafe(getField(t, "beforeScreenshotUrl")) ? (
                          <a href={toStringSafe(getField(t, "beforeScreenshotUrl"))} target="_blank" rel="noreferrer">
                            <img
                              src={toStringSafe(getField(t, "beforeScreenshotUrl"))}
                              alt="Before"
                              className="h-10 w-16 object-cover rounded border border-zinc-800"
                            />
                          </a>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {toStringSafe(getField(t, "afterScreenshotUrl")) ? (
                          <a href={toStringSafe(getField(t, "afterScreenshotUrl"))} target="_blank" rel="noreferrer">
                            <img
                              src={toStringSafe(getField(t, "afterScreenshotUrl"))}
                              alt="After"
                              className="h-10 w-16 object-cover rounded border border-zinc-800"
                            />
                          </a>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
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
                      onClick={() => {
                        // Create a copy of the trade with cleared prices and P&L
                        const duplicatedTrade = {
                            ...t,
                          id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            entryPrice: 0,
                              exitPrice: undefined,
                              pnl: 0,
                              outcome: 'Breakeven' as const,
                              openTime: new Date().toISOString(),
                              closeTime: undefined,
                              resultRR: 0,
                            };
                            addTrade(duplicatedTrade);
                            try { notify({ variant: 'success', title: 'Trade duplicated', description: 'A copy has been created with cleared prices.' }); } catch {}
                          }}
                          className="p-1 hover:text-green-400"
                          aria-label="Duplicate trade"
                        >
                          <FilePlus size={16} />
                        </button>
                        <button
                        onClick={() => setTradeToDelete(t)}
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
          }
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
          try { notify({ variant: 'info', title: 'Trade updated' }); } catch {}
        }}
      />

      {/* ADD — normalize to compute RR immediately */}
      <AddTradeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={(t) => {
          const normalized = normalizeTrade(t);
          addTrade(normalized);
          setIsAddOpen(false);
          try { notify({ variant: 'success', title: 'Trade added' }); } catch {}
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
        {importLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-t-lg sm:rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-white">Importing trades...</p>
                </div>
              </div>
            )}
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
                onClick={() => console.warn("PDF export not implemented yet.")}
                className="flex-1 px-4 py-2 bg-purple-600 rounded hover:bg-purple-500"
              >
                PDF
              </button>
              <button
                onClick={() => { setExportOpen(false); setConfirmClearOpen(true); }}
                className="flex-1 px-4 py-2 bg-red-700 rounded hover:bg-red-600"
              >
                Clear All
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
      {/* Confirm clear history modal */}
      <Modal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear Trade History"
        description="This will remove all local trades from your history. This action cannot be undone."
        size="sm"
      >
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={() => setConfirmClearOpen(false)}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/15"
          >
            No, keep trades
          </button>
          <button
            onClick={() => {
              try {
                clearTrades();
                notify({ variant: 'warning', title: 'Trade history cleared', description: 'All local trades have been removed.'});
              } catch (e) {
                notify({ variant: 'destructive', title: 'Failed to clear history' });
              } finally {
                setConfirmClearOpen(false);
              }
            }}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500"
          >
            Yes, clear
          </button>
        </div>
      </Modal>

      {/* Delete trade confirmation modal */}
      <Modal
        isOpen={!!tradeToDelete}
        onClose={() => setTradeToDelete(null)}
        title="Delete Trade"
        description={`Are you sure you want to delete this trade? This action cannot be undone.`}
        size="sm"
      >
        {tradeToDelete && (
          <div className="mt-4 p-3 bg-gray-800 rounded">
            <div className="text-sm">
              <div><strong>Symbol:</strong> {tradeToDelete.symbol}</div>
              <div><strong>Direction:</strong> {tradeToDelete.direction}</div>
              <div><strong>P&L:</strong> ${tradeToDelete.pnl?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={() => setTradeToDelete(null)}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (tradeToDelete) {
                deleteTrade(String(getField(tradeToDelete, "id")));
                try { notify({ variant: 'warning', title: 'Trade deleted' }); } catch {}
                setTradeToDelete(null);
              }
            }}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500"
          >
            Delete Trade
          </button>
        </div>
      </Modal>

    </div>
  );
}
