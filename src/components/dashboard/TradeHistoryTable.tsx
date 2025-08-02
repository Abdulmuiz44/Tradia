// src/components/dashboard/TradeHistoryTable.tsx

"use client";

import { useContext, useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Trash2, Pencil } from "lucide-react";
import { TradeContext } from "@/context/TradeContext";
import { Trade } from "@/types/trade";
import JournalModal from "@/components/modals/JournalModal";
import AddTradeModal from "@/components/modals/AddTradeModal";

const LOCAL_STORAGE_KEY = "userTrades";

export default function TradeHistoryTable() {
  const { trades, updateTrade, addTrade, deleteTrade } = useContext(TradeContext);

  const [mounted, setMounted] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const hasLoaded = useRef(false);

  const [filters, setFilters] = useState({
    symbol: "",
    outcome: "",
    fromDate: "",
    toDate: "",
    minPNL: "",
    maxPNL: "",
  });

  // Load from localStorage once, but only add trades that are not already in context
  useEffect(() => {
    if (!hasLoaded.current) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: Trade[] = JSON.parse(stored);
          parsed.forEach((t, i) => {
            // Ensure each trade has an ID
            const id = t.id || `${t.symbol}-${t.openTime}-${i}`;
            // Only add if not already present
            if (!trades.some((x) => x.id === id)) {
              addTrade({ ...t, id });
            }
          });
        } catch {
          console.error("Failed to load trades from localStorage");
        }
      }
      hasLoaded.current = true;
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever trades change
  useEffect(() => {
    if (mounted && hasLoaded.current) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trades));
    }
  }, [trades, mounted]);

  const handleEdit = (trade: Trade) => setSelectedTrade(trade);
  const handleSave = (updated: Trade) => {
    updateTrade(updated);
    setSelectedTrade(null);
  };
  const handleAdd = (newTrade: Trade) => {
    // Generate a unique ID
    const id = newTrade.id || `${newTrade.symbol}-${Date.now()}`;
    addTrade({ ...newTrade, id });
    setIsAddOpen(false);
  };
  const handleDelete = (id: string) => {
    deleteTrade(id);
  };
  const handleFilterChange = (field: string, value: string) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  const filtered = trades.filter((t) => {
    const { symbol, outcome, fromDate, toDate, minPNL, maxPNL } = filters;
    const pnlNum = parseFloat(t.pnl as string);
    return (
      (symbol ? t.symbol.toLowerCase().includes(symbol.toLowerCase()) : true) &&
      (outcome ? t.outcome?.toLowerCase().includes(outcome.toLowerCase()) : true) &&
      (fromDate ? new Date(t.openTime) >= new Date(fromDate) : true) &&
      (toDate ? new Date(t.closeTime) <= new Date(toDate) : true) &&
      (minPNL ? pnlNum >= parseFloat(minPNL) : true) &&
      (maxPNL ? pnlNum <= parseFloat(maxPNL) : true)
    );
  });

  if (!mounted) return null;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Trade History</h2>
      <button
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        onClick={() => setIsAddOpen(true)}
      >
        Add Trade
      </button>

      {/* Filters */}
      <div className="grid md:grid-cols-6 gap-2 mb-4 text-sm mt-4">
        {["symbol", "outcome"].map((f) => (
          <input
            key={f}
            type="text"
            className="p-2 rounded border dark:bg-gray-800"
            placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
            value={(filters as any)[f]}
            onChange={(e) => handleFilterChange(f, e.target.value)}
          />
        ))}
        {["fromDate", "toDate"].map((f) => (
          <input
            key={f}
            type="date"
            className="p-2 rounded border dark:bg-gray-800"
            value={(filters as any)[f]}
            onChange={(e) => handleFilterChange(f, e.target.value)}
          />
        ))}
        {["minPNL", "maxPNL"].map((f) => (
          <input
            key={f}
            type="number"
            className="p-2 rounded border dark:bg-gray-800"
            placeholder={f}
            value={(filters as any)[f]}
            onChange={(e) => handleFilterChange(f, e.target.value)}
          />
        ))}
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="min-w-full text-sm text-left border-collapse text-gray-900 dark:text-gray-100">
          <thead className="bg-gray-800 text-gray-100 sticky top-0">
            <tr>
              {[
                "Symbol",
                "Direction",
                "Order Type",
                "Open Time",
                "Close Time",
                "Session",
                "Lot Size",
                "Entry Price",
                "Stop Loss Price",
                "Take Profit Price",
                "PNL ($)",
                "Duration (Min)",
                "Outcome",
                "Result (RR)",
                "Reason For Trade",
                "Emotion",
                "Journal Notes",
                "Action",
              ].map((h) => (
                <th key={h} className="px-4 py-2 border-b border-gray-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const pnlVal = parseFloat(t.pnl as string);
              const pnlDisp = !isNaN(pnlVal) ? `$${pnlVal.toFixed(2)}` : t.pnl;

              return (
                <tr
                  key={t.id}
                  className="hover:bg-gray-700 transition-colors duration-200"
                >
                  <td
                    className="px-4 py-2 border-b border-gray-700 cursor-pointer"
                    onClick={() => handleEdit(t)}
                  >
                    {t.symbol}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.direction}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.orderType}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {format(new Date(t.openTime), "Pp")}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {format(new Date(t.closeTime), "Pp")}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.session}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.lotSize}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.entryPrice}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.stopLossPrice}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.takeProfitPrice}
                  </td>
                  <td
                    className={`px-4 py-2 border-b border-gray-700 ${
                      pnlVal >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {pnlDisp}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.duration}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.outcome}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.rr}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.reasonForTrade}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.emotion}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700">
                    {t.journalNotes}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-700 space-x-2">
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-1 hover:text-blue-500"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <JournalModal
        isOpen={!!selectedTrade}
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onSave={handleSave}
      />
      <AddTradeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAdd}
      />
    </div>
  );
}
