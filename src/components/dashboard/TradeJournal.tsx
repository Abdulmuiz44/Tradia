"use client";

import { useTrade } from "@/context/TradeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Pencil,
  Download,
  RefreshCw,
  Tag,
  BarChart2,
  ImageIcon,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Tabs } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { generateInsights } from "@/utils/generateInsights";

type Tier = "free" | "plus" | "premium" | "pro";
type SubTab = "journal" | "insights" | "patterns" | "psychology";

export default function TradeJournal() {
  const { data: session } = useSession();
  const tier = (session?.user as any)?.subscription as Tier || "free";

  const { trades, updateTrade, deleteTrade } = useTrade();
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "breakeven">("all");
  const [editMode, setEditMode] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("journal");

  const parsePL = (v: string | number | undefined) => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.-]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "Invalid Date" : format(dt, "dd MMM yyyy, HH:mm");
  };

  // 1) Filtered list
  const filtered = useMemo(() => {
    if (filter === "all") return trades;
    return trades.filter((t) => (t.outcome ?? "").toLowerCase() === filter);
  }, [filter, trades]);

  // 2) Summary metrics + consistency
  const summary = useMemo(() => {
    const plValues = trades.map((t) => parsePL(t.pnl));
    const total = plValues.length;
    const win = trades.filter((t) => (t.outcome ?? "").toLowerCase() === "win").length;
    const loss = trades.filter((t) => (t.outcome ?? "").toLowerCase() === "loss").length;
    const breakeven = trades.filter((t) => (t.outcome ?? "").toLowerCase() === "breakeven").length;
    const netPL = plValues.reduce((s, v) => s + v, 0);
    const avgPL = total ? netPL / total : 0;
    const winRate = total ? (win / total) * 100 : 0;

    const variance = total
      ? plValues.reduce((sum, v) => sum + Math.pow(v - avgPL, 2), 0) / total
      : 0;
    const stdev = Math.sqrt(variance);
    const consistentCount = plValues.filter((v) => Math.abs(v - avgPL) <= stdev).length;
    const consistency = total ? (consistentCount / total) * 100 : 0;

    return { total, win, loss, breakeven, netPL, avgPL, winRate, consistency };
  }, [trades]);

  // 3) CSV export
  const exportCSV = () => {
    const hdr = ["Symbol","Entry","Exit","Lot Size","P/L","Outcome","Time","Reason","Notes"];
    const rows = trades.map(t => [
      t.symbol,
      t.entryPrice,
      t.exitPrice ?? "—",
      t.lotSize,
      `$${t.pnl}`,
      t.outcome,
      formatDate(t.openTime),
      t.reasonForTrade || "",
      t.notes || ""
    ]);
    const csv = [hdr, ...rows].map(r =>
      r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "trade_journal.csv";
    a.click();
  };

  // 4) Full PDF report
  const handleReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Tradia Trade Journal Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 28);

    if (trades.length) {
      const first = trades[0], last = trades[trades.length - 1];
      doc.text(`Date Range: ${formatDate(first.openTime)} – ${formatDate(last.openTime)}`, 14, 34);
    }

    const cols = ["Symbol","Entry","Exit","Lot","P/L","Outcome","Time","Reason","Notes"];
    const body = trades.map(t => [
      t.symbol,
      t.entryPrice,
      t.exitPrice ?? "—",
      String(t.lotSize),
      `$${t.pnl}`,
      t.outcome,
      formatDate(t.openTime),
      t.reasonForTrade || "",
      t.notes || ""
    ]);

    // plugin autoTable is now available
    // @ts-ignore
    doc.autoTable({ head: [cols], body, startY: 42, theme: "striped", styles: { fontSize: 8 } });
    doc.save("trade_journal_report.pdf");
  };

  const handleAutoJournal = () => {
    if (tier === "free") return alert("Auto-Journal is available for Plus+ subscribers.");
    alert("Auto-journaling trades…");
  };
  const handleInsights = () => {
    if (tier === "free") return alert("AI Insights are available for Premium+ subscribers.");
    alert("Generating AI Insights…");
  };

  // 5) Patterns by win-rate, fallback to reasonForTrade
  const patternStats = useMemo(() => {
    const stats: Record<string, { wins:number; total:number }> = {};
    trades.forEach(t => {
      const strat = (t.strategy || t.reasonForTrade || "Unlabeled").toUpperCase();
      if (!stats[strat]) stats[strat] = { wins:0, total:0 };
      stats[strat].total++;
      if ((t.outcome ?? "").toLowerCase() === "win") stats[strat].wins++;
    });
    return Object.entries(stats)
      .map(([strat, { wins, total }]) => ({
        strat,
        winRate: total ? (wins/total)*100 : 0
      }))
      .sort((a,b) => b.winRate - a.winRate)
      .slice(0, 3);
  }, [trades]);

  // 6) Psychology: emotion distribution + performance
  const psychology = useMemo(() => {
    const map: Record<string, { count:number; wins:number; totalPL:number }> = {};
    trades.forEach(t => {
      const e = (t.emotion || "neutral").toLowerCase();
      const pl = parsePL(t.pnl);
      if (!map[e]) map[e] = { count:0, wins:0, totalPL:0 };
      map[e].count++;
      if ((t.outcome ?? "").toLowerCase() === "win") map[e].wins++;
      map[e].totalPL += pl;
    });
    const arr = Object.entries(map).map(([emo, { count, wins, totalPL }]) => ({
      emo,
      count,
      winRate: count ? (wins/count)*100 : 0,
      avgPL: count ? totalPL/count : 0
    }));
    const best = arr.reduce((p,c) => c.winRate>p.winRate?c:p, arr[0]||{winRate:0} as any);
    const worst = arr.reduce((p,c) => c.winRate<p.winRate?c:p, arr[0]||{winRate:0} as any);
    return { all: arr, best, worst };
  }, [trades]);

  // --- NEW: compute deterministic insights using the utility you added
  const computedInsights = useMemo(() => {
    try {
      return generateInsights(trades || [], { minTradesForPattern: 5, winRateDeltaPct: 12, timeBucketSizeHours: 3 });
    } catch (err) {
      console.error("generateInsights error:", err);
      return [{
        id: "insight-error",
        text: "Failed to generate insights.",
        severity: "info"
      }] as any;
    }
  }, [trades]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="rounded-2xl shadow-md border bg-white dark:bg-gray-900 dark:border-gray-800 transition duration-300">
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 text-center text-sm">
          {[
            ["Total Trades", summary.total],
            ["Wins", summary.win, "text-green-500"],
            ["Losses", summary.loss, "text-red-500"],
            ["Breakevens", summary.breakeven, "text-yellow-500"],
            ["Net P/L", `$${summary.netPL.toFixed(2)}`, summary.netPL>=0?"text-green-500":"text-red-500"],
            ["Avg P/L", `$${summary.avgPL.toFixed(2)}`, summary.avgPL>=0?"text-green-500":"text-red-500"],
            ["Win Rate", `${summary.winRate.toFixed(1)}%`, "text-indigo-500"],
            ["Consistency", `${summary.consistency.toFixed(1)}%`, "text-blue-500"]
          ].map(([lbl, val, clr], i) => (
            <div key={i}>
              <p className="text-muted-foreground">{lbl}</p>
              <p className={`font-bold ${clr || ""}`}>{val}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sub-Tabs */}
      <Tabs
        items={[
          { value: "journal", label: "Journal" },
          { value: "insights", label: "Insights" },
          { value: "patterns", label: "Patterns" },
          { value: "psychology", label: "Psychology" },
        ]}
        activeTab={subTab}
        setActiveTab={setSubTab}
      />

      {/* Controls (Journal only) */}
      {subTab === "journal" && (
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="space-x-2">
            {["all","win","loss","breakeven"].map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f as any)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReport}>
              <FileText className="h-4 w-4 mr-1"/>Report
            </Button>
            <Button variant="ghost" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1"/>CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={handleAutoJournal}>
              <RefreshCw className="h-4 w-4 mr-1"/>Auto
            </Button>
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              <Pencil className="h-4 w-4 mr-1"/>{editMode ? "Done" : "Edit"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => alert("Tags coming soon!")}>
              <Tag className="h-4 w-4 mr-1"/>Tags
            </Button>
            <Button variant="ghost" size="sm" onClick={handleInsights}>
              <BarChart2 className="h-4 w-4 mr-1"/>Insights
            </Button>
            <Button variant="ghost" size="sm" onClick={() => alert("Images for Pro+")}>
              <ImageIcon className="h-4 w-4 mr-1"/>Image
            </Button>
          </div>
        </div>
      )}

      {/* 1) Journal */}
      {subTab === "journal" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <Card className="col-span-full p-6 text-center text-muted-foreground shadow-md rounded-2xl">
              <CardContent>
                <p className="text-lg font-medium">No entries yet.</p>
                <p className="text-sm mt-2">Add trades to see them here.</p>
              </CardContent>
            </Card>
          ) : filtered.map(t => (
            <Card
              key={t.id}
              className="rounded-2xl shadow-md border bg-white dark:bg-gray-900 dark:border-gray-800 transition duration-300"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{t.symbol}</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => deleteTrade(t.id)}>
                      <Trash2 className="h-4 w-4 text-red-500"/>
                    </Button>
                    {editMode && (
                      <Button variant="ghost" size="icon" onClick={() => updateTrade(t)}>
                        <Pencil className="h-4 w-4 text-blue-500"/>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium text-muted">Entry:</span>{" "}
                    <span className={`font-semibold ${
                      parsePL(t.entryPrice) >= 0 ? "text-green-500" : "text-red-500"
                    }`}>{t.entryPrice}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted">Exit:</span>{" "}
                    <span className={`font-semibold ${
                      parsePL(t.exitPrice) >= 0 ? "text-green-500" : "text-red-500"
                    }`}>{t.exitPrice ?? "—"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted">Lot:</span> {t.lotSize}
                  </div>
                  <div>
                    <span className="font-medium text-muted">P/L:</span>{" "}
                    <span className={`font-semibold ${
                      parsePL(t.pnl) >= 0 ? "text-green-500" : "text-red-500"
                    }`}>${t.pnl}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted">Time:</span> {formatDate(t.openTime)}
                  </div>
                  <div>
                    <span className="font-medium text-muted">Outcome:</span>{" "}
                    <span className={`font-semibold ${
                      (t.outcome ?? "").toLowerCase() === "win" ? "text-green-500" :
                      (t.outcome ?? "").toLowerCase() === "loss" ? "text-red-500" :
                      "text-yellow-500"
                    }`}>{t.outcome}</span>
                  </div>
                </div>
                {t.notes && (
                  <div className="text-sm text-muted-foreground border-t pt-2">
                    <span className="font-medium text-muted">Notes:</span> {t.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 2) Insights */}
      {subTab === "insights" && (
        <Card className="p-6 rounded-2xl shadow-md border bg-white dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="space-y-3 text-sm">
            <h3 className="text-lg font-semibold">Trade Analysis</h3>

            <div className="space-y-3">
              {computedInsights.map((ins: any) => (
                <div
                  key={ins.id}
                  className={`p-3 rounded ${ins.severity === "warning" ? "bg-yellow-900 text-yellow-100" : ins.severity === "recommendation" ? "bg-green-900 text-green-100" : "bg-zinc-800 text-zinc-100"}`}
                >
                  <p className="text-sm">{ins.text}</p>
                </div>
              ))}
            </div>

          </CardContent>
        </Card>
      )}

      {/* 3) Patterns */}
      {subTab === "patterns" && (
        <Card className="p-6 rounded-2xl shadow-md border bg-white dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="space-y-2 text-sm">
            <h3 className="text-lg font-semibold">Top 3 Strategies by Win Rate</h3>
            {patternStats.map(p => (
              <div key={p.strat} className="flex justify-between">
                <span>{p.strat}</span>
                <span className="font-bold">{p.winRate.toFixed(1)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 4) Psychology */}
      {subTab === "psychology" && (
        <Card className="p-6 rounded-2xl shadow-md border bg-white dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="space-y-2 text-sm">
            <h3 className="text-lg font-semibold">Emotion Breakdown</h3>
            {psychology.all.map(e => (
              <div key={e.emo} className="flex justify-between">
                <span className="capitalize">{e.emo}</span>
                <span className="font-bold">
                  {e.count} trades · {e.winRate.toFixed(1)}% wins · avg P/L ${e.avgPL.toFixed(2)}
                </span>
              </div>
            ))}
            <p className="mt-2 text-xs text-muted-foreground">
              Best state: <strong>{psychology.best.emo}</strong>, Worst: <strong>{psychology.worst.emo}</strong>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
