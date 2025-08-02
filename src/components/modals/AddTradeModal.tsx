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
        pnl: "", // User-input now
        duration: "",
        outcome: "Win",
        rr: "",
        reasonForTrade: "",
        emotion: "Confident",
        journalNotes: "",
      });
    }
  }, [isOpen]);

  const handleChange = (field: keyof Trade, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const calculateDuration = (start: string, end: string): string => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 0) return "Invalid";
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  const calculateRR = (): string => {
    const { entryPrice, stopLossPrice, takeProfitPrice, lotSize, direction, outcome } = form;

    if (!entryPrice || !stopLossPrice || !takeProfitPrice || !lotSize || !direction) {
      return "";
    }

    const riskPerUnit = Math.abs((entryPrice as number) - (stopLossPrice as number));
    const rewardPerUnit = Math.abs((takeProfitPrice as number) - (entryPrice as number));
    const pipValue = 10;
    const reward = rewardPerUnit * pipValue * lotSize!;
    const risk = riskPerUnit * pipValue * lotSize!;

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
      "pnl", // Now required from user
      "reasonForTrade",
      "emotion",
      "journalNotes",
    ];

    for (let field of requiredFields) {
      if (form[field] === undefined || form[field] === "" || form[field] === null) {
        alert(`Please fill in the "${field}" field.`);
        return;
      }
    }

    const newTrade: Trade = {
      ...(form as Trade),
      rr: calculateRR(),
      duration: calculateDuration(form.openTime as string, form.closeTime as string),
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
          {[
            {
              label: "Symbol",
              field: "symbol",
              placeholder: "e.g. EURUSD",
            },
            {
              label: "Direction",
              field: "direction",
              type: "select",
              options: ["Buy", "Sell"],
            },
            {
              label: "Order Type",
              field: "orderType",
              type: "select",
              options: [
                "Market Execution",
                "Buy Limit",
                "Sell Limit",
                "Buy Stop",
                "Sell Stop",
              ],
            },
            {
              label: "Open Time",
              field: "openTime",
              type: "datetime-local",
            },
            {
              label: "Close Time",
              field: "closeTime",
              type: "datetime-local",
            },
            {
              label: "Session",
              field: "session",
              type: "select",
              options: ["London", "New York", "Asian"],
            },
            {
              label: "Lot Size",
              field: "lotSize",
              type: "number",
              placeholder: "e.g. 0.01",
            },
            {
              label: "Entry Price",
              field: "entryPrice",
              type: "number",
              placeholder: "e.g. 1.10345",
            },
            {
              label: "Stop Loss Price",
              field: "stopLossPrice",
              type: "number",
              placeholder: "e.g. 1.10100",
            },
            {
              label: "Take Profit Price",
              field: "takeProfitPrice",
              type: "number",
              placeholder: "e.g. 1.10700",
            },
            {
              label: "Outcome",
              field: "outcome",
              type: "select",
              options: ["Win", "Loss", "Breakeven"],
            },
            {
              label: "Result (RR)",
              field: "rr",
              placeholder: "Auto-calculated",
              disabled: true,
            },
            {
              label: "PNL ($)",
              field: "pnl",
              placeholder: "e.g. +25.50 or -13.70",
            },
            {
              label: "Reason For Trade",
              field: "reasonForTrade",
              placeholder: "e.g. Breaker Block, OB, FVG, etc.",
            },
            {
              label: "Emotion",
              field: "emotion",
              type: "select",
              options: ["Confident", "Fear", "Greed", "Doubt", "FOMO"],
            },
          ].map(({ label, field, type, options, placeholder, disabled }) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {label}
              </label>
              {type === "select" ? (
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={(form as any)[field]}
                  onChange={(e) => handleChange(field as keyof Trade, e.target.value)}
                >
                  {options!.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={type || "text"}
                  placeholder={placeholder}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={(form as any)[field] ?? ""}
                  onChange={(e) =>
                    handleChange(
                      field as keyof Trade,
                      type === "number" ? parseFloat(e.target.value) : e.target.value
                    )
                  }
                  disabled={disabled}
                />
              )}
            </div>
          ))}

          {/* Journal Notes */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Journal Notes
            </label>
            <textarea
              rows={3}
              placeholder="Write your thoughts, trade reflection, etc."
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.journalNotes ?? ""}
              onChange={(e) => handleChange("journalNotes", e.target.value)}
            />
          </div>
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
