"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Save, X, ImageIcon } from "lucide-react";
import Image from "next/image";
import type { Trade } from "@/types/trade";

interface EditTradeFormProps {
  trade: Trade;
  onSubmit: (trade: Partial<Trade>) => void;
  isLoading?: boolean;
  onUploadScreenshot?: (file: File, type: 'before' | 'after') => Promise<string>;
}

// Helper to format datetime-local input value from ISO string
const formatDateTimeLocal = (isoString: string | undefined): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    // Format as YYYY-MM-DDTHH:mm in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
};

// Helper to convert datetime-local value to ISO string preserving local time
const dateTimeLocalToISO = (value: string): string => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
};

// Helper to get value from either camelCase or lowercase field name
const getValue = <T,>(camel: T | undefined, lower: T | undefined, defaultVal: T): T => {
  if (camel !== undefined && camel !== null && camel !== '') return camel;
  if (lower !== undefined && lower !== null && lower !== '') return lower;
  return defaultVal;
};

export default function EditTradeForm({ trade, onSubmit, isLoading = false, onUploadScreenshot }: EditTradeFormProps) {
  const [formData, setFormData] = useState<Partial<Trade>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Screenshot state
  const [beforePreview, setBeforePreview] = useState<string>("");
  const [afterPreview, setAfterPreview] = useState<string>("");
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with trade data
  useEffect(() => {
    if (trade) {
      // Handle both camelCase and lowercase field names from API
      const raw = trade as any;

      setFormData({
        ...trade,
        // Ensure all fields are properly initialized from either naming convention
        symbol: getValue(trade.symbol, raw.symbol, ""),
        direction: getValue(trade.direction, raw.direction, "Buy"),
        orderType: getValue(trade.orderType, raw.ordertype, "Market Execution"),
        openTime: getValue(trade.openTime, raw.opentime, ""),
        closeTime: getValue(trade.closeTime, raw.closetime, ""),
        session: getValue(trade.session, raw.session, "US"),
        lotSize: getValue(trade.lotSize, raw.lotsize, 0.01),
        entryPrice: getValue(trade.entryPrice, raw.entryprice, 0),
        exitPrice: getValue(trade.exitPrice, raw.exitprice, 0),
        stopLossPrice: getValue(trade.stopLossPrice, raw.stoplossprice, 0),
        takeProfitPrice: getValue(trade.takeProfitPrice, raw.takeprofitprice, 0),
        pnl: getValue(trade.pnl, raw.pnl, 0),
        outcome: getValue(trade.outcome, raw.outcome, "Breakeven"),
        resultRR: getValue(trade.resultRR, raw.resultrr, 0),
        emotion: getValue(trade.emotion, raw.emotion, "neutral"),
        journalNotes: getValue(trade.journalNotes, raw.journalnotes, "") || getValue(trade.notes, raw.notes, ""),
        strategy: getValue(trade.strategy, raw.strategy, ""),
        reasonForTrade: getValue(trade.reasonForTrade, raw.reasonfortrade, ""),
        beforeScreenshotUrl: getValue(trade.beforeScreenshotUrl, raw.beforescreenshoturl, ""),
        afterScreenshotUrl: getValue(trade.afterScreenshotUrl, raw.afterscreenshoturl, ""),
      });

      // Set existing screenshots as previews
      const beforeUrl = getValue(trade.beforeScreenshotUrl, raw.beforescreenshoturl, "");
      const afterUrl = getValue(trade.afterScreenshotUrl, raw.afterscreenshoturl, "");

      if (beforeUrl) {
        setBeforePreview(beforeUrl);
      }
      if (afterUrl) {
        setAfterPreview(afterUrl);
      }
    }
  }, [trade]);

  // Calculate Risk/Reward ratio automatically
  const calculatedRR = useMemo(() => {
    const { entryPrice, stopLossPrice, takeProfitPrice } = formData;

    if (!entryPrice || !stopLossPrice || entryPrice === 0 || stopLossPrice === 0) {
      return 0;
    }

    const risk = Math.abs(entryPrice - stopLossPrice);
    if (risk === 0) return 0;

    if (takeProfitPrice && takeProfitPrice !== 0) {
      const reward = Math.abs(takeProfitPrice - entryPrice);
      return Math.round((reward / risk) * 100) / 100;
    }

    return 0;
  }, [formData.entryPrice, formData.stopLossPrice, formData.takeProfitPrice]);

  // Calculate risk in pips/points
  const riskInPips = useMemo(() => {
    const { entryPrice, stopLossPrice } = formData;
    if (!entryPrice || !stopLossPrice) return 0;
    return Math.abs(entryPrice - stopLossPrice);
  }, [formData.entryPrice, formData.stopLossPrice]);

  // Calculate reward in pips/points
  const rewardInPips = useMemo(() => {
    const { entryPrice, takeProfitPrice } = formData;
    if (!entryPrice || !takeProfitPrice) return 0;
    return Math.abs(takeProfitPrice - entryPrice);
  }, [formData.entryPrice, formData.takeProfitPrice]);

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
      onSubmit({
        ...formData,
        resultRR: calculatedRR,
      });
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
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle screenshot file selection
  const handleScreenshotSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({
        ...prev,
        [type === 'before' ? 'beforeScreenshot' : 'afterScreenshot']: 'Please select an image file'
      }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        [type === 'before' ? 'beforeScreenshot' : 'afterScreenshot']: 'Image must be less than 5MB'
      }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const previewUrl = event.target?.result as string;
      if (type === 'before') {
        setBeforePreview(previewUrl);
      } else {
        setAfterPreview(previewUrl);
      }
    };
    reader.readAsDataURL(file);

    // Upload if handler provided
    if (onUploadScreenshot) {
      if (type === 'before') {
        setUploadingBefore(true);
      } else {
        setUploadingAfter(true);
      }

      try {
        const url = await onUploadScreenshot(file, type);
        setFormData(prev => ({
          ...prev,
          [type === 'before' ? 'beforeScreenshotUrl' : 'afterScreenshotUrl']: url
        }));
      } catch (error) {
        console.error(`Failed to upload ${type} screenshot:`, error);
        setErrors(prev => ({
          ...prev,
          [type === 'before' ? 'beforeScreenshot' : 'afterScreenshot']: 'Failed to upload image'
        }));
      } finally {
        if (type === 'before') {
          setUploadingBefore(false);
        } else {
          setUploadingAfter(false);
        }
      }
    } else {
      // Store file data URL as temporary URL
      const reader2 = new FileReader();
      reader2.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          [type === 'before' ? 'beforeScreenshotUrl' : 'afterScreenshotUrl']: dataUrl
        }));
      };
      reader2.readAsDataURL(file);
    }
  };

  const removeScreenshot = (type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforePreview("");
      setFormData(prev => ({ ...prev, beforeScreenshotUrl: "" }));
      if (beforeInputRef.current) {
        beforeInputRef.current.value = "";
      }
    } else {
      setAfterPreview("");
      setFormData(prev => ({ ...prev, afterScreenshotUrl: "" }));
      if (afterInputRef.current) {
        afterInputRef.current.value = "";
      }
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
            className={`w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 ${errors.symbol ? "border-red-500 dark:border-red-400" : "border-gray-300"
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

      {/* Row 2: Entry Price, Stop Loss, Take Profit, Exit Price */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            className={`w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 ${errors.entryPrice ? "border-red-500 dark:border-red-400" : "border-gray-300"
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
            className={`w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 ${errors.stopLossPrice ? "border-red-500 dark:border-red-400" : "border-gray-300"
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

        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Exit Price
          </label>
          <input
            type="number"
            name="exitPrice"
            value={formData.exitPrice || ""}
            onChange={handleChange}
            placeholder="0.00"
            step="0.00001"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
        </div>
      </div>

      {/* RR Display - Always Visible */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Risk/Reward:</span>
              <span className={`text-xl font-bold ${calculatedRR === 0 ? 'text-gray-400 dark:text-gray-500' :
                calculatedRR >= 2 ? 'text-green-600 dark:text-green-400' :
                  calculatedRR >= 1 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                }`}>
                {calculatedRR === 0 ? '—' : `1:${calculatedRR}`}
              </span>
            </div>

            {riskInPips > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Risk:</span>
                <span className="font-medium text-red-600 dark:text-red-400">{riskInPips.toFixed(5)}</span>
              </div>
            )}

            {rewardInPips > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Reward:</span>
                <span className="font-medium text-green-600 dark:text-green-400">{rewardInPips.toFixed(5)}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {calculatedRR === 0 ? 'Enter prices to calculate RR' :
              calculatedRR >= 2 ? '✓ Good Risk/Reward' :
                calculatedRR >= 1 ? '⚠ Moderate Risk/Reward' :
                  '⚠ Low Risk/Reward'}
          </div>
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
            placeholder="0.01"
            step="0.01"
            min="0.01"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum: 0.01</p>
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

      {/* Row 4: Dates - Fixed timezone handling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium dark:text-gray-300 mb-2">
            Open Time
          </label>
          <input
            type="datetime-local"
            name="openTime"
            value={formatDateTimeLocal(formData.openTime)}
            onChange={(e) => {
              const isoValue = dateTimeLocalToISO(e.target.value);
              setFormData((prev) => ({
                ...prev,
                openTime: isoValue,
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
            value={formatDateTimeLocal(formData.closeTime)}
            onChange={(e) => {
              const isoValue = dateTimeLocalToISO(e.target.value);
              setFormData((prev) => ({
                ...prev,
                closeTime: isoValue,
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

      {/* Screenshot Upload Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium dark:text-gray-300">Trade Screenshots</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Screenshot */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-600 dark:text-gray-400">
              Before Screenshot (Setup/Analysis)
            </label>
            <div className="relative">
              {beforePreview || formData.beforeScreenshotUrl ? (
                <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="relative w-full h-40">
                    <Image
                      src={beforePreview || formData.beforeScreenshotUrl || ""}
                      alt="Before trade"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeScreenshot('before')}
                    className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    title="Remove screenshot"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {uploadingBefore && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-sm">Uploading...</div>
                    </div>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-800">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    ref={beforeInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleScreenshotSelect(e, 'before')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {errors.beforeScreenshot && (
              <p className="text-red-500 text-sm">{errors.beforeScreenshot}</p>
            )}
          </div>

          {/* After Screenshot */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-600 dark:text-gray-400">
              After Screenshot (Result)
            </label>
            <div className="relative">
              {afterPreview || formData.afterScreenshotUrl ? (
                <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="relative w-full h-40">
                    <Image
                      src={afterPreview || formData.afterScreenshotUrl || ""}
                      alt="After trade"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeScreenshot('after')}
                    className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    title="Remove screenshot"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {uploadingAfter && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-sm">Uploading...</div>
                    </div>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-800">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    ref={afterInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleScreenshotSelect(e, 'after')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {errors.afterScreenshot && (
              <p className="text-red-500 text-sm">{errors.afterScreenshot}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isLoading || uploadingBefore || uploadingAfter}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
