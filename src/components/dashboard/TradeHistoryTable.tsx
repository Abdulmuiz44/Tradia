// src/components/dashboard/TradeHistoryTable.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { Trade } from "@/types/trade";

interface TradeHistoryTableProps {
  trades: ReadonlyArray<Trade>;
}

/**
 * Helpers to coerce unknown trade fields into usable types without using `any`.
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
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
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
    // 10-digit -> seconds
    if (/^\d{10}$/.test(s)) return new Date(Number(v) * 1000);
    // 13-digit -> ms
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
 * Safe accessor for unknown trade shape. Avoids `any` casts.
 */
function getField(trade: Trade, key: string): unknown {
  if (trade && typeof trade === "object") {
    return (trade as unknown as Record<string, unknown>)[key];
  }
  return undefined;
}

export default function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  const [query, setQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"openTime" | "closeTime" | "pnl" | "symbol">(
    "closeTime"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Copy the array to avoid mutating props
    let filtered = trades.slice();

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

      // openTime / closeTime -> date compare
      const ta = toDateOrNull(getField(a, sortField));
      const tb = toDateOrNull(getField(b, sortField));
      const tAms = ta ? ta.getTime() : 0;
      const tBms = tb ? tb.getTime() : 0;
      return sortDir === "asc" ? tAms - tBms : tBms - tAms;
    });

    return filtered;
  }, [trades, query, sortField, sortDir]);

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

  return (
    <div className="bg-[#0B1220] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
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
          <button
            onClick={() => {
              setQuery("");
              setPage(1);
            }}
            className="px-3 py-2 rounded bg-zinc-700 text-white"
            aria-label="Clear search"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <span>Sort:</span>
          <button
            onClick={() => toggleSort("closeTime")}
            className={`px-2 py-1 rounded ${sortField === "closeTime" ? "bg-zinc-700" : ""}`}
            aria-pressed={sortField === "closeTime"}
          >
            Close Time
          </button>
          <button
            onClick={() => toggleSort("openTime")}
            className={`px-2 py-1 rounded ${sortField === "openTime" ? "bg-zinc-700" : ""}`}
            aria-pressed={sortField === "openTime"}
          >
            Open Time
          </button>
          <button
            onClick={() => toggleSort("pnl")}
            className={`px-2 py-1 rounded ${sortField === "pnl" ? "bg-zinc-700" : ""}`}
            aria-pressed={sortField === "pnl"}
          >
            PnL
          </button>
          <button
            onClick={() => toggleSort("symbol")}
            className={`px-2 py-1 rounded ${sortField === "symbol" ? "bg-zinc-700" : ""}`}
            aria-pressed={sortField === "symbol"}
          >
            Symbol
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-700">
              <th className="p-2 w-1/6">Close Time</th>
              <th className="p-2 w-1/6">Open Time</th>
              <th className="p-2 w-1/6">Symbol</th>
              <th className="p-2 w-1/6">Outcome</th>
              <th className="p-2 w-1/6">PnL</th>
              <th className="p-2 w-1/6">Notes</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-zinc-400">
                  No trades found.
                </td>
              </tr>
            ) : (
              pageItems.map((t) => {
                const closeDate = toDateOrNull(getField(t, "closeTime"));
                const openDate = toDateOrNull(getField(t, "openTime"));
                const pnlValue =
                  toNumber(getField(t, "pnl") ?? getField(t, "profit") ?? getField(t, "netpl"));
                const notes = toStringSafe(getField(t, "notes") ?? getField(t, "journalNotes"));
                const idKey = toStringSafe(getField(t, "id") ?? `${toStringSafe(getField(t, "symbol"))}-${toStringSafe(getField(t, "openTime"))}`);

                return (
                  <tr key={idKey} className="border-b border-zinc-800">
                    <td className="p-2 align-top">{closeDate ? closeDate.toLocaleString() : "—"}</td>
                    <td className="p-2 align-top">{openDate ? openDate.toLocaleString() : "—"}</td>
                    <td className="p-2 align-top font-medium">{toStringSafe(getField(t, "symbol")) || "—"}</td>
                    <td className="p-2 align-top">{toStringSafe(getField(t, "outcome")) || "—"}</td>
                    <td
                      className={`p-2 align-top ${
                        pnlValue > 0 ? "text-green-400" : pnlValue < 0 ? "text-red-400" : "text-white"
                      }`}
                    >
                      {Number.isFinite(pnlValue) ? `$${pnlValue.toFixed(2)}` : toStringSafe(getField(t, "pnl"))}
                    </td>
                    <td className="p-2 align-top">
                      <div className="truncate max-w-[240px]">{notes}</div>
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
          Showing {processed.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, processed.length)} of {processed.length}
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
            Page {page} / {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded bg-zinc-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
