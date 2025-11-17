"use client";

import React, { useState } from "react";
import { useTrade } from "@/context/TradeContext";

interface Props {
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function BulkActionBar({ selectedIds, setSelectedIds }: Props) {
  const ctx = useTrade();
  const [filterEmotion, setFilterEmotion] = useState<string>("");

  return (
    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-4">
      <div className="flex gap-2">
        {selectedIds.length > 0 && (
          <>
            {/* TODO: Implement bulkToggleReviewed method in TradeContext */}
            {/* <button
              className="px-3 py-1 bg-green-500 text-white rounded"
              onClick={() => ctx.bulkToggleReviewed(selectedIds, true)}
            >
              Mark Reviewed
            </button>
            <button
              className="px-3 py-1 bg-red-500 text-white rounded"
              onClick={() => ctx.bulkToggleReviewed(selectedIds, false)}
            >
              Mark Pending
            </button> */}
          </>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-sm">Emotion:</label>
        <select
          className="p-1 rounded border"
          value={filterEmotion}
          onChange={(e) => setFilterEmotion(e.target.value)}
        >
          <option value="">All</option>
          {["Fear","Greed","Confidence","Revenge","Calm"].map((emo) => (
            <option key={emo} value={emo}>{emo}</option>
          ))}
        </select>
        <button
          className="px-2 py-1 bg-gray-300 dark:bg-gray-700 rounded"
          onClick={() => setSelectedIds([])}
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
}
