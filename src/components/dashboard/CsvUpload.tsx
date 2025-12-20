"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
// papaparse often has no types in some setups; tolerate that here:
// @ts-ignore
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useTrade } from "@/context/TradeContext";
import { useUser } from "@/context/UserContext";
import type { Trade } from "@/types/trade";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";

/* =========================
   Header heuristics / utils
   ========================= */

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

/* papaparse default alias (handles ESM/CJS differences) */
const PapaLib: any =
    ((Papa as unknown) && (Papa as any).parse
        ? (Papa as any)
        : (Papa as any).default ?? Papa) as any;

/* =========================
   CSV <-> Trade mapping
   ========================= */

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

    const trade: Trade = {
        id: get(["id", "deal_id", "ticket", "trade_id"], `imported-${idx}-${Date.now()}`),
        symbol: get(["symbol", "pair", "instrument"], "UNKNOWN"),
        entryPrice: parseNumber(get(["entryPrice", "entry_price", "openPrice", "open_price", "price_open"], "0")),
        exitPrice: parseNumber(get(["exitPrice", "exit_price", "closePrice", "close_price", "price_close"], "0")),
        lotSize: parseNumber(get(["lotSize", "lots", "volume", "size"], "1")),
        pnl: parseNumber(get(["pnl", "profit", "netpl", "profit_loss"], "0")),
        openTime: toISO(get(["openTime", "open_time", "time", "entry_time"], "")),
        closeTime: toISO(get(["closeTime", "close_time", "time_close", "exit_time"], "")),
        outcome: (get(["outcome", "result"], "Breakeven") as Trade["outcome"]) ?? "Breakeven",
        notes: get(["notes", "comment", "journalNotes", "client_comment"], ""),
        reasonForTrade: get(["reason", "reasonForTrade", "strategy"], ""),
        strategy: get(["strategy", "strategyName"], ""),
        emotion: get(["emotion"], ""),
        created_at: new Date(),
        updated_at: new Date().toISOString(),
    };

    return trade;
}

/* =========================
   Component
   ========================= */

type CsvUploadProps = {
    isOpen?: boolean;
    onClose?: () => void;
    onImport?: (imported: Partial<Trade>[]) => void;
};

