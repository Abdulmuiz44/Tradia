"use client";

import { useTrade } from "@/context/TradeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Download, RefreshCw, Tag } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";

export default function TradeJournal() {
  const { trades, updateTrade, deleteTrade } = useTrade();
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "breakeven">("all");
  const [editMode, setEditMode] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return format(date, "dd MMM yyyy, HH:mm");
    } catch {
      return "Invalid Date";
    }
  };

  const filteredTrades = useMemo(() => {
    if (filter === "all") return trades;
    return trades.filter((t) => t.outcome.toLowerCase() === filter);
  }, [filter, trades]);

  const summary = useMemo(() => {
    const win = trades.filter((t) => t.outcome.toLowerCase() === "win").length;
    const loss = trades.filter((t) => t.outcome.toLowerCase() === "loss").length;
    const breakeven = trades.filter((t) => t.outcome.toLowerCase() === "breakeven").length;
    const total = trades.length;
    const netPL = trades.reduce((sum, t) => sum + (parseFloat(t.profitLoss) || 0), 0);
    return { total, win, loss, breakeven, netPL };
  }, [trades]);

  const exportCSV = () => {
    const headers = ["Symbol","Entry","Exit","Lot Size","P/L","Outcome","Time","Notes"];
    const rows = trades.map((t) => [
      t.symbol,
      t.entryPrice,
      t.exitPrice ?? "—",
      t.lotSize,
      t.profitLoss,
      t.outcome,
      formatDate(t.openTime),
      t.notes ?? "",
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "trade_journal.csv"; a.click();
  };

  // Placeholder auto-journal: just alerts
  const handleAutoJournal = () => alert("Auto-journal from trade history coming soon!");

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="rounded-2xl shadow-md border bg-white dark:bg-gray-900 dark:border-gray-800 transition duration-300">
        <CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-center text-sm">
          <div><p className="text-muted-foreground">Total Trades</p><p className="font-bold">{summary.total}</p></div>
          <div><p className="text-muted-foreground">Wins</p><p className="font-bold text-green-500">{summary.win}</p></div>
          <div><p className="text-muted-foreground">Losses</p><p className="font-bold text-red-500">{summary.loss}</p></div>
          <div><p className="text-muted-foreground">Breakevens</p><p className="font-bold text-yellow-500">{summary.breakeven}</p></div>
          <div><p className="text-muted-foreground">Net P/L</p><p className={`font-bold ${summary.netPL>=0?"text-green-500":"text-red-500"}`}>{summary.netPL.toFixed(2)}</p></div>
        </CardContent>
      </Card>

      {/* Controls: Filter, Export, Auto-Journal, Edit Mode, Tagging */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="space-x-2">
          {["all","win","loss","breakeven"].map(f => (
            <Button
              key={f}
              variant={filter===f?"default":"outline"}
              size="sm"
              onClick={() => setFilter(f as any)}
            >
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1"/>Export CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={handleAutoJournal}>
            <RefreshCw className="h-4 w-4 mr-1"/>Auto-Journal
          </Button>
          <Button variant={editMode?"default":"outline"} size="sm" onClick={()=>setEditMode(!editMode)}>
            <Pencil className="h-4 w-4 mr-1"/>{editMode?"Exit Edit":"Edit Trades"}
          </Button>
          <Button variant="ghost" size="sm" onClick={()=>alert("Notes/Strategy tagging coming soon!")}>
            <Tag className="h-4 w-4 mr-1"/>Tags
          </Button>
        </div>
      </div>

      {/* Journal Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTrades.length===0 ? (
          <Card className="col-span-full p-6 text-center text-muted-foreground shadow-md rounded-2xl">
            <CardContent>
              <p className="text-lg font-medium">No trades in your journal yet.</p>
              <p className="text-sm mt-2">Start trading and your entries will appear here.</p>
            </CardContent>
          </Card>
        ) : filteredTrades.map(trade => (
          <Card key={trade.id} className="rounded-2xl shadow-md border bg-white dark:bg-gray-900 dark:border-gray-800 transition duration-300">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{trade.symbol}</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={()=>deleteTrade(trade.id)}>
                    <Trash2 className="h-4 w-4 text-red-500"/>
                  </Button>
                  {editMode && (
                    <Button variant="ghost" size="icon" onClick={()=>updateTrade({...trade, /* open edit modal */})}>
                      <Pencil className="h-4 w-4 text-blue-500"/>
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-muted">Entry:</span>{" "}
                  <span className={`font-semibold ${parseFloat(trade.entryPrice)>=0?"text-green-500":"text-red-500"}`}>
                    {trade.entryPrice}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted">Exit:</span>{" "}
                  <span className={`font-semibold ${parseFloat(trade.exitPrice||"0")>=0?"text-green-500":"text-red-500"}`}>
                    {trade.exitPrice ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted">Lot Size:</span>{" "}
                  {trade.lotSize}
                </div>
                <div>
                  <span className="font-medium text-muted">Profit/Loss:</span>{" "}
                  <span className={`font-semibold ${parseFloat(trade.profitLoss)>=0?"text-green-500":"text-red-500"}`}>
                    {trade.profitLoss}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted">Time:</span>{" "}
                  {formatDate(trade.openTime)}
                </div>
                <div>
                  <span className="font-medium text-muted">Outcome:</span>{" "}
                  <span className={`font-semibold ${
                    trade.outcome.toLowerCase()==="win"?"text-green-500":
                    trade.outcome.toLowerCase()==="loss"?"text-red-500":
                    "text-yellow-500"
                  }`}>
                    {trade.outcome}
                  </span>
                </div>
              </div>

              {trade.notes && (
                <div className="text-sm text-muted-foreground border-t pt-2">
                  <span className="font-medium text-muted">Notes:</span> {trade.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
