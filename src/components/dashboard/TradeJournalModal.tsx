"use client";

import React, { useState, useContext } from "react";
import { TradeContext } from "@/context/TradeContext";
import type { Trade } from "@/types/trade";

interface Props {
  trade: Trade;
  onClose: () => void;
}

export default function TradeJournalModal({ trade, onClose }: Props) {
  const ctx = useContext(TradeContext)!;
  const [note, setNote] = useState((trade as any).postNote || "");
  const [emotion, setEmotion] = useState((trade as any).emotion || "Calm");
  const [rating, setRating] = useState((trade as any).executionRating || 3);

  const save = () => {
    // some contexts expose addPostNote; if not, fall back to updateTrade
    if ((ctx as any).addPostNote) {
      try { (ctx as any).addPostNote((trade as any).id, note, emotion, rating); } catch { /* ignore */ }
    } else if ((ctx as any).updateTrade) {
      try { (ctx as any).updateTrade({ ...(trade as any), postNote: note, emotion, executionRating: rating }); } catch { /* ignore */ }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Journal: {trade.symbol}
        </h2>
        <label className="block mb-2 text-sm">Post‑Trade Note</label>
        <textarea
          className="w-full p-2 rounded-md mb-4 border"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm mb-1">Emotion</label>
            <select
              className="w-full p-2 rounded-md border"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
            >
              {["Fear","Greed","Confidence","Revenge","Calm"].map((emo) => (
                <option key={emo} value={emo}>{emo}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1">Execution Rating</label>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full p-2 rounded-md border"
              value={rating}
              onChange={(e) => setRating(+e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-indigo-600 text-white"
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
