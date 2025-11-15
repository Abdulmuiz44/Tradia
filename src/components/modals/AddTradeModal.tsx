// src/components/modals/AddTradeModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Trade } from "@/types/trade";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTrade: Trade) => void;
};

export default function AddTradeModal({ isOpen, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<Trade>>({});
  const [beforeUrl, setBeforeUrl] = useState<string>("");
  const [afterUrl, setAfterUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const PREDEFINED_STRATEGIES = [
    "SMC",
    "Breakout",
    "Trend Following",
    "HORC",
    "ORDER BLOCK",
    "BREAKER BLOCK",
    "RECLAIMED BLOCK",
  ];
  const [customStrategies, setCustomStrategies] = useState<string[]>([]);
  const [showCustomStrategyInput, setShowCustomStrategyInput] = useState(false);
  const [customStrategyInput, setCustomStrategyInput] = useState("");

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
        strategy: "",
        emotion: "Confident",
        journalNotes: "",
      });
      setBeforeUrl("");
      setAfterUrl("");
      setError(null);
      setSaving(false);
      try {
        const saved = localStorage.getItem('customStrategies');
        if (saved) setCustomStrategies(JSON.parse(saved));
      } catch {}
    } else {
      // clear form when closing
      setForm({});
      setBeforeUrl("");
      setAfterUrl("");
    }
  }, [isOpen]);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...(prev ?? {}), [field]: value }));
  };

  const parseMaybeLocalToISO = (v?: string) => {
    if (!v) return "";
    // If the value matches "YYYY-MM-DDTHH:mm" (datetime-local), convert to ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toISOString();
    }
    // If already ISO-like, attempt to parse and return ISO
    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toISOString();
    } catch {
      return v;
    }
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

    if (!Number.isFinite(risk) || risk === 0) return null;

    const ratio = reward / risk;
    return Number.isFinite(ratio) ? ratio : null;
  }, [form.entryPrice, form.stopLossPrice, form.takeProfitPrice, form.direction]);

  const rrString = useMemo(() => {
    const outcome = String(form.outcome ?? "Win");
    if (outcome === "Loss") return "-1RR";
    if (outcome === "Breakeven") return "0RR";
    if (numericRR === null || numericRR === undefined) return "";
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

  const uploadImage = async (file: File, kind: "before" | "after") => {
    // Default to local data URL storage for simplicity and privacy
    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(f);
      });
    return await toDataUrl(file);
  };

  const handleBeforeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadImage(f, 'before');
      setBeforeUrl(url);
    } catch (err) {
      console.error('Before image error:', err);
      setError('Failed to process before screenshot.');
    }
  };

  const handleAfterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadImage(f, 'after');
      setAfterUrl(url);
    } catch (err) {
      console.error('After image error:', err);
      setError('Failed to process after screenshot.');
    }
  };

  const addCustomStrategy = (strategy: string) => {
    const s = strategy.trim();
    if (!s) return;
    if (!PREDEFINED_STRATEGIES.includes(s) && !customStrategies.includes(s)) {
      const next = [...customStrategies, s];
      setCustomStrategies(next);
      try { localStorage.setItem('customStrategies', JSON.stringify(next)); } catch {}
    }
    setForm((p) => ({ ...(p ?? {}), strategy: s }));
    setCustomStrategyInput("");
    setShowCustomStrategyInput(false);
  };

  // when outcome changes ensure pnl sign follows outcome
  const handleOutcomeChange = (val: Trade["outcome"]) => {
    const currentPnl = Number(form.pnl ?? 0);
    let updatedPnl = currentPnl;
    if (val === "Win") updatedPnl = Math.abs(currentPnl);
    else if (val === "Loss") updatedPnl = -Math.abs(currentPnl) || -0;
    else if (val === "Breakeven") updatedPnl = 0;
    setForm((p) => ({ ...(p ?? {}), outcome: val, pnl: updatedPnl }));
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
      "strategy",
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

    const outcome = String(form.outcome ?? "Win");
    let resultRRNumeric = 0;
    if (outcome === "Loss") resultRRNumeric = -1;
    else if (outcome === "Breakeven") resultRRNumeric = 0;
    else {
      resultRRNumeric = numericRR !== null ? numericRR : 0;
    }

    const lotSizeNum = Number(form.lotSize ?? 0);
    const entryPriceNum = Number(form.entryPrice ?? 0);
    const stopLossPriceNum = Number(form.stopLossPrice ?? 0);
    const takeProfitPriceNum = Number(form.takeProfitPrice ?? 0);
    const pnlNum = Number(form.pnl ?? 0);

    if (isNaN(lotSizeNum) || isNaN(entryPriceNum) || isNaN(stopLossPriceNum) || isNaN(takeProfitPriceNum) || isNaN(pnlNum)) {
      alert("Please enter valid numbers for lot size, entry price, stop loss, take profit, and PNL.");
      return;
    }

    const newTrade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol: String(form.symbol ?? ""),
      direction: (String(form.direction ?? "Buy") as "Buy" | "Sell"),
      orderType: String(form.orderType ?? ""),
      openTime: openIso,
      closeTime: closeIso,
      session: String(form.session ?? ""),
      lotSize: Math.max(0.01, lotSizeNum),
      entryPrice: entryPriceNum,
      stopLossPrice: stopLossPriceNum,
      takeProfitPrice: takeProfitPriceNum,
      pnl: pnlNum,
      resultRR: resultRRNumeric,
      outcome: (outcome as "Win" | "Loss" | "Breakeven"),
      duration: calculateDuration(String(form.openTime ?? ""), String(form.closeTime ?? "")),
      strategy: String(form.strategy ?? ""),
      emotion: String(form.emotion ?? "neutral"),
      journalNotes: String(form.journalNotes ?? ""),
      beforeScreenshotUrl: beforeUrl || undefined,
      afterScreenshotUrl: afterUrl || undefined,
    };

    onSave(newTrade);
    onClose();
  };

  if (!isOpen) return null;

  // order types & sessions dropdowns
  const orderTypes = ["Market Execution", "Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop"];
  const sessions = ["London", "Asian", "New York"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-3xl bg-gray-900 text-white rounded-lg shadow-2xl overflow-auto p-6 max-h-[90vh]">
        <h2 className="text-2xl font-semibold mb-4">Add New Trade</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Symbol</label>
            <input
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={form.symbol ?? ""}
              onChange={(e) => handleChange("symbol", e.target.value)}
              placeholder="e.g. EURUSD"
            />
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Direction</label>
            <select
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.direction ?? "Buy")}
              onChange={(e) => handleChange("direction", e.target.value)}
            >
              <option>Buy</option>
              <option>Sell</option>
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Order Type</label>
            <select
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.orderType ?? orderTypes[0])}
              onChange={(e) => handleChange("orderType", e.target.value)}
            >
              {orderTypes.map((ot) => (
                <option key={ot} value={ot}>
                  {ot}
                </option>
              ))}
            </select>
          </div>

          {/* Session */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Session</label>
            <select
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.session ?? sessions[0])}
              onChange={(e) => handleChange("session", e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Open Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Open Time</label>
            <input
              type="datetime-local"
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.openTime ?? "").slice(0, 16)}
              onChange={(e) => handleChange("openTime", e.target.value)}
            />
          </div>

          {/* Close Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Close Time</label>
            <input
              type="datetime-local"
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.closeTime ?? "").slice(0, 16)}
              onChange={(e) => handleChange("closeTime", e.target.value)}
            />
          </div>

          {/* Lot Size */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Lot Size</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.lotSize ?? '')}
              onChange={(e) => handleChange("lotSize", e.target.value)}
              placeholder="e.g., 0.01"
            />
          </div>

          {/* Entry Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Entry Price</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.entryPrice ?? 0)}
              onChange={(e) => handleChange("entryPrice", e.target.value)}
              placeholder="e.g., 1.12345"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Stop Loss</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.stopLossPrice ?? 0)}
              onChange={(e) => handleChange("stopLossPrice", e.target.value)}
              placeholder="e.g., 1.12000"
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Take Profit</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.takeProfitPrice ?? 0)}
              onChange={(e) => handleChange("takeProfitPrice", e.target.value)}
              placeholder="e.g., 1.12800"
            />
          </div>

          {/* PNL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">PNL ($)</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={String(form.pnl ?? '')}
              onChange={(e) => handleChange("pnl", e.target.value)}
              placeholder="e.g., 150.50"
            />
          </div>

          {/* Outcome + RR badge */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Outcome</label>
            <div className="flex gap-2 items-center">
              <select
                className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
                value={String(form.outcome ?? "Win")}
                onChange={(e) => handleOutcomeChange(e.target.value as Trade["outcome"])}
              >
                <option>Win</option>
                <option>Loss</option>
                <option>Breakeven</option>
              </select>

              <div className="ml-2 inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-zinc-800 text-gray-200">
                {rrString || "RR"}
              </div>
            </div>
          </div>

          {/* Strategy */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Strategy</label>
            {!showCustomStrategyInput ? (
              <div className="flex gap-2">
                <select
                  className="flex-1 p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
                  value={String(form.strategy ?? "")}
                  onChange={(e) => handleChange("strategy", e.target.value)}
                >
                  <option value="">Select a strategy...</option>
                  {[...PREDEFINED_STRATEGIES, ...customStrategies].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCustomStrategyInput(true)}
                  className="px-3 py-2 bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 text-sm"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
                  placeholder="Enter custom strategy..."
                  value={customStrategyInput}
                  onChange={(e) => setCustomStrategyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addCustomStrategy(customStrategyInput); }
                    if (e.key === 'Escape') { setShowCustomStrategyInput(false); setCustomStrategyInput(''); }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addCustomStrategy(customStrategyInput)}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCustomStrategyInput(false); setCustomStrategyInput(''); }}
                  className="px-3 py-2 bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Emotion */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Emotion</label>
            <select
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Journal Notes</label>
            <textarea
              rows={4}
              className="w-full p-2 rounded border border-zinc-700 bg-zinc-900 text-white"
              value={form.journalNotes ?? ""}
              onChange={(e) => handleChange("journalNotes", e.target.value as Trade["journalNotes"])}
            />
          </div>

          {/* Before/After Screenshots */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Before Screenshot</label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:bg-zinc-800 file:text-gray-200 hover:file:bg-zinc-700"
              onChange={handleBeforeFile}
            />
            {beforeUrl && (
              <div className="mt-2 flex items-center gap-2">
                <Image
                  src={beforeUrl}
                  alt="Before trade screenshot"
                  width={96}
                  height={64}
                  unoptimized
                  className="h-16 w-24 rounded border border-zinc-800 object-cover"
                />
                <button type="button" onClick={() => setBeforeUrl("")} className="px-2 py-1 text-xs bg-zinc-800 rounded hover:bg-zinc-700">Remove</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">After Screenshot</label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:bg-zinc-800 file:text-gray-200 hover:file:bg-zinc-700"
              onChange={handleAfterFile}
            />
            {afterUrl && (
              <div className="mt-2 flex items-center gap-2">
                <Image
                  src={afterUrl}
                  alt="After trade screenshot"
                  width={96}
                  height={64}
                  unoptimized
                  className="h-16 w-24 rounded border border-zinc-800 object-cover"
                />
                <button type="button" onClick={() => setAfterUrl("")} className="px-2 py-1 text-xs bg-zinc-800 rounded hover:bg-zinc-700">Remove</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-4 mt-6">
          <div className="text-sm text-gray-400">
            Tip: use full precision for prices (step=&ldquo;any&rdquo;). RR auto-calculated from entry/stop/tp.
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 rounded text-sm hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 rounded text-sm hover:bg-indigo-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
