"use client";

import React, { useState } from "react";
import { Save, X } from "lucide-react";
import type { Trade } from "@/types/trade";

interface AddTradeFormProps {
  onSubmit: (trade: Partial<Trade>) => void;
  isLoading?: boolean;
}

export default function AddTradeForm({ onSubmit, isLoading = false }: AddTradeFormProps) {
  const [formData, setFormData] = useState<Partial<Trade>>({
    symbol: "",
    direction: "Buy",
    orderType: "Market Execution",
    openTime: new Date().toISOString().split("T")[0],
    session: "US",
    lotSize: 1,
    entryPrice: 0,
    stopLossPrice: 0,
    takeProfitPrice: 0,
    pnl: 0,
    outcome: "Breakeven",
    emotion: "neutral",
    journalNotes: "",
    strategy: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.symbol?.trim()) {
      newErrors.symbol = "Symbol is required";
    }
    if (!formData.entryPrice || formData.entryPrice === 0) {
      newErrors.entryPrice = "Entry price must be greater than 0";
    }
    if (!formData.stopLossPrice || formData.stopLossPrice === 0) {
      newErrors.stopLossPrice = "Stop loss price is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? parseFloat(value) || 0
          : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Row 1: Symbol & Direction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Symbol *
          </label>
          <input
            type="text"
            name="symbol"
            value={formData.symbol || ""}
            onChange={handleChange}
            placeholder="e.g., EURUSD"
            className={`w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
              errors.symbol
                ? "border-red-500 dark:border-red-400"
                : "border-gray-300"
            }`}
          />
          {errors.symbol && (
            <p className="text-red-500 text-sm mt-1">{errors.symbol}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Direction
          </label>
          <select
            name="direction"
            value={formData.direction || "Buy"}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
          </select>
        </div>
      </div>

      {/* Row 2: Entry Price, Stop Loss, Take Profit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Entry Price *
          </label>
          <input
            type="number"
            name="entryPrice"
            value={formData.entryPrice || ""}
            onChange={handleChange}
            placeholder="0.00"
            step="0.00001"
            className={`w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
              errors.entryPrice
                ? "border-red-500 dark:border-red-400"
                : "border-gray-300"
            }`}
          />
          {errors.entryPrice && (
            <p className="text-red-500 text-sm mt-1">{errors.entryPrice}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Stop Loss Price *
          </label>
          <input
            type="number"
            name="stopLossPrice"
            value={formData.stopLossPrice || ""}
            onChange={handleChange}
            placeholder="0.00"
            step="0.00001"
            className={`w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
              errors.stopLossPrice
                ? "border-red-500 dark:border-red-400"
                : "border-gray-300"
            }`}
          />
          {errors.stopLossPrice && (
            <p className="text-red-500 text-sm mt-1">{errors.stopLossPrice}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Take Profit Price
          </label>
          <input
            type="number"
            name="takeProfitPrice"
            value={formData.takeProfitPrice || ""}
            onChange={handleChange}
            placeholder="0.00"
            step="0.00001"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
      </div>

      {/* Row 3: Lot Size, Order Type, Session */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Lot Size
          </label>
          <input
            type="number"
            name="lotSize"
            value={formData.lotSize || ""}
            onChange={handleChange}
            placeholder="1.0"
            step="0.01"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Order Type
          </label>
          <select
            name="orderType"
            value={formData.orderType || "Market Execution"}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="Market Execution">Market Execution</option>
            <option value="Limit Order">Limit Order</option>
            <option value="Stop Order">Stop Order</option>
            <option value="Stop-Limit Order">Stop-Limit Order</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Session
          </label>
          <select
            name="session"
            value={formData.session || "US"}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="US">US</option>
            <option value="EU">EU</option>
            <option value="ASIA">ASIA</option>
            <option value="SYDNEY">SYDNEY</option>
          </select>
        </div>
      </div>

      {/* Row 4: Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Open Time
          </label>
          <input
            type="datetime-local"
            name="openTime"
            value={
              formData.openTime
                ? new Date(formData.openTime)
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                openTime: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : "",
              }));
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Close Time
          </label>
          <input
            type="datetime-local"
            name="closeTime"
            value={
              formData.closeTime
                ? new Date(formData.closeTime)
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                closeTime: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : "",
              }));
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
      </div>

      {/* Row 5: PnL & Outcome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Profit/Loss ($)
          </label>
          <input
            type="number"
            name="pnl"
            value={formData.pnl || ""}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Outcome
          </label>
          <select
            name="outcome"
            value={formData.outcome || "Breakeven"}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
            <option value="Breakeven">Breakeven</option>
          </select>
        </div>
      </div>

      {/* Row 6: Strategy & Emotion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Strategy
          </label>
          <input
            type="text"
            name="strategy"
            value={formData.strategy || ""}
            onChange={handleChange}
            placeholder="e.g., Breakout"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Emotion
          </label>
          <select
            name="emotion"
            value={formData.emotion || "neutral"}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="calm">Calm</option>
            <option value="confident">Confident</option>
            <option value="neutral">Neutral</option>
            <option value="anxious">Anxious</option>
            <option value="greedy">Greedy</option>
            <option value="fearful">Fearful</option>
          </select>
        </div>
      </div>

      {/* Journal Notes */}
      <div>
        <label className="block text-sm font-medium dark:text-gray-300 mb-2">
          Journal Notes
        </label>
        <textarea
          name="journalNotes"
          value={formData.journalNotes || ""}
          onChange={handleChange}
          placeholder="Add your thoughts, observations, and lessons learned..."
          rows={4}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
      </div>

      {/* Reason for Trade */}
      <div>
        <label className="block text-sm font-medium dark:text-gray-300 mb-2">
          Reason for Trade
        </label>
        <textarea
          name="reasonForTrade"
          value={formData.reasonForTrade || ""}
          onChange={handleChange}
          placeholder="Why did you take this trade? What was the setup?"
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          * Required fields
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {isLoading ? "Saving..." : "Add Trade"}
        </button>
      </div>
    </form>
  );
}
