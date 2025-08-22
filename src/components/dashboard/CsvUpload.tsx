// src/components/dashboard/CsvUpload.tsx
"use client";

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
// papaparse often has no types in some setups; tolerate that here:
// @ts-ignore - allow use even if no @types/papaparse installed
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { TradeContext } from "@/context/TradeContext";
import type { Trade } from "@/types/trade";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";

/**
 * Simple header heuristics => canonical field keys used by TradeContext normalizer.
 */
const HEADER_KEY_MAP: [RegExp, string][] = [
  [/^\s*sym(?:bol)?\s*$/i, "symbol"],
  [/^\s*ticker\s*$/i, "symbol"],
  [/^\s*instrument\s*$/i, "symbol"],

  [/^\s*open\s*time\s*$/i, "openTime"],
  [/^\bopen\b/i, "openTime"],
  [/^\bentry_time\b/i, "openTime"],

  [/^\s*close\s*time\s*$/i, "closeTime"],
  [/^\bclose\b/i, "closeTime"],

  [/^\s*profit(?:[_\s-]?loss|loss)?\s*$/i, "pnl"],
  [/^\s*pnl\s*$/i, "pnl"],
  [/^\bnetpl\b/i, "pnl"],

  [/^\s*entry(?:[_\s-]?price)?\s*$/i, "entryPrice"],
  [/^\s*stop(?:[_\s-]?loss)?(?:[_\s-]?price)?\s*$/i, "stopLossPrice"],
  [/^\s*take(?:[_\s-]?profit)?(?:[_\s-]?price)?\s*$/i, "takeProfitPrice"],

  [/^\s*lots?\s*$/i, "lotSize"],
  [/^\s*volume\s*$/i, "lotSize"],

  [/^\s*side\s*$/i, "direction"],
  [/^\s*order(?:[_\s-]?type)?\s*$/i, "orderType"],
  [/^\s*outcome\s*$/i, "outcome"],
  [/^\s*rr\b/i, "resultRR"],
  [/^\s*notes?\s*$/i, "journalNotes"],
  [/^\s*reason\b/i, "reasonForTrade"],
  [/^\s*id\b/i, "id"],
  [/^\s*ticket\b/i, "id"],
  [/^\s*session\b/i, "session"],
];

function guessHeaderKey(header: string): string | undefined {
  const h = header.trim();
  for (const [re, key] of HEADER_KEY_MAP) {
    if (re.test(h)) return key;
  }
  return undefined;
}

function coerceValue(v: unknown): string | number {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return s;
}

type ParsedRow = Record<string, string | number | null | undefined>;
const PREVIEW_LIMIT = 20;

/**
 * papaparse can export either a default or a cjs object depending on build.
 * Make a safe runtime alias so we always call parse on the correct object.
 *
 * Note: typed as `any` to avoid TS issues when no @types/papaparse installed.
 */
const PapaLib: any = ((Papa as unknown) && (Papa as any).parse ? (Papa as any) : (Papa as any).default ?? Papa) as any;

type CsvUploadProps = {
  isOpen?: boolean;
  onClose?: () => void;
  onImport?: (imported: Partial<Trade>[]) => void;
};

