"use client";

import { useRef, useState, useContext } from "react";
import { Dialog } from "@headlessui/react";
import { TradeContext } from "@/context/TradeContext";
import { Trade } from "@/types/trade";
import Papa from "papaparse";
import { X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function UploadCsvModal({ isOpen, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { trades, setTradesFromCsv } = useContext(TradeContext);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleFileUpload = () => {
    if (!selectedFile) return;

    setUploading(true);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data as any[];

        const mapped: Trade[] = parsed.map((row) => ({
          id: `${row.symbol}-${row.openTime}-${crypto.randomUUID()}`,
          symbol: row.symbol || "",
          direction: row.direction || "",
          orderType: row.orderType || "",
          openTime: row.openTime || new Date().toISOString(),
          closeTime: row.closeTime || new Date().toISOString(),
          session: row.session || "",
          lotSize: parseFloat(row.lotSize) || 0,
          entryPrice: parseFloat(row.entryPrice) || 0,
          stopLossPrice: parseFloat(row.stopLossPrice) || 0,
          takeProfitPrice: parseFloat(row.takeProfitPrice) || 0,
          pnl: parseFloat(row.pnl) || 0,
          duration: parseFloat(row.duration) || 0,
          outcome: row.outcome || "",
          rr: parseFloat(row.rr) || 0,
          reasonForTrade: row.reasonForTrade || "",
          emotion: row.emotion || "",
          journalNotes: row.journalNotes || "",
        }));

        // ✅ Append to existing trades
        const newTrades = [...trades, ...mapped];
        setTradesFromCsv(newTrades);

        setUploading(false);
        setSelectedFile(null);
        onClose();

        // ✅ Toast success
        toast.success(`${mapped.length} trade(s) uploaded successfully!`);
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
        toast.error("Failed to parse CSV file.");
        setUploading(false);
      },
    });
  };

  const csvColumns = [
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
    "pnl",
    "duration",
    "outcome",
    "rr",
    "reasonForTrade",
    "emotion",
    "journalNotes",
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-900 p-6 rounded-xl max-w-lg w-full shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Upload Trade CSV
            </Dialog.Title>
            <button onClick={onClose} className="hover:text-red-500">
              <X />
            </button>
          </div>

          <p className="text-sm mb-2">
            Make sure your CSV includes the following columns:
          </p>
          <ul className="text-xs text-gray-700 dark:text-gray-300 mb-4 grid grid-cols-2 gap-2 list-disc list-inside">
            {csvColumns.map((col) => (
              <li key={col}>{col}</li>
            ))}
          </ul>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="w-full mb-4 text-sm"
          />

          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-500 h-2 rounded-full animate-pulse"
                style={{ width: "100%" }}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleFileUpload}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!selectedFile || uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
