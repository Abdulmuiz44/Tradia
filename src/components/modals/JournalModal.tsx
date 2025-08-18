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

  const handleSave = () => {
    if (!trade) {
      setError("No trade selected.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const updated: Trade = {
        ...trade,
        journalNotes: notes,
        notes,
        reasonForTrade: reasonForTrade || trade.reasonForTrade,
        emotion: emotion || trade.emotion,
        outcome: outcome || trade.outcome,
        updated_at: new Date().toISOString(),
      } as Trade;

      onSave(updated);
      setSaving(false);
      onClose();
    } catch (err) {
      setError("Failed to save note.");
      setSaving(false);
    }
  };

  const emotionOptions = ["confident", "fear", "greed", "doubt", "fomo", "neutral"];
  const outcomeOptions: Trade["outcome"][] = ["Win", "Loss", "Breakeven"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#0b1220] rounded-lg shadow-lg overflow-auto p-6">
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{trade ? `Journal — ${trade.symbol}` : "Journal"}</h3>
          <button
            onClick={() => {
              if (!saving) onClose();
            }}
            className="text-sm text-zinc-500 hover:text-zinc-300"
            aria-label="Close journal"
          >
            Close
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Reason for trade</label>
            <input
              type="text"
              value={reasonForTrade}
              onChange={(e) => setReasonForTrade(e.target.value)}
              placeholder="Why did you enter this trade?"
              className="w-full p-2 rounded bg-[#0f1724] text-white border border-zinc-700"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Emotion</label>
            <select
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className="w-full p-2 rounded bg-[#0f1724] text-white border border-zinc-700"
            >
              {emotionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt[0].toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as Trade["outcome"])}
              className="w-full p-2 rounded bg-[#0f1724] text-white border border-zinc-700"
            >
              {outcomeOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Journal notes</label>
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your trade hindsight, what went well, what you can improve..."
              className="w-full p-2 rounded bg-[#0f1724] text-white border border-zinc-700"
            />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!saving) onClose();
              }}
              className="px-4 py-2 bg-zinc-700 text-white rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
