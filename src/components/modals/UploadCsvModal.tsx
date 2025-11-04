"use client";

import React, { useState } from "react";
import type { Trade } from "@/types/trade";

type UploadCsvModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (trades: Trade[]) => void;
};

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
      i += 1;
      continue;
    }

    if (ch === "\n") {
      cur.push(curCell);
      rows.push(cur);
      cur = [];
      curCell = "";
      i += 1;
      continue;
    }

    curCell += ch;
    i += 1;
  }

  if (curCell !== "" || cur.length > 0) {
    cur.push(curCell);
    rows.push(cur);
  }

  return rows;
}

function rowToTradeObject(row: Record<string, string>, idx: number): Trade {
  const get = (keys: string[], fallback = ""): string =>
    keys.reduce<string>((acc, k) => acc || (row[k]?.trim() ?? ""), "").trim() ||
    fallback;

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
    if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000).toISOString();
    if (/^\d{13}$/.test(v)) return new Date(Number(v)).toISOString();
    return v;
  };

  const outcomeRaw = get(["outcome", "result"], "Breakeven");
  const validOutcomes: Trade["outcome"][] = ["Win", "Loss", "Breakeven"];
  const outcome = (validOutcomes.includes(
    outcomeRaw as Trade["outcome"]
  )
    ? (outcomeRaw as Trade["outcome"])
    : "Breakeven") as Trade["outcome"];

  const trade: Trade = {
    id: get(["id", "deal_id", "ticket", "trade_id"], `imported-${idx}-${Date.now()}`),
    symbol: get(["symbol", "pair", "instrument"], "UNKNOWN"),
    entryPrice: parseNumber(get(["entryPrice", "entry_price", "openPrice", "open_price", "price_open"], "0")),
    exitPrice: parseNumber(get(["exitPrice", "exit_price", "closePrice", "close_price", "price_close"], "0")),
    lotSize: parseNumber(get(["lotSize", "lots", "volume", "size"], "1")),
    pnl: parseNumber(get(["pnl", "profit", "netpl", "profit_loss"], "0")),
    profitLoss: get(["profitLoss", "profit_loss", "profit_formatted"], ""),
    openTime: toISO(get(["openTime", "open_time", "time", "entry_time"], "")),
    closeTime: toISO(get(["closeTime", "close_time", "time_close", "exit_time"], "")),
    outcome,
    notes: get(["notes", "comment", "journalNotes", "client_comment"], ""),
    reasonForTrade: get(["reason", "reasonForTrade", "strategy"], ""),
    strategy: get(["strategy", "strategyName"], ""),
    emotion: get(["emotion"], ""),
  };

  return trade;
}

// type guard for parsed row values
function isTradeArray(arr: Array<Trade | null | undefined | false>): arr is Trade[] {
  return arr.every(Boolean);
}

export default function UploadCsvModal({
  isOpen,
  onClose,
  onImport,
}: UploadCsvModalProps) {
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

      const header = rows[0].map((h) => (h ?? "").toString().trim());
      const dataRows = rows.slice(1);

      const parsedMaybe = dataRows.map((r, i) => {
        const obj: Record<string, string> = {};
        for (let j = 0; j < header.length; j += 1) {
          const key = header[j] && header[j].length > 0 ? header[j] : `col${j}`;
          obj[key] = r[j] ?? "";
        }
        try {
          return rowToTradeObject(obj, i);
        } catch (err) {
          console.error("Row parse error", { row: r, err });
          return null;
        }
      });

      // filter using a proper type guard
      const parsed: Trade[] = parsedMaybe.filter((t): t is Trade => !!t);

      if (!parsed || parsed.length === 0) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onClose()}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import trades from CSV"
        className="relative z-10 w-full max-w-3xl bg-gray-900 text-white rounded-lg shadow-2xl overflow-auto p-6 max-h-[90vh]"
      >
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold">Import Trades (CSV)</h3>
            <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
              Upload a CSV where the first row is the header (e.g. id,symbol,openTime,closeTime,pnl,entryPrice,exitPrice,lotSize,notes). The importer will attempt to map common column names.
            </p>
          </div>

          <button
            onClick={() => onClose()}
            className="text-sm text-zinc-300 hover:text-white px-2 py-1 rounded"
            aria-label="Close import modal"
          >
            Close
          </button>
        </header>

        <div className="space-y-4">
          <label
            htmlFor="csv-file"
            className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-zinc-700 p-3 bg-zinc-900 hover:bg-zinc-800"
            data-track="csv_browse"
            data-track-meta='{"location":"upload_csv_modal"}'
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-indigo-400"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 3v12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 7l4-4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="3"
                  y="14"
                  width="18"
                  height="6"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>

              <div>
                <div className="text-sm text-gray-100 font-medium">
                  Choose CSV file
                </div>
                <div className="text-xs text-zinc-400">
                  CSV file (first row must be header)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center px-3 py-1 rounded bg-indigo-600 text-white text-sm">
                Browse
              </span>
            </div>
          </label>

          {file ? (
            <div className="flex items-center justify-between rounded-md p-3 bg-zinc-900 border border-zinc-700">
              <div className="text-sm text-zinc-100">
                <div className="font-medium">{file.name}</div>
                <div className="text-xs text-zinc-400">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFile(null);
                    setError(null);
                  }}
                  className="text-sm px-3 py-1 rounded bg-transparent border border-zinc-700"
                >
                  Remove
                </button>
                <button
                  onClick={doImport}
                  disabled={parsing}
                  className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60"
                >
                  {parsing ? "Importing…" : "Import CSV"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">
              No file selected yet. Use &ldquo;Browse&rdquo; to choose a CSV file.
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded bg-red-900/20 text-sm text-red-300 border border-red-800/40">
              {error}
            </div>
          )}

          {!file && (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => onClose()}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-sm"
                disabled={parsing}
              >
                Cancel
              </button>
              <button
                onClick={doImport}
                disabled={!file || parsing}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60"
              >
                {parsing ? "Importing…" : "Import CSV"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
