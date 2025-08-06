// src/components/dashboard/TradeHistoryTable.tsx

"use client";

import { useContext, useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import {
  Trash2,
  Pencil,
  Filter,
  DownloadCloud,
  FilePlus,
} from "lucide-react";
import { TradeContext } from "@/context/TradeContext";
import { Trade } from "@/types/trade";
import JournalModal from "@/components/modals/JournalModal";
import AddTradeModal from "@/components/modals/AddTradeModal";
import CsvUpload from "@/components/dashboard/CsvUpload";

const LOCAL_STORAGE_KEY = "userTrades";

export default function TradeHistoryTable() {
  const { trades, updateTrade, addTrade, deleteTrade } =
    useContext(TradeContext);

  const [mounted, setMounted] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const hasLoaded = useRef(false);

  const [filters, setFilters] = useState({
    symbol: "",
    outcome: "",
    fromDate: "",
    toDate: "",
    minPNL: "",
    maxPNL: "",
  });

  // load from localStorage once
  useEffect(() => {
    if (!hasLoaded.current) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed: Trade[] = JSON.parse(stored);
          parsed.forEach((t, i) => {
            const id = t.id || `${t.symbol}-${t.openTime}-${i}`;
            if (!trades.some((x) => x.id === id)) addTrade({ ...t, id });
          });
        } catch {
          console.error("Failed to load trades from localStorage");
        }
      }
      hasLoaded.current = true;
    }
    setMounted(true);
  }, []);

  // persist to localStorage
  useEffect(() => {
    if (mounted && hasLoaded.current) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trades));
    }
  }, [trades, mounted]);

  const handleEdit = (t: Trade) => setSelectedTrade(t);
  const handleSave = (t: Trade) => {
    updateTrade(t);
    setSelectedTrade(null);
  };
  const handleAdd = (t: Trade) => {
    const id = t.id || `${t.symbol}-${Date.now()}`;
    addTrade({ ...t, id });
    setIsAddOpen(false);
  };
  const handleDelete = (id: string) => deleteTrade(id);
  const handleFilterChange = (f: string, v: string) =>
    setFilters((p) => ({ ...p, [f]: v }));

  const filtered = trades.filter((t) => {
    const { symbol, outcome, fromDate, toDate, minPNL, maxPNL } = filters;
    const pnl = parseFloat(t.pnl as string);
    return (
      (!symbol || t.symbol.toLowerCase().includes(symbol.toLowerCase())) &&
      (!outcome || t.outcome === outcome) &&
      (!fromDate || new Date(t.openTime) >= new Date(fromDate)) &&
      (!toDate || new Date(t.closeTime) <= new Date(toDate)) &&
      (!minPNL || pnl >= parseFloat(minPNL)) &&
      (!maxPNL || pnl <= parseFloat(maxPNL))
    );
  });

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={() => setFilterOpen(!filterOpen)}
            title="Filters"
          >
            <Filter size={18} className="text-gray-300" />
          </button>
          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={() => setExportOpen(true)}
            title="Export"
          >
            <DownloadCloud size={18} className="text-gray-300" />
          </button>
          <button
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
            onClick={() => setCsvOpen(true)}
            title="Import CSV"
          >
            <FilePlus size={18} className="text-gray-300" />
          </button>
        </div>
        <button
          className="px-3 py-1 bg-green-600 rounded hover:bg-green-500 text-sm"
          onClick={() => setIsAddOpen(true)}
        >
          Add Trade
        </button>
      </div>

      {/* Filters panel */}
      {filterOpen && (
        <div className="grid md:grid-cols-6 gap-2 mb-4 text-sm">
          {["symbol", "outcome"].map((f) => (
            <input
              key={f}
              type="text"
              className="p-2 rounded bg-gray-800 text-white"
              placeholder={f}
              value={(filters as any)[f]}
              onChange={(e) => handleFilterChange(f, e.target.value)}
            />
          ))}
          {["fromDate", "toDate"].map((f) => (
            <input
              key={f}
              type="date"
              className="p-2 rounded bg-gray-800 text-white"
              value={(filters as any)[f]}
              onChange={(e) => handleFilterChange(f, e.target.value)}
            />
          ))}
          {["minPNL", "maxPNL"].map((f) => (
            <input
              key={f}
              type="number"
              className="p-2 rounded bg-gray-800 text-white"
              placeholder={f}
              value={(filters as any)[f]}
              onChange={(e) => handleFilterChange(f, e.target.value)}
            />
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto bg-gray-800 rounded-xl shadow-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-700 text-gray-200 sticky top-0">
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
                "Stop Loss",
                "Take Profit",
                "PNL ($)",
                "Duration",
                "Outcome",
                "RR",
                "Reason",
                "Emotion",
                "Notes",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 font-medium border-b border-gray-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const pnl = parseFloat(t.pnl as string);
              return (
                <tr
                  key={t.id}
                  className="hover:bg-gray-700 transition-colors"
                >
                  <td className="px-3 py-2">{t.symbol}</td>
                  <td className="px-3 py-2">{t.direction}</td>
                  <td className="px-3 py-2">{t.orderType}</td>
                  <td className="px-3 py-2">
                    {format(new Date(t.openTime), "Pp")}
                  </td>
                  <td className="px-3 py-2">
                    {format(new Date(t.closeTime), "Pp")}
                  </td>
                  <td className="px-3 py-2">{t.session}</td>
                  <td className="px-3 py-2">{t.lotSize}</td>
                  <td className="px-3 py-2">{t.entryPrice}</td>
                  <td className="px-3 py-2">{t.stopLossPrice}</td>
                  <td className="px-3 py-2">{t.takeProfitPrice}</td>
                  <td
                    className={`px-3 py-2 ${
                      pnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ${pnl.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">{t.duration}</td>
                  <td className="px-3 py-2">{t.outcome}</td>
                  <td className="px-3 py-2">{t.rr}</td>
                  <td className="px-3 py-2">{t.reasonForTrade}</td>
                  <td className="px-3 py-2">{t.emotion}</td>
                  <td className="px-3 py-2">{t.journalNotes}</td>
                  <td className="px-3 py-2 flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-1 hover:text-blue-400"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1 hover:text-red-400"
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

      {/* Modals */}
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

      {/* CSV Upload Modal */}
      {csvOpen && (
        <CsvUpload
          isOpen
          onClose={() => setCsvOpen(false)}
          onImport={(importedTrades) => {
            importedTrades.forEach((t) => handleAdd(t));
            setCsvOpen(false);
          }}
        />
      )}

      {/* Export Options Modal */}
      {exportOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg text-gray-200 mb-4">Export As</h3>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  /* CSV export logic */
                  setExportOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
              >
                CSV
              </button>
              <button
                onClick={() => {
                  /* PDF export logic */
                  setExportOpen(false);
                }}
                className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500"
              >
                PDF
              </button>
            </div>
            <button
              onClick={() => setExportOpen(false)}
              className="mt-4 text-sm text-gray-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
