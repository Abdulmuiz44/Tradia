// src/components/modals/JournalModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Trade } from "@/types/trade";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
  onSave: (updatedTrade: Trade) => void;
};

export default function JournalModal({ isOpen, onClose, trade, onSave }: Props) {
  const [form, setForm] = useState<Partial<Trade>>({});

  // Initialize form from the passed-in trade
  useEffect(() => {
    if (trade) {
      setForm({ ...trade });
    }
  }, [trade]);

  const handleChange = (field: keyof Trade, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Calculates how long the trade was open
  const calculateDuration = (start: string, end: string): string => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 0) return "Invalid";
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  // Compute RR string based on entry/sl/tp and outcome
  const calculateRR = (entry: number, sl: number, tp: number, outcome: string): string => {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return "0RR";
    const ratio = (reward / risk).toFixed(2);
    if (outcome === "Loss") return `-${ratio}RR`;
    if (outcome === "Breakeven") return `0RR`;
    return `+${ratio}RR`;
  };

  const handleSave = () => {
    // All required fields
    const required: (keyof Trade)[] = [
      "symbol", "direction", "orderType",
      "openTime", "closeTime", "session",
      "lotSize", "entryPrice", "stopLossPrice", "takeProfitPrice",
      "pnl", "outcome", "reasonForTrade", "emotion", "journalNotes"
    ];

    for (let f of required) {
      if (form[f] === undefined || form[f] === "") {
        alert(`Please fill in "${f}"`);
        return;
      }
    }
    if (!trade) return;

    // parse numeric fields
    const entry = parseFloat(form.entryPrice as any);
    const sl = parseFloat(form.stopLossPrice as any);
    const tp = parseFloat(form.takeProfitPrice as any);
    const pnl = parseFloat(form.pnl as any);
    const outcome = form.outcome as string;

    const updated: Trade = {
      ...trade,
      ...form,
      entryPrice: entry,
      stopLossPrice: sl,
      takeProfitPrice: tp,
      lotSize: parseFloat(form.lotSize as any),
      pnl,
      duration: calculateDuration(form.openTime as string, form.closeTime as string),
      resultRR: calculateRR(entry, sl, tp, outcome),
      reasonForTrade: form.reasonForTrade ?? "",
      journalNotes: form.journalNotes ?? "",
    } as Trade;

    onSave(updated);
    onClose();
  };

  if (!isOpen || !trade) return null;

  const inputClass =
    "w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-2xl z-50 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Edit Trade Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Symbol */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Symbol</label>
            <input
              className={inputClass}
              value={form.symbol ?? ""}
              onChange={e => handleChange("symbol", e.target.value)}
              placeholder="e.g. EURUSD"
            />
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Direction</label>
            <select
              className={inputClass}
              value={form.direction ?? "Buy"}
              onChange={e => handleChange("direction", e.target.value)}
            >
              {["Buy", "Sell"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Order Type</label>
            <select
              className={inputClass}
              value={form.orderType ?? "Market execution"}
              onChange={e => handleChange("orderType", e.target.value)}
            >
              {["Market execution","Buy limit","Sell limit","Buy stop","Sell stop"]
                .map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Session */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Session</label>
            <select
              className={inputClass}
              value={form.session ?? "London"}
              onChange={e => handleChange("session", e.target.value)}
            >
              {["London","Asian","New York"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Open Time */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Open Time</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={form.openTime ?? ""}
              onChange={e => handleChange("openTime", e.target.value)}
            />
          </div>

          {/* Close Time */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Close Time</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={form.closeTime ?? ""}
              onChange={e => handleChange("closeTime", e.target.value)}
            />
          </div>

          {/* Lot Size */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Lot Size</label>
            <input
              type="number"
              className={inputClass}
              value={form.lotSize ?? ""}
              onChange={e => handleChange("lotSize", parseFloat(e.target.value))}
              placeholder="e.g. 0.01"
            />
          </div>

          {/* Entry Price */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Entry Price</label>
            <input
              type="number"
              className={inputClass}
              value={form.entryPrice ?? ""}
              onChange={e => handleChange("entryPrice", parseFloat(e.target.value))}
              placeholder="e.g. 1.2345"
            />
          </div>

          {/* Stop Loss Price */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Stop Loss Price</label>
            <input
              type="number"
              className={inputClass}
              value={form.stopLossPrice ?? ""}
              onChange={e => handleChange("stopLossPrice", parseFloat(e.target.value))}
              placeholder="e.g. 1.2300"
            />
          </div>

          {/* Take Profit Price */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Take Profit Price</label>
            <input
              type="number"
              className={inputClass}
              value={form.takeProfitPrice ?? ""}
              onChange={e => handleChange("takeProfitPrice", parseFloat(e.target.value))}
              placeholder="e.g. 1.2400"
            />
          </div>

          {/* PNL ($) */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">PNL ($)</label>
            <input
              type="text"
              className={inputClass}
              value={form.pnl ?? ""}
              onChange={e => handleChange("pnl", e.target.value)}
              placeholder="+50.00 or -25.00"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Duration (Min)</label>
            <input
              className={inputClass}
              value={form.duration ?? ""}
              readOnly
            />
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Outcome</label>
            <select
              className={inputClass}
              value={form.outcome ?? "Win"}
              onChange={e => handleChange("outcome", e.target.value)}
            >
              {["Win", "Loss", "Breakeven"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Result (RR) */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Result (RR)</label>
            <input
              className={inputClass}
              value={
                form.entryPrice != null &&
                form.stopLossPrice != null &&
                form.takeProfitPrice != null &&
                form.outcome
                  ? calculateRR(
                      form.entryPrice as number,
                      form.stopLossPrice as number,
                      form.takeProfitPrice as number,
                      form.outcome as string
                    )
                  : form.resultRR ?? ""
              }
              readOnly
              placeholder="auto-calculated"
            />
          </div>

          {/* Reason For Trade */}
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Reason For Trade</label>
            <input
              className={inputClass}
              value={form.reasonForTrade ?? ""}
              onChange={e => handleChange("reasonForTrade", e.target.value)}
              placeholder="e.g. breakout on H1"
            />
          </div>

          {/* Emotion */}
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Emotion</label>
            <select
              className={inputClass}
              value={form.emotion ?? "Confident"}
              onChange={e => handleChange("emotion", e.target.value)}
            >
              {["Confident","Fear","Greed","Doubt","FOMO"].map(em => <option key={em}>{em}</option>)}
            </select>
          </div>

          {/* Journal Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Journal Notes</label>
            <textarea
              className={`${inputClass} h-28 resize-none`}
              value={form.journalNotes ?? ""}
              onChange={e => handleChange("journalNotes", e.target.value)}
              placeholder="Write your reflections or trade review..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