export default function CsvUpload({ isOpen: controlledOpen, onClose: controlledOnClose, onImport: controlledOnImport }: CsvUploadProps): React.ReactElement {
  const { setTradesFromCsv } = useContext(TradeContext) as { setTradesFromCsv: (arr: unknown[]) => void };

  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [previewAll, setPreviewAll] = useState(false);

  // sync controlled open prop if provided
  useEffect(() => {
    if (typeof controlledOpen === "boolean") {
      setOpen(controlledOpen);
    }
  }, [controlledOpen]);

  useEffect(() => {
    if (!open) {
      setParsing(false);
      setProgress(0);
      setFileName(null);
      setDetectedHeaders([]);
      setMappedHeaders({});
      setRows([]);
      setPreviewAll(false);
    }
  }, [open]);

  const buildAutoMapping = useCallback((headers: string[]) => {
    const m: Record<string, string> = {};
    headers.forEach((h) => {
      const g = guessHeaderKey(h);
      m[h] = g ?? h;
    });
    return m;
  }, []);

  const parseExcel = useCallback(
    (file: File) => {
      setParsing(true);
      setProgress(5);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          setProgress(20);
          const data = ev.target?.result;
          if (!data) throw new Error("Empty file buffer");
          const wb = XLSX.read(data as ArrayBuffer, { type: "array" });
          const sheetName = wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          const parsed = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: "" });
          const headers = parsed.length > 0 ? Object.keys(parsed[0]) : [];
          const mapping = buildAutoMapping(headers);

          const coerced = parsed.map((r) => {
            const out: ParsedRow = {};
            headers.forEach((h) => (out[h] = coerceValue((r as Record<string, unknown>)[h])));
            return out;
          });

          setDetectedHeaders(headers);
          setMappedHeaders(mapping);
          setRows(coerced);
          setProgress(95);
          setTimeout(() => setProgress(100), 60);
        } catch (err) {
          console.error("Excel parse error", err);
          toast.error("Failed to parse Excel file.");
          setProgress(0);
        } finally {
          setTimeout(() => setParsing(false), 120);
        }
      };
      reader.onerror = (err) => {
        console.error("FileReader error", err);
        toast.error("Failed to read file.");
        setParsing(false);
        setProgress(0);
      };
      reader.readAsArrayBuffer(file);
    },
    [buildAutoMapping]
  );

  const parseCsvText = useCallback(
    (file: File) => {
      setParsing(true);
      setProgress(5);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const txt = ev.target?.result;
        if (typeof txt !== "string") {
          toast.error("Failed to read CSV as text.");
          setParsing(false);
          setProgress(0);
          return;
        }

        try {
          setProgress(25);
          // removed generic call on untyped function; assert shape afterward
          const rawResults = PapaLib.parse(txt, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
          });

          // ensure shape and types
          const results = (rawResults as { data?: unknown; meta?: { fields?: unknown[] } }) ?? {};
          const parsedRows = Array.isArray(results.data) ? (results.data as ParsedRow[]) : [];

          const headers =
            results &&
            Array.isArray(results.meta?.fields) &&
            (results.meta!.fields as unknown[]).length > 0
              ? (results.meta!.fields as unknown[]).map((f) => String(f))
              : parsedRows.length > 0
              ? Object.keys(parsedRows[0])
              : [];

          const mapping = buildAutoMapping(headers);
          const coerced: ParsedRow[] = parsedRows.map((r) => {
            const out: ParsedRow = {};
            headers.forEach((h) => {
              out[h] = coerceValue((r as Record<string, unknown>)[h]);
            });
            return out;
          });

          setDetectedHeaders(headers);
          setMappedHeaders(mapping);
          setRows(coerced);
          setProgress(95);
          setTimeout(() => setProgress(100), 60);
        } catch (err) {
          console.error("CSV parse error", err);
          toast.error("Failed to parse CSV file.");
          setProgress(0);
        } finally {
          setTimeout(() => setParsing(false), 120);
        }
      };
      reader.onerror = (err) => {
        console.error("FileReader error", err);
        toast.error("Failed to read file.");
        setParsing(false);
        setProgress(0);
      };

      reader.readAsText(file);
    },
    [buildAutoMapping]
  );

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      setDetectedHeaders([]);
      setMappedHeaders({});
      setRows([]);
      setPreviewAll(false);

      const fname = file.name.toLowerCase();
      if (fname.endsWith(".xlsx") || fname.endsWith(".xls")) {
        parseExcel(file);
      } else {
        parseCsvText(file);
      }
    },
    [parseCsvText, parseExcel]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      handleFile(f);
      e.currentTarget.value = "";
    },
    [handleFile]
  );

  const mappedForImport = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return rows.map((r) => {
      const mapped: Record<string, unknown> = {};
      Object.keys(r).forEach((h) => {
        const target = mappedHeaders[h] ?? h;
        mapped[target] = r[h];
      });
      return mapped;
    });
  }, [rows, mappedHeaders]);

  const handleImport = useCallback(() => {
    if (!mappedForImport || mappedForImport.length === 0) {
      toast.error("No rows to import.");
      return;
    }
    try {
      setParsing(true);
      setProgress(60);
      setTradesFromCsv(mappedForImport as unknown[]);
      setProgress(100);
      toast.success(`Imported ${mappedForImport.length} rows`);
      setTimeout(() => {
        setOpen(false);
        setParsing(false);
        // notify parent if controlled
        if (typeof controlledOnImport === "function") {
          try {
            controlledOnImport(mappedForImport as Partial<Trade>[]);
          } catch (e) {
            console.warn("onImport handler threw", e);
          }
        }
        if (typeof controlledOnClose === "function") {
          try {
            controlledOnClose();
          } catch (e) {
            console.warn("onClose handler threw", e);
          }
        }
      }, 220);
    } catch (err) {
      console.error("Import error", err);
      toast.error("Import failed.");
      setParsing(false);
      setProgress(0);
    }
  }, [mappedForImport, setTradesFromCsv]);

  const PreviewTable = useMemo(() => {
    if (!rows || rows.length === 0) {
      return <div className="text-sm text-zinc-400">No parsed rows yet.</div>;
    }
    const headers = detectedHeaders.length > 0 ? detectedHeaders : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const show = previewAll ? rows : rows.slice(0, PREVIEW_LIMIT);

    return (
      <div>
        <div className="max-h-56 overflow-auto border border-zinc-700 rounded bg-[#0b1220] p-2">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-2 py-1 text-zinc-300">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {show.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-[#061025]/10" : ""}>
                  {headers.map((h) => (
                    <td key={h} className="px-2 py-1 text-zinc-200">
                      {String((r as Record<string, unknown>)[h] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > PREVIEW_LIMIT && (
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              Showing {previewAll ? rows.length : PREVIEW_LIMIT} of {rows.length}
            </div>
            <button onClick={() => setPreviewAll((p) => !p)} className="text-xs text-indigo-400 hover:underline">
              {previewAll ? "Show less" : "Show all"}
            </button>
          </div>
        )}
      </div>
    );
  }, [rows, detectedHeaders, previewAll]);

  return (
    <div>
      {/* If parent controls open state, don't render the trigger button here */}
      {typeof controlledOpen !== "boolean" && (
        <Button onClick={() => setOpen(true)} className="mt-4">
          Upload CSV
        </Button>
      )}

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          if (typeof controlledOnClose === "function") controlledOnClose();
        }}
        title="Upload trade CSV / XLSX"
        description="We will attempt to auto-map file columns to trade fields. Preview then import."
      >
        {/* Modal inner container: column layout with a scrollable main area so footer stays visible */}
        <div className="flex flex-col h-[70vh] min-h-[500px] gap-4">
          {/* Top controls */}
          <div className="flex items-center gap-3">
            <label className="inline-block p-2 rounded bg-zinc-700 cursor-pointer">
              <input type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} className="hidden" />
              <span className="text-sm text-white">Choose file</span>
            </label>
            <div className="text-sm text-zinc-300">{fileName ? <strong className="text-white">{fileName}</strong> : "No file selected"}</div>
            {parsing && <div className="ml-auto text-xs text-zinc-400">Parsing…</div>}
          </div>

          {/* Center: scrollable content area */}
          <div className="overflow-auto pr-2">
            <div className="mb-4">
              <div className="text-xs text-zinc-400 mb-1">Parsing progress</div>
              <div className="w-full bg-zinc-900 h-2 rounded overflow-hidden">
                <div
                  className="h-2 transition-all"
                  style={{ width: `${progress}%`, background: progress > 80 ? "#10b981" : "#60a5fa" }}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-semibold text-zinc-200">Detected headers</div>
              <div className="text-xs text-zinc-400">{detectedHeaders.length > 0 ? detectedHeaders.join(", ") : "No headers yet"}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-semibold text-zinc-200 mb-2">Auto-mapping preview</div>
              <div className="max-h-36 overflow-auto border border-zinc-700 rounded p-2 bg-[#0b1220]">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-zinc-400 px-2 py-1">File header</th>
                      <th className="text-zinc-400 px-2 py-1">Mapped key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(mappedHeaders).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-2 py-2 text-zinc-400">
                          No mapping yet
                        </td>
                      </tr>
                    ) : (
                      Object.entries(mappedHeaders).map(([raw, mapped]) => (
                        <tr key={raw} className="odd:bg-[#061025]/10">
                          <td className="px-2 py-1 text-zinc-200">{raw}</td>
                          <td className="px-2 py-1 text-zinc-300">{mapped}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-zinc-200 mb-2">Preview rows</div>
              {PreviewTable}
            </div>
          </div>

          {/* Sticky footer inside modal so Import/Cancel always visible */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 bg-gradient-to-t from-transparent to-transparent">
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded bg-zinc-700 text-sm text-zinc-200">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={parsing || rows.length === 0}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              Import ({rows.length})
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
