// src/components/modals/AddTradeModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Trade } from "@/types/trade";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTrade: Trade) => void;
};

export default function AddTradeModal({ isOpen, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<Trade>>({});

  // Create a datetime-local string from a Date
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (isOpen) {
      const nowLocal = new Date();
      setForm({
        symbol: "",
        direction: "Buy",
        orderType: "Market Execution",
        // keep datetime-local friendly strings for inputs; convert to ISO on save
        openTime: toLocalInput(nowLocal),
        closeTime: toLocalInput(nowLocal),
        session: "London",
        lotSize: 0.01,
        entryPrice: 0,
        stopLossPrice: 0,
        takeProfitPrice: 0,
        pnl: 0,
        duration: "",
        outcome: "Win",
        resultRR: 0,
        reasonForTrade: "",
        emotion: "Confident",
        journalNotes: "",
      });
    } else {
      // clear form when closing
      setForm({});
    }
  }, [isOpen]);

  const handleChange = <K extends keyof Trade>(field: K, value: Trade[K]) => {
    setForm((prev) => ({ ...(prev ?? {}), [field]: value }));
  };

  const parseMaybeLocalToISO = (v?: string) => {
    if (!v) return "";
    // If the value matches "YYYY-MM-DDTHH:mm" (datetime-local), convert to ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toISOString();
    }
    // otherwise return as-is
    return v;
  };

  // RR numeric calculation aware of direction
  const numericRR = useMemo(() => {
    const entry = Number(form.entryPrice ?? 0);
    const stop = Number(form.stopLossPrice ?? 0);
    const tp = Number(form.takeProfitPrice ?? 0);
    const dir = String(form.direction ?? "Buy");

    if (!entry || !stop || !tp) return null;

    // For buy: risk = entry - stop ; reward = tp - entry
    // For sell: risk = stop - entry ; reward = entry - tp
    let risk = 0;
    let reward = 0;
    if (dir.toLowerCase() === "sell") {
      risk = stop - entry;
      reward = entry - tp;
    } else {
      // default Buy
      risk = entry - stop;
      reward = tp - entry;
    }

    // if risk is zero or negative (bad inputs) we cannot compute
    if (risk === 0 || risk === 0.0 || Number.isNaN(risk)) return null;

    // Use absolute ratio (reward/risk)
    const ratio = reward / risk;
    // return ratio (can be negative if inputs indicate weird values)
    return Number.isFinite(ratio) ? ratio : null;
  }, [form.entryPrice, form.stopLossPrice, form.takeProfitPrice, form.direction]);

  const rrString = useMemo(() => {
    const outcome = String(form.outcome ?? "Win");
    if (outcome === "Loss") return "-1RR";
    if (outcome === "Breakeven") return "0RR";
    // winner: show numericRR if available
    if (numericRR === null || numericRR === undefined) return "";
    // negative or zero ratio -> show 0RR
    if (!Number.isFinite(numericRR) || numericRR <= 0) return "0RR";
    return `+${numericRR.toFixed(2)}RR`;
  }, [form.outcome, numericRR]);

  const calculateDuration = (openVal?: string, closeVal?: string) => {
    if (!openVal || !closeVal) return "";
    const openIso = parseMaybeLocalToISO(openVal);
    const closeIso = parseMaybeLocalToISO(closeVal);
    const ds = new Date(openIso);
    const de = new Date(closeIso);
    const diff = de.getTime() - ds.getTime();
    if (Number.isNaN(diff) || diff < 0) return "Invalid";
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  const handleSave = () => {
    const requiredFields: (keyof Trade)[] = [
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

    for (const field of requiredFields) {
      const v = (form as Record<string, unknown>)[field];
      if (v === undefined || v === "" || v === null) {
        // accessible, user-friendly message
        alert(`Please fill in the "${String(field)}" field.`);
        return;
      }
    }

    const openIso = parseMaybeLocalToISO(String(form.openTime ?? ""));
    const closeIso = parseMaybeLocalToISO(String(form.closeTime ?? ""));

    // derive numeric resultRR based on outcome and numericRR
    const outcome = String(form.outcome ?? "Win");
    let resultRRNumeric = 0;
    if (outcome === "Loss") resultRRNumeric = -1;
    else if (outcome === "Breakeven") resultRRNumeric = 0;
    else {
      // Win: use numericRR if computable else 0
      resultRRNumeric = numericRR !== null ? numericRR : 0;
    }

    const newTrade: Trade = {
      id: `${String(form.symbol ?? "TRD")}-${Date.now()}`,
      symbol: String(form.symbol ?? ""),
      direction: String(form.direction ?? ""),
      orderType: String(form.orderType ?? ""),
      openTime: openIso,
      closeTime: closeIso,
      session: String(form.session ?? ""),
      lotSize: Number(form.lotSize ?? 0),
      entryPrice: Number(form.entryPrice ?? 0),
      stopLossPrice: Number(form.stopLossPrice ?? 0),
      takeProfitPrice: Number(form.takeProfitPrice ?? 0),
      pnl: Number(form.pnl ?? 0),
      resultRR: resultRRNumeric,
      outcome,
      duration: calculateDuration(String(form.openTime ?? ""), String(form.closeTime ?? "")),
      reasonForTrade: String(form.reasonForTrade ?? ""),
      emotion: String(form.emotion ?? "neutral"),
      journalNotes: String(form.journalNotes ?? ""),
    };

    onSave(newTrade);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-3xl z-50 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Add New Trade
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Symbol
            </label>
            <input
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.symbol ?? ""}
              onChange={(e) => handleChange("symbol", e.target.value as Trade["symbol"])}
              placeholder="e.g. EURUSD"
            />
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Direction
            </label>
            <select
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.direction ?? "Buy")}
              onChange={(e) => handleChange("direction", e.target.value as Trade["direction"])}
            >
              <option>Buy</option>
              <option>Sell</option>
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Order Type
            </label>
            <input
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.orderType ?? ""}
              onChange={(e) => handleChange("orderType", e.target.value as Trade["orderType"])}
            />
          </div>

          {/* Session */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Session
            </label>
            <input
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.session ?? ""}
              onChange={(e) => handleChange("session", e.target.value as Trade["session"])}
            />
          </div>

          {/* Open Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Open Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.openTime ?? "").slice(0, 16)}
              onChange={(e) => handleChange("openTime", e.target.value as Trade["openTime"])}
            />
          </div>

          {/* Close Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Close Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.closeTime ?? "").slice(0, 16)}
              onChange={(e) => handleChange("closeTime", e.target.value as Trade["closeTime"])}
            />
          </div>

          {/* Lot Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lot Size
            </label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.lotSize ?? 0)}
              onChange={(e) => handleChange("lotSize", Number(e.target.value) as Trade["lotSize"])}
            />
          </div>

          {/* Entry Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Entry Price
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.entryPrice ?? 0)}
              onChange={(e) => handleChange("entryPrice", Number(e.target.value) as Trade["entryPrice"])}
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stop Loss
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.stopLossPrice ?? 0)}
              onChange={(e) => handleChange("stopLossPrice", Number(e.target.value) as Trade["stopLossPrice"])}
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Take Profit
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.takeProfitPrice ?? 0)}
              onChange={(e) => handleChange("takeProfitPrice", Number(e.target.value) as Trade["takeProfitPrice"])}
            />
          </div>

          {/* PnL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PNL ($)
            </label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.pnl ?? 0)}
              onChange={(e) => handleChange("pnl", Number(e.target.value) as Trade["pnl"])}
            />
          </div>

          {/* Outcome + RR badge */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Outcome
            </label>
            <div className="flex gap-2 items-center">
              <select
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={String(form.outcome ?? "Win")}
                onChange={(e) => handleChange("outcome", e.target.value as Trade["outcome"])}
              >
                <option>Win</option>
                <option>Loss</option>
                <option>Breakeven</option>
              </select>

              {/* RR badge */}
              <div className="ml-2 inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                {rrString || "RR"}
              </div>
            </div>
          </div>

          {/* Reason For Trade */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason For Trade
            </label>
            <input
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.reasonForTrade ?? ""}
              onChange={(e) => handleChange("reasonForTrade", e.target.value as Trade["reasonForTrade"])}
            />
          </div>

          {/* Emotion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Emotion
            </label>
            <select
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={String(form.emotion ?? "Confident")}
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

          {/* Journal Notes */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Journal Notes
            </label>
            <textarea
              rows={4}
              className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.journalNotes ?? ""}
              onChange={(e) => handleChange("journalNotes", e.target.value as Trade["journalNotes"])}
            />
          </div>
        </div>

        <div className="flex justify-between items-center gap-4 mt-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Tip: use full precision for prices (step="any"). RR is calculated from entry/stop/take-profit & direction.
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
