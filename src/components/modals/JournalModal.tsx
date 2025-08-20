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

export default function JournalModal({ isOpen, trade, onClose, onSave }: JournalModalProps) {
  const [notes, setNotes] = useState<string>("");
  const [reasonForTrade, setReasonForTrade] = useState<string>("");
  const [emotion, setEmotion] = useState<string>("neutral");
  const [outcome, setOutcome] = useState<Trade["outcome"]>("Breakeven");
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trade) {
      setNotes("");
      setReasonForTrade("");
      setEmotion("neutral");
      setOutcome("Breakeven");
      setError(null);
      setSaving(false);
      return;
    }

    // Populate fields from the provided trade
    setNotes(String(trade.journalNotes ?? trade.notes ?? ""));
    setReasonForTrade(String(trade.reasonForTrade ?? ""));
    setEmotion(String(trade.emotion ?? "neutral"));
    setOutcome((trade.outcome as Trade["outcome"]) ?? "Breakeven");
    setError(null);
    setSaving(false);
  }, [trade, isOpen]);

  if (!isOpen) return null;

  const emotionOptions = [
    { value: "confident", label: "Confident" },
    { value: "fear", label: "Fear" },
    { value: "greed", label: "Greed" },
    { value: "doubt", label: "Doubt" },
    { value: "fomo", label: "FOMO" },
    { value: "neutral", label: "Neutral" },
  ];
  const outcomeOptions: Trade["outcome"][] = ["Win", "Loss", "Breakeven"];

  const handleSave = async () => {
    if (!trade) {
      setError("No trade selected.");
      return;
    }

    // Simple validation: require notes (optional — you can relax this)
    if (!notes || String(notes).trim().length === 0) {
      setError("Please add some journal notes before saving.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const updated: Trade = {
        ...trade,
        journalNotes: String(notes),
        notes: String(notes),
        reasonForTrade: String(reasonForTrade ?? trade.reasonForTrade ?? ""),
        emotion: String(emotion ?? trade.emotion ?? "neutral"),
        outcome: (outcome ?? trade.outcome) as Trade["outcome"],
        updated_at: new Date().toISOString(),
      } as Trade;

      // call parent callback
      await Promise.resolve(onSave(updated));
      setSaving(false);
      onClose();
    } catch (e) {
      // derive message safely
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Failed to save note: ${msg}`);
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
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-auto p-6">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {trade ? `Journal — ${trade.symbol}` : "Journal"}
            </h3>
            {trade && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Trade ID: {trade.id ?? "—"} • PnL:{" "}
                <span className={typeof trade.pnl === "number" && trade.pnl >= 0 ? "text-green-500" : "text-red-400"}>
                  {typeof trade.pnl === "number" ? `$${trade.pnl.toFixed(2)}` : String(trade.pnl ?? "—")}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (!saving) onClose();
            }}
            className="text-sm text-zinc-600 dark:text-zinc-300 hover:underline px-2 py-1 rounded"
            aria-label="Close journal"
          >
            Close
          </button>
        </header>

        <section className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for trade</label>
            <input
              type="text"
              value={reasonForTrade}
              onChange={(e) => setReasonForTrade(e.target.value)}
              placeholder="Why did you enter this trade?"
              className="w-full p-3 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-zinc-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emotion</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="w-full p-3 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-zinc-700"
              >
                {emotionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outcome</label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as Trade["outcome"])}
                className="w-full p-3 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-zinc-700"
              >
                {outcomeOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Journal notes</label>
            <textarea
              rows={8}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your trade hindsight, what went well, what you can improve..."
              className="w-full p-3 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-zinc-700"
            />
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (!saving) onClose();
              }}
              className="px-4 py-2 bg-gray-300 dark:bg-zinc-700 text-gray-800 dark:text-white rounded hover:bg-gray-200"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