export default function CsvUpload({
    isOpen: controlledOpen,
    onClose: controlledOnClose,
    onImport: controlledOnImport,
}: CsvUploadProps): React.ReactElement {
    const { importTrades } = useTrade();
    const { plan } = useUser();

    const [open, setOpen] = useState<boolean>(false);
    const [parsing, setParsing] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [fileName, setFileName] = useState<string | null>(null); // ✅ Fixed: was incorrectly set to `= null`

    const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
    const [mappedHeaders, setMappedHeaders] = useState<Record<string, string>>({});
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [previewAll, setPreviewAll] = useState(false);

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
                    const rawResults = PapaLib.parse(txt, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: false,
                    });

                    const results = (rawResults as {
                        data?: unknown;
                        meta?: { fields?: unknown[] };
                    }) ?? {};
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

    const handleImport = useCallback(async () => {
        if (!mappedForImport || mappedForImport.length === 0) {
            toast.error("No rows to import.");
            return;
        }
        try {
            // Enforce plan-based time-window limits
            const now = new Date();
            let cutoff: Date | null = null;
            if (plan === 'starter') {
                cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 45);
            } else if (plan === 'pro') {
                cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 182);
            }

            // If user attempts to import beyond their plan window, force upgrade
            if (cutoff) {
                const violates = mappedForImport.some((row) => {
                    const r = row as Record<string, unknown>;
                    const ot = r.openTime ?? (r as any).open_time ?? (r as any).entered_at ?? r.time ?? null;
                    const ct = r.closeTime ?? (r as any).close_time ?? (r as any).closed_at ?? null;
                    const raw = (ct as string) || (ot as string) || "";
                    if (!raw) return false;
                    const d = new Date(String(raw));
                    if (Number.isNaN(d.getTime())) return false;
                    return d < cutoff!;
                });
                if (violates) {
                    toast.error(`Your ${plan} plan allows importing up to ${plan === 'starter' ? '45 days' : '182 days'} of history. Please upgrade to import older trades.`);
                    setOpen(false);
                    // Navigate to upgrade tab (works within dashboard layout)
                    try { (window as any).location.hash = '#upgrade'; } catch { }
                    return;
                }
            }

            const tradesToImport = mappedForImport.map((row, idx) => {
                const trade: Partial<Trade> = {};
                for (const key in row) {
                    const value = row[key];
                    if (key === 'lotSize' || key === 'entryPrice' || key === 'stopLossPrice' || key === 'takeProfitPrice' || key === 'pnl' || key === 'commission' || key === 'swap') {
                        (trade as any)[key] = Number(value) || 0;
                    } else if (key === 'pinned' || key === 'reviewed') {
                        (trade as any)[key] = Boolean(value);
                    } else if (key === 'tags') {
                        (trade as any)[key] = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
                    } else {
                        (trade as any)[key] = value;
                    }
                }
                // Don't set ID - let Supabase auto-generate UUID
                return trade;
            });

            setParsing(true);
            setProgress(60);

            // Call batch API directly instead of using context
            const response = await fetch("/api/trades/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trades: tradesToImport }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.message || "Failed to import trades");
            }

            const result = await response.json();
            setProgress(100);

            // Refresh trades in context after successful import
            try {
                await importTrades([]);
            } catch (e) {
                console.warn("Failed to refresh trades after import", e);
            }

            toast.success(`Imported ${result.count || tradesToImport.length} trades`);
            setTimeout(() => {
                setOpen(false);
                setParsing(false);
                if (typeof controlledOnImport === "function") {
                    try {
                        controlledOnImport(mappedForImport as Partial<Trade>[]);
                    } catch (e) {
                        // continue
                        // eslint-disable-next-line no-console
                        console.warn("onImport handler threw", e);
                    }
                }
                if (typeof controlledOnClose === "function") {
                    try {
                        controlledOnClose();
                    } catch (e) {
                        // eslint-disable-next-line no-console
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
    }, [mappedForImport, importTrades, controlledOnImport, controlledOnClose, plan]);

    const PreviewTable = useMemo(() => {
        if (!rows || rows.length === 0) {
            return <div className="text-sm text-zinc-400">No parsed rows yet.</div>;
        }
        const headers =
            detectedHeaders.length > 0
                ? detectedHeaders
                : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
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
                        <button
                            onClick={() => setPreviewAll((p) => !p)}
                            className="text-xs text-indigo-400 hover:underline"
                        >
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
                description="Import trade history from CSV or Excel files. We'll auto-map columns to trade fields."
            >
                <div className="flex flex-col h-[70vh] min-h-[500px] gap-4">
                    {/* Top controls */}
                    <div className="flex items-center gap-3">
                        <label className="inline-block p-2 rounded bg-zinc-700 cursor-pointer">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={onFileChange}
                                className="hidden"
                            />
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-5 h-5 text-indigo-400"
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
                                <span className="text-sm text-white">Choose file</span>
                            </div>
                        </label>

                        <div className="text-sm text-zinc-300">
                            {fileName ? <strong className="text-white">{fileName}</strong> : "No file selected"}
                        </div>

                        {parsing && <div className="ml-auto text-xs text-zinc-400">Parsing…</div>}
                    </div>

                    {/* Center: scrollable content area */}
                    <div className="overflow-auto pr-2">
                        <div className="mb-4">
                            <div className="text-xs text-zinc-400 mb-1">Parsing progress</div>
                            <div className="w-full bg-zinc-900 h-2 rounded overflow-hidden">
                                <div
                                    className="h-2 transition-all"
                                    style={{
                                        width: `${progress}%`,
                                        background: progress > 80 ? "#10b981" : "#60a5fa",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="text-sm font-semibold text-zinc-200">Detected headers</div>
                            <div className="text-xs text-zinc-400">
                                {detectedHeaders.length > 0 ? detectedHeaders.join(", ") : "No headers yet"}
                            </div>
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

                    {/* Footer actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 bg-gradient-to-t from-transparent to-transparent">
                        <button
                            onClick={() => {
                                setOpen(false);
                                if (typeof controlledOnClose === "function") controlledOnClose();
                            }}
                            className="px-4 py-2 rounded bg-zinc-700 text-sm text-zinc-200"
                            disabled={parsing}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={parsing || rows.length === 0}
                            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-50"
                        >
                            Import ({rows.length})
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
