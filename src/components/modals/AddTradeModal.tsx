// src/components/modals/AddTradeModal.tsx
"use client";

import { useEffect, useState } from "react";
import { Trade } from "@/types/trade";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTrade: Trade) => void;
};

export default function AddTradeModal({ isOpen, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<Trade>>({});

  useEffect(() => {
    if (isOpen) {
      setForm({
        symbol: "",
        direction: "Buy",
        orderType: "Market Execution",
        openTime: new Date().toISOString().slice(0, 16),
        closeTime: new Date().toISOString().slice(0, 16),
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
    }
  }, [isOpen]);

  const handleChange = <K extends keyof Trade>(field: K, value: Trade[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const calculateDuration = (start: string, end: string): string => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 0) return "Invalid";
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  const calculateRR = (): string => {
    const entryPrice = Number(form.entryPrice ?? 0);
    const stopLossPrice = Number(form.stopLossPrice ?? 0);
    const takeProfitPrice = Number(form.takeProfitPrice ?? 0);
    const lotSize = Number(form.lotSize ?? 0);
    const outcome = form.outcome ?? "Win";

    if (!entryPrice || !stopLossPrice || !takeProfitPrice || !lotSize) {
      return "";
    }

    const riskPerUnit = Math.abs(entryPrice - stopLossPrice);
    const rewardPerUnit = Math.abs(takeProfitPrice - entryPrice);
    const pipValue = 10;
    const reward = rewardPerUnit * pipValue * lotSize;
    const risk = riskPerUnit * pipValue * lotSize;

    if (outcome === "Win") return `+${(reward / risk).toFixed(2)}RR`;
    if (outcome === "Loss") return `-1RR`;
    return `0RR`;
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
      const v = form[field];
      if (v === undefined || v === "" || v === null) {
        alert(`Please fill in the "${String(field)}" field.`);
        return;
      }
    }

    const newTrade: Trade = {
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
      resultRR: parseFloat(String(calculateRR()).replace(/[^\d\.\-]/g, "")) || 0,
      outcome: String(form.outcome ?? "Win"),
      duration: calculateDuration(String(form.openTime ?? ""), String(form.closeTime ?? "")),
      reasonForTrade: String(form.reasonForTrade ?? ""),
      emotion: String(form.emotion ?? ""),
      journalNotes: String(form.journalNotes ?? ""),
    };

    onSave(newTrade);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-2xl z-50 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Add New Trade
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* fields — unchanged structure, ensure value and onChange map to typed handleChange */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Symbol</label>
            <input className="w-full p-2" value={form.symbol ?? ""} onChange={(e) => handleChange("symbol", e.target.value as Trade["symbol"])} />
          </div>

          {/* ... other fields (keep as you had) ... */}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
