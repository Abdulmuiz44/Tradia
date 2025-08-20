// src/components/dashboard/TradeHistoryTable.tsx
"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Trash2, Pencil, Filter, DownloadCloud, FilePlus } from "lucide-react";
import { TradeContext } from "@/context/TradeContext";
import type { Trade } from "@/types/trade";
import AddTradeModal from "@/components/modals/AddTradeModal";
import CsvUpload from "@/components/dashboard/CsvUpload";

/**
 * Lightweight coercion helpers to avoid using `any`.
 */
function toNumber(v: unknown): number {
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
  if (v instanceof Date) return v.toISOString();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
function toDateOrNull(v: unknown): Date | null {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const s = String(v);
    if (/^\d{10}$/.test(s)) return new Date(Number(v) * 1000);
    if (/^\d{13}$/.test(s)) return new Date(Number(v));
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000);
    if (/^\d{13}$/.test(s)) return new Date(Number(s));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Safe accessor for dynamic trade fields.
 */
function getField(trade: Trade, key: string): unknown {
  return (trade as unknown as Record<string, unknown>)[key];
}

/**
 * Local EditTradeModal replicates AddTradeModal UI but is wired to update an existing trade.
 * This keeps AddTradeModal untouched while allowing full edit of columns.
 */
type EditTradeModalProps = {
  isOpen: boolean;
  trade: Trade | null;
  onClose: () => void;
  onSave: (updated: Trade) => void;
};

function EditTradeModal({ isOpen, trade, onClose, onSave }: EditTradeModalProps) {
  const [form, setForm] = useState<Partial<Trade> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...(trade ?? {}) });
    } else {
      setForm(null);
    }
  }, [isOpen, trade]);

  const handleChange = <K extends keyof Trade>(field: K, value: Trade[K]) => {
    setForm((prev) => ({ ...(prev ?? {}), [field]: value }));
  };

  const calculateDuration = (start?: string, end?: string): string => {
    if (!start || !end) return "";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (Number.isNaN(diff) || diff < 0) return "Invalid";
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  const calculateRRNumeric = (): number | null => {
    if (!form) return null;
    const entry = Number(form.entryPrice ?? 0);
    const stop = Number(form.stopLossPrice ?? 0);
    const tp = Number(form.takeProfitPrice ?? 0);
    const lot = Number(form.lotSize ?? 0);
    const outcome = String(form.outcome ?? "Breakeven");

    if (!entry || !stop || !tp || !lot) return null;

    const riskPerUnit = Math.abs(entry - stop);
    const rewardPerUnit = Math.abs(tp - entry);
    const ratio = riskPerUnit === 0 ? null : rewardPerUnit / riskPerUnit;
    if (ratio === null) return null;

    if (outcome === "Win") return ratio;
    if (outcome === "Loss") return -1;
    return 0;
  };

  const handleSaveClick = () => {
    if (!form) return;

    const required: Array<keyof Trade> = [
      "symbol",
      "direction",
      "orderType",
      "openTime",
      "closeTime",
      "session",
      "lotSize",
      "entryPrice",
      "stopLossPrice",
      "takeProfitPrice",
      "outcome",
      "pnl",
      "reasonForTrade",
      "emotion",
      "journalNotes",
    ];

    for (const f of required) {
      const val = form[f];
      if (val === undefined || val === null || String(val) === "") {
        alert(`Please fill in the "${String(f)}" field.`);
        return;
      }
    }

    const updated: Trade = {
      id:
        (form.id as string) ??
        (trade?.id ?? `${String(form.symbol ?? "TRD")}-${Date.now()}`),
      symbol: String(form.symbol ?? ""),
      direction: String(form.direction ?? ""),
      orderType: String(form.orderType ?? ""),
      openTime: String(form.openTime ?? ""),
      closeTime: String(form.closeTime ?? ""),
      session: String(form.session ?? ""),
      lotSize: Number(form.lotSize ?? 0),
      entryPrice: Number(form.entryPrice ?? 0),
      stopLossPrice: Number(form.stopLossPrice ?? 0),
      takeProfitPrice: Number(form.takeProfitPrice ?? 0),
      pnl: Number(form.pnl ?? 0),
      resultRR: Number(form.resultRR ?? 0),
      outcome: String(form.outcome ?? ""),
      duration:
        String(form.duration ?? "") ||
        calculateDuration(
          String(form.openTime ?? ""),
          String(form.closeTime ?? "")
        ),
      reasonForTrade: String(form.reasonForTrade ?? ""),
      emotion: String(form.emotion ?? ""),
      journalNotes: String(form.journalNotes ?? ""),
    };

    const rrNumeric = calculateRRNumeric();
    if (rrNumeric !== null) {
      updated.resultRR = rrNumeric;
    }

    onSave(updated);
    onClose();
  };

  if (!isOpen || !form) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-2xl z-50 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Edit Trade
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Symbol</label>
            <input
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.symbol ?? "")}
              onChange={(e) =>
                handleChange("symbol", e.target.value as Trade["symbol"])
              }
              placeholder="e.g. EURUSD"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Direction</label>
            <select
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.direction ?? "Buy")}
              onChange={(e) =>
                handleChange("direction", e.target.value as Trade["direction"])
              }
            >
              <option>Buy</option>
              <option>Sell</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Order Type</label>
            <input
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.orderType ?? "")}
              onChange={(e) =>
                handleChange("orderType", e.target.value as Trade["orderType"])
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Session</label>
            <input
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.session ?? "")}
              onChange={(e) =>
                handleChange("session", e.target.value as Trade["session"])
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Open Time</label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.openTime ?? "").slice(0, 16)}
              onChange={(e) =>
                handleChange(
                  "openTime",
                  new Date(e.target.value).toISOString() as Trade["openTime"]
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Close Time</label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.closeTime ?? "").slice(0, 16)}
              onChange={(e) =>
                handleChange(
                  "closeTime",
                  new Date(e.target.value).toISOString() as Trade["closeTime"]
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lot Size</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.lotSize ?? 0)}
              onChange={(e) =>
                handleChange("lotSize", Number(e.target.value) as Trade["lotSize"])
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Entry Price</label>
            <input
              type="number"
              step="0.00001"
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.entryPrice ?? 0)}
              onChange={(e) =>
                handleChange(
                  "entryPrice",
                  Number(e.target.value) as Trade["entryPrice"]
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stop Loss</label>
            <input
              type="number"
              step="0.00001"
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.stopLossPrice ?? 0)}
              onChange={(e) =>
                handleChange(
                  "stopLossPrice",
                  Number(e.target.value) as Trade["stopLossPrice"]
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Take Profit</label>
            <input
              type="number"
              step="0.00001"
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.takeProfitPrice ?? 0)}
              onChange={(e) =>
                handleChange(
                  "takeProfitPrice",
                  Number(e.target.value) as Trade["takeProfitPrice"]
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">PNL ($)</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.pnl ?? 0)}
              onChange={(e) => handleChange("pnl", Number(e.target.value) as Trade["pnl"])}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Outcome</label>
            <select
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.outcome ?? "Breakeven")}
              onChange={(e) =>
                handleChange("outcome", e.target.value as Trade["outcome"])
              }
            >
              <option>Win</option>
              <option>Loss</option>
              <option>Breakeven</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Reason For Trade</label>
            <input
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.reasonForTrade ?? "")}
              onChange={(e) =>
                handleChange("reasonForTrade", e.target.value as Trade["reasonForTrade"])
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Emotion</label>
            <select
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.emotion ?? "neutral")}
              onChange={(e) => handleChange("emotion", e.target.value as Trade["emotion"])}
            >
              <option>Confident</option>
              <option>Fear</option>
              <option>Greed</option>
              <option>Doubt</option>
              <option>FOMO</option>
              <option>neutral</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Journal Notes</label>
            <textarea
              rows={3}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.journalNotes ?? "")}
              onChange={(e) =>
                handleChange("journalNotes", e.target.value as Trade["journalNotes"])
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-md">
            Cancel
          </button>
          <button onClick={handleSaveClick} className="px-4 py-2 bg-blue-600 text-white rounded-md">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main TradeHistoryTable component
 */
export default function TradeHistoryTable() {
  const { trades, updateTrade, addTrade, deleteTrade, setTradesFromCsv, importTrades } =
    useContext(TradeContext);

  const [mounted, setMounted] = useState<boolean>(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const [csvOpen, setCsvOpen] = useState<boolean>(false);
  const hasLoaded = useRef<boolean>(false);

  const [filters, setFilters] = useState(() => ({
    symbol: "",
    outcome: "",
    fromDate: "",
    toDate: "",
    minPNL: "",
    maxPNL: "",
  }) as {
    symbol: string;
    outcome: string;
    fromDate: string;
    toDate: string;
    minPNL: string;
    maxPNL: string;
  });

  const [query, setQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"openTime" | "closeTime" | "pnl" | "symbol">(
    "closeTime"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  useEffect(() => {
    if (!hasLoaded.current) {
      try {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("userTrades");
          if (stored) {
            const parsed = JSON.parse(stored) as unknown;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTradesFromCsv(parsed as unknown[]);
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

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("userTrades", JSON.stringify(trades));
      }
    } catch {}
  }, [trades]);

  const handleEditClick = (t: Trade) => {
    setEditingTrade(t);
  };

  const handleSaveEdited = (t: Trade) => {
    updateTrade(t);
    setEditingTrade(null);
  };

  const handleAdd = (t: Trade) => {
    const id = t.id || `${t.symbol}-${Date.now()}`;
    addTrade({ ...t, id });
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => deleteTrade(id);

  const handleFilterChange = (field: keyof typeof filters, value: string) =>
    setFilters((p) => ({ ...p, [field]: value }));

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
      const tAms = ta ? ta.getTime() : 0;
      const tBms = tb ? tb.getTime() : 0;
      return sortDir === "asc" ? tAms - tBms : tBms - tAms;
    });

    return filtered;
  }, [trades, filters, query, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const pageItems = processed.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (f: typeof sortField) => {
    if (sortField === f) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(f);
      setSortDir("desc");
    }
    setPage(1);
  };

  const handleCsvImport = (imported: Partial<Trade>[]) => {
    if (!Array.isArray(imported) || imported.length === 0) return;
    importTrades(imported as unknown[]);
    setCsvOpen(false);
  };

  const exportCsv = () => {
    const hdr = [
      "symbol",
      "direction",
      "orderType",
      "openTime",
      "closeTime",
      "session",
      "lotSize",
      "entryPrice",
      "stopLossPrice",
      "takeProfitPrice",
      "pnl",
      "outcome",
      "rr",
      "notes",
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
      toStringSafe(getField(t, "resultRR") ?? getField(t, "rr")),
      toStringSafe(getField(t, "notes") ?? getField(t, "journalNotes")),
    ]);
    const csv =
      [hdr, ...rows]
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

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex items-center justify-between">
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

          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={() => setExportOpen(true)}
            title="Export"
          >
            <DownloadCloud size={18} className="text-gray-300" />
          </button>
          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={() => setCsvOpen(true)}
            title="Import CSV"
          >
            <FilePlus size={18} className="text-gray-300" />
          </button>
        </div>
        <button
          className="px-3 py-1 bg-green-600 rounded hover:bg-green-500 text-sm"
          onClick={() => setIsAddOpen(true)}
        >
          Add Trade
        </button>
      </div>

      {/* Filters panel */}
      {filterOpen && (
        <div className="grid md:grid-cols-6 gap-2 mb-4 text-sm">
          {["symbol", "outcome"].map((f) => (
            <input
              key={f}
              type="text"
              className="p-2 rounded bg-gray-800 text-white"
              placeholder={f}
              value={(filters as Record<string, string>)[f]}
              onChange={(e) => handleFilterChange(f as keyof typeof filters, e.target.value)}
            />
          ))}
          {["fromDate", "toDate"].map((f) => (
            <input
              key={f}
              type="date"
              className="p-2 rounded bg-gray-800 text-white"
              value={(filters as Record<string, string>)[f]}
              onChange={(e) => handleFilterChange(f as keyof typeof filters, e.target.value)}
            />
          ))}
          {["minPNL", "maxPNL"].map((f) => (
            <input
              key={f}
              type="number"
              className="p-2 rounded bg-gray-800 text-white"
              placeholder={f}
              value={(filters as Record<string, string>)[f]}
              onChange={(e) => handleFilterChange(f as keyof typeof filters, e.target.value)}
            />
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto bg-gray-800 rounded-xl shadow-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-700 text-gray-200 sticky top-0">
            <tr>
              {[
                "Symbol",
                "Direction",
                "Order Type",
                "Open Time",
                "Close Time",
                "Session",
                "Lot Size",
                "Entry Price",
                "Stop Loss",
                "Take Profit",
                "PNL ($)",
                "Duration",
                "Outcome",
                "RR",
                "Reason",
                "Emotion",
                "Notes",
                "Action",
              ].map((h) => (
                <th key={h} className="px-3 py-2 font-medium border-b border-gray-600">
                  {h}
                </th>
              ))}
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
                const pnl = toNumber(getField(t, "pnl") ?? getField(t, "profit") ?? getField(t, "netpl"));
                const idKey = toStringSafe(getField(t, "id")) || `${toStringSafe(getField(t, "symbol"))}-${idx}`;
                return (
                  <tr key={idKey} className="hover:bg-gray-700 transition-colors">
                    <td className="px-3 py-2">{toStringSafe(getField(t, "symbol"))}</td>
                    <td className="px-3 py-2">{toStringSafe(getField(t, "direction"))}</td>
                    <td className="px-3 py-2">{toStringSafe(getField(t, "orderType"))}</td>
                    <td className="px-3 py-2">
                      {toDateOrNull(getField(t, "openTime")) ? format(toDateOrNull(getField(t, "openTime")) as Date, "Pp") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {toDateOrNull(getField(t, "closeTime")) ? format(toDateOrNull(getField(t, "closeTime")) as Date, "Pp") : "—"}
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
                    <td className="px-3 py-2">{toStringSafe(getField(t, "resultRR") ?? getField(t, "rr"))}</td>
                    <td className="px-3 py-2">{toStringSafe(getField(t, "reasonForTrade"))}</td>
                    <td className="px-3 py-2">{toStringSafe(getField(t, "emotion"))}</td>
                    <td className="px-3 py-2">{toStringSafe(getField(t, "journalNotes") ?? getField(t, "notes"))}</td>
                    <td className="px-3 py-2 flex items-center gap-2">
                      <button onClick={() => handleEditClick(t)} className="p-1 hover:text-blue-400" aria-label="Edit trade">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(String(getField(t, "id")))} className="p-1 hover:text-red-400" aria-label="Delete trade">
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

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-zinc-300">
        <div>
          Showing {processed.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, processed.length)} of {processed.length}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-zinc-700 disabled:opacity-50">
            Prev
          </button>
          <div>Page {page} / {totalPages}</div>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded bg-zinc-700 disabled:opacity-50">
            Next
          </button>
        </div>
      </div>

      {/* Edit modal (local) */}
      <EditTradeModal isOpen={!!editingTrade} trade={editingTrade} onClose={() => setEditingTrade(null)} onSave={handleSaveEdited} />

      {/* Add modal (existing component) */}
      <AddTradeModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSave={handleAdd} />

      {/* CSV Upload Modal */}
      {csvOpen && (
        <CsvUpload isOpen onClose={() => setCsvOpen(false)} onImport={(importedTrades: Partial<Trade>[]) => handleCsvImport(importedTrades)} />
      )}

      {/* Export Options Modal */}
      {exportOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg text-gray-200 mb-4">Export As</h3>
            <div className="flex gap-4">
              <button onClick={() => exportCsv()} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
                CSV
              </button>
              <button onClick={() => alert("PDF export not implemented yet.") } className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500">
                PDF
              </button>
            </div>
            <button onClick={() => setExportOpen(false)} className="mt-4 text-sm text-gray-400 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
