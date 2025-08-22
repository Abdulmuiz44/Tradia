// src/components/modals/JournalModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { Trade } from "@/types/trade";

type JournalModalProps = {
  isOpen: boolean;
  trade: Trade | null;
  onClose: () => void;
  /**
   * Called when user saves the trade. The implementation in parent
   * typically expects a fully formed Trade object (with id).
   */
  onSave: (updated: Trade) => void;
};

const ORDER_TYPES = ["Market Execution", "Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop"];
const SESSIONS = ["London", "Asian", "New York"];
const EMOTIONS = [
  { value: "confident", label: "Confident" },
  { value: "fear", label: "Fear" },
  { value: "greed", label: "Greed" },
  { value: "doubt", label: "Doubt" },
  { value: "fomo", label: "FOMO" },
  { value: "neutral", label: "Neutral" },
];

function toLocalDatetimeInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // produce YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function isoFromLocalDatetimeInput(val: string): string {
  // The input is in local time like "2025-08-22T14:30" — create ISO in UTC using Date constructor
  if (!val) return "";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

export default function JournalModal({ isOpen, trade, onClose, onSave }: JournalModalProps) {
  // editing fields (start from trade values)
  const [symbol, setSymbol] = useState<string>("");
  const [orderType, setOrderType] = useState<string>(ORDER_TYPES[0]);
  const [session, setSession] = useState<string>(SESSIONS[0]);
  const [openTimeInput, setOpenTimeInput] = useState<string>(""); // datetime-local
  const [closeTimeInput, setCloseTimeInput] = useState<string>(""); // datetime-local
  const [lotSize, setLotSize] = useState<string>("1");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [stopLossPrice, setStopLossPrice] = useState<string>("");
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>("");
  const [pnl, setPnl] = useState<string>("0");
  const [outcome, setOutcome] = useState<Trade["outcome"]>("Breakeven");
  const [reasonForTrade, setReasonForTrade] = useState<string>("");
  const [emotion, setEmotion] = useState<string>("neutral");
  const [notes, setNotes] = useState<string>("");

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !trade) {
      // reset
      setSymbol("");
      setOrderType(ORDER_TYPES[0]);
      setSession(SESSIONS[0]);
      setOpenTimeInput("");
      setCloseTimeInput("");
      setLotSize("1");
      setEntryPrice("");
      setStopLossPrice("");
      setTakeProfitPrice("");
      setPnl("0");
      setOutcome("Breakeven");
      setReasonForTrade("");
      setEmotion("neutral");
      setNotes("");
      setError(null);
      setSaving(false);
      return;
    }

    // populate from trade
    setSymbol(String(trade.symbol ?? ""));
    setOrderType(String(trade.orderType ?? ORDER_TYPES[0]));
    setSession(String(trade.session ?? SESSIONS[0]));
    setOpenTimeInput(toLocalDatetimeInputValue(trade.openTime));
    setCloseTimeInput(toLocalDatetimeInputValue(trade.closeTime));
    setLotSize(trade.lotSize != null ? String(trade.lotSize) : "1");
    setEntryPrice(trade.entryPrice != null ? String(trade.entryPrice) : "");
    setStopLossPrice(trade.stopLossPrice != null ? String(trade.stopLossPrice) : "");
    setTakeProfitPrice(trade.takeProfitPrice != null ? String(trade.takeProfitPrice) : "");
    setPnl(trade.pnl != null ? String(trade.pnl) : "0");
    setOutcome((trade.outcome as Trade["outcome"]) ?? "Breakeven");
    setReasonForTrade(String(trade.reasonForTrade ?? ""));
    setEmotion(String(trade.emotion ?? "neutral"));
    setNotes(String(trade.journalNotes ?? trade.notes ?? ""));
    setError(null);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, trade]);

  // outcome change should adjust pnl sign automatically
  useEffect(() => {
    if (!pnl && outcome === "Breakeven") {
      setPnl("0");
      return;
    }
    // coerce to number if possible
    const n = Number(String(pnl ?? "").replace(/,/g, ""));
    if (Number.isNaN(n)) return;
    if (outcome === "Win" && n < 0) {
      setPnl(String(Math.abs(n)));
    } else if (outcome === "Loss" && n > 0) {
      setPnl(String(-Math.abs(n)));
    } else if (outcome === "Breakeven") {
      setPnl("0");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  if (!isOpen) return null;

  const onSaveClick = async () => {
    setError(null);

    // basic validation
    if (!symbol || String(symbol).trim().length === 0) {
      setError("Symbol is required.");
      return;
    }

    // ensure open/close times are valid ISO or empty
    const openIso = openTimeInput ? isoFromLocalDatetimeInput(openTimeInput) : "";
    const closeIso = closeTimeInput ? isoFromLocalDatetimeInput(closeTimeInput) : "";

    if (openTimeInput && !openIso) {
      setError("Invalid open time.");
      return;
    }
    if (closeTimeInput && !closeIso) {
      setError("Invalid close time.");
      return;
    }

    // parse numbers allowing full precision (step="any")
    const parsedLot = Number(String(lotSize).trim()) || 0;
    const parsedEntry = entryPrice !== "" ? Number(String(entryPrice).trim()) : NaN;
    const parsedStop = stopLossPrice !== "" ? Number(String(stopLossPrice).trim()) : NaN;
    const parsedTP = takeProfitPrice !== "" ? Number(String(takeProfitPrice).trim()) : NaN;
    let parsedPnl = pnl !== "" ? Number(String(pnl).trim()) : NaN;

    // If outcome is Win, ensure pnl positive; Loss => negative; Breakeven => 0
    if (outcome === "Win") parsedPnl = Math.abs(isNaN(parsedPnl) ? 0 : parsedPnl);
    if (outcome === "Loss") parsedPnl = -Math.abs(isNaN(parsedPnl) ? 0 : parsedPnl);
    if (outcome === "Breakeven") parsedPnl = 0;

    // More minimal validation: entry and pnl should be numbers
    if (!isFinite(parsedEntry) || isNaN(parsedEntry)) {
      setError("Entry price must be a number.");
      return;
    }
    if (!isFinite(parsedPnl)) {
      setError("PNL must be a valid number.");
      return;
    }

    setSaving(true);

    try {
      const updated: Trade = {
        id: trade?.id ?? `${symbol}-${Date.now()}`,
        symbol: String(symbol),
        orderType: String(orderType),
        session: String(session),
        openTime: openIso || "",
        closeTime: closeIso || "",
        lotSize: parsedLot,
        entryPrice: parsedEntry,
        stopLossPrice: isNaN(parsedStop) ? 0 : parsedStop,
        takeProfitPrice: isNaN(parsedTP) ? 0 : parsedTP,
        pnl: parsedPnl,
        resultRR: trade?.resultRR ?? 0,
        outcome: outcome,
        duration: trade?.duration ?? "",
        reasonForTrade: String(reasonForTrade ?? ""),
        emotion: String(emotion ?? "neutral"),
        journalNotes: String(notes ?? ""),
        notes: String(notes ?? ""),
        // preserve other fields if present on original trade
        ...(trade ? { ...trade } : {}),
      } as Trade;

      // Overwrite fields we explicitly edited (to ensure priority)
      updated.symbol = String(symbol);
      updated.orderType = String(orderType);
      updated.session = String(session);
      updated.openTime = openIso || updated.openTime || "";
      updated.closeTime = closeIso || updated.closeTime || "";
      updated.lotSize = parsedLot;
      updated.entryPrice = parsedEntry;
      updated.stopLossPrice = isNaN(parsedStop) ? 0 : parsedStop;
      updated.takeProfitPrice = isNaN(parsedTP) ? 0 : parsedTP;
      updated.pnl = parsedPnl;
      updated.outcome = outcome;
      updated.reasonForTrade = String(reasonForTrade ?? "");
      updated.emotion = String(emotion ?? "neutral");
      updated.journalNotes = String(notes ?? "");
      updated.notes = String(notes ?? "");
      updated.updated_at = new Date().toISOString();

      await Promise.resolve(onSave(updated));
      setSaving(false);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Failed to save trade: ${msg}`);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-3xl bg-[#071026] rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {trade ? `Edit Trade — ${trade.symbol ?? ""}` : "Edit Trade"}
            </h3>
            {trade && (
              <div className="text-xs text-zinc-400">
                Trade ID: {trade.id ?? "—"} • PnL:{" "}
                <span className={typeof trade.pnl === "number" && trade.pnl >= 0 ? "text-green-400" : "text-red-400"}>
                  {typeof trade.pnl === "number" ? `${trade.pnl}` : String(trade.pnl ?? "—")}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!saving) onClose();
              }}
              className="text-sm text-zinc-300 hover:text-white px-2 py-1 rounded"
              aria-label="Close edit"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
                placeholder="e.g. EURUSD"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              >
                {ORDER_TYPES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              >
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Lot size</label>
              <input
                type="number"
                step="any"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Open time</label>
              <input
                type="datetime-local"
                value={openTimeInput}
                onChange={(e) => setOpenTimeInput(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Close time</label>
              <input
                type="datetime-local"
                value={closeTimeInput}
                onChange={(e) => setCloseTimeInput(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Entry price</label>
              <input
                type="text"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="Full precision allowed (e.g. 1.234567)"
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Stop loss</label>
              <input
                type="text"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Take profit</label>
              <input
                type="text"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Outcome</label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as Trade["outcome"])}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              >
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
                <option value="Breakeven">Breakeven</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">PNL ($)</label>
              <input
                type="number"
                step="any"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-300 mb-1">Reason for trade</label>
              <input
                type="text"
                value={reasonForTrade}
                onChange={(e) => setReasonForTrade(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-300 mb-1">Emotion</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              >
                {EMOTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-300 mb-1">Journal notes</label>
              <textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your trade hindsight, what went well, what you can improve..."
                className="w-full p-2 rounded bg-[#0b1220] border border-zinc-800 text-white"
              />
            </div>
          </div>

          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800 bg-gradient-to-t from-transparent to-transparent">
          <button
            type="button"
            onClick={() => {
              if (!saving) onClose();
            }}
            className="px-4 py-2 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSaveClick}
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Trade"}
          </button>
        </div>
      </div>
    </div>
  );
}
