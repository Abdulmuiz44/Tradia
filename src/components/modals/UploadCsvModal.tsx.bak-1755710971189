// src/components/modals/UploadCsvModal.tsx
"use client";

import React, { useState } from "react";
import type { Trade } from "@/types/trade";

type UploadCsvModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Callback invoked with an array of parsed trades.
   * The parent will typically insert them into the store/context.
   */
  onImport: (trades: Trade[]) => void;
};

/**
 * Lightweight CSV parser that supports quoted values and commas inside quotes.
 * Returns array of rows, each row is an array of cell strings.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let curCell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // escaped quote
          curCell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      curCell += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ",") {
      cur.push(curCell);
      curCell = "";
      i += 1;
      continue;
    }

    if (ch === "\r") {
      // ignore CR, handle CRLF via LF logic
      i += 1;
      continue;
    }

    if (ch === "\n") {
      cur.push(curCell);
      rows.push(cur);
      // reset
      cur = [];
      curCell = "";
      i += 1;
      continue;
    }

    curCell += ch;
    i += 1;
  }

  // trailing cell
  if (curCell !== "" || cur.length > 0) {
    cur.push(curCell);
    rows.push(cur);
  }

  return rows;
}

/**
 * Attempts to map a CSV row object to a Trade object.
 * Uses permissive coercion of common column names.
 */
function rowToTradeObject(row: Record<string, string>, idx: number): Trade {
  const get = (keys: string[], fallback = ""): string =>
    keys.reduce<string>((acc, k) => acc || (row[k]?.trim() ?? ""), "").trim() || fallback;

  const parseNumber = (v: string): number => {
    if (!v) return 0;
    const cleaned = v.replace(/[^0-9.\-eE]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const toISO = (v: string): string => {
    if (!v) return "";
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString();
    // try numeric epoch seconds or ms
    if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000).toISOString();
    if (/^\d{13}$/.test(v)) return new Date(Number(v)).toISOString();
    return v;
  };

  const trade: Trade = {
    id: get(["id", "deal_id", "ticket", "trade_id"], `imported-${idx}-${Date.now()}`),
    symbol: get(["symbol", "pair", "instrument"], "UNKNOWN"),
    entryPrice: get(["entryPrice", "entry_price", "openPrice", "open_price", "price_open"], ""),
    exitPrice: get(["exitPrice", "exit_price", "closePrice", "close_price", "price_close"], ""),
    lotSize: get(["lotSize", "lots", "volume", "size"], "1"),
    pnl: parseNumber(get(["pnl", "profit", "netpl", "profit_loss"], "0")),
    profitLoss: get(["profitLoss", "profit_loss", "profit_formatted"], ""),
    openTime: toISO(get(["openTime", "open_time", "time", "entry_time"], "")),
    closeTime: toISO(get(["closeTime", "close_time", "time_close", "exit_time"], "")),
    outcome: (get(["outcome", "result"], "Breakeven") as Trade["outcome"]) ?? "Breakeven",
    notes: get(["notes", "comment", "journalNotes", "client_comment"], ""),
    reasonForTrade: get(["reason", "reasonForTrade", "strategy"], ""),
    strategy: get(["strategy", "strategyName"], ""),
    emotion: get(["emotion"], ""),
    // keep timestamps for server if present (optional fields on your Trade type)
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Trade;

  return trade;
}

export default function UploadCsvModal({ isOpen, onClose, onImport }: UploadCsvModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  };

  const doImport = async () => {
    setError(null);

    if (!file) {
      setError("Please choose a CSV file to import.");
      return;
    }

    setParsing(true);

    try {
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (rows.length === 0) {
        setError("CSV file appears empty.");
        setParsing(false);
        return;
      }

      const header = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1);

      const parsed: Trade[] = dataRows
        .map((r, i) => {
          const obj: Record<string, string> = {};
          for (let j = 0; j < header.length; j += 1) {
            const key = header[j] ?? `col${j}`;
            obj[key] = r[j] ?? "";
          }
          return rowToTradeObject(obj, i);
        })
        .filter(Boolean);

      if (parsed.length === 0) {
        setError("No data rows found in CSV.");
        setParsing(false);
        return;
      }

      onImport(parsed);
      setFile(null);
      onClose();
    } catch (err) {
      setError("Failed to parse CSV file.");
      console.error("CSV import error:", err);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => onClose()} aria-hidden />
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-[#0b1220] rounded-lg shadow-lg overflow-hidden p-6">
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Import trades from CSV</h3>
          <button onClick={() => onClose()} className="text-sm text-zinc-500 hover:text-zinc-300">Close</button>
        </header>

        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Upload a CSV where the first row is the header (e.g. id,symbol,openTime,closeTime,pnl,entryPrice,exitPrice,lotSize,notes).
            The importer will attempt to map common column names.
          </p>

          <div>
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          </div>

          {file && (
            <div className="text-sm text-zinc-300">
              Selected file: <strong>{file.name}</strong> — {(file.size / 1024).toFixed(1)} KB
            </div>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => onClose()}
              className="px-4 py-2 bg-zinc-700 text-white rounded"
              disabled={parsing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={doImport}
              disabled={parsing}
              className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60"
            >
              {parsing ? "Importing…" : "Import CSV"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
