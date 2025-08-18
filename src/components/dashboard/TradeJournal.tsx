// src/components/dashboard/TradeJournal.tsx
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
import { generateInsights, Insight } from "@/utils/generateInsights";
import type { Trade } from "@/types/trade";

type Tier = "free" | "plus" | "premium" | "pro";
type SubTab = "journal" | "insights" | "patterns" | "psychology";

export default function TradeJournal() {
  const { data: session } = useSession();
  const tier = ((session?.user as { subscription?: Tier } | undefined)?.subscription as Tier) || "free";

  const { trades, updateTrade, deleteTrade } = useTrade();
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "breakeven">("all");
  const [editMode, setEditMode] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("journal");

  const parsePL = (v?: string | number | null): number => {
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

  // compute insights safely
  const computedInsights = useMemo<Insight[]>(() => {
    try {
      return generateInsights(trades || []);
    } catch (err) {
      console.error("generateInsights error:", err);
      return [
        {
          id: "insight-error",
          title: "Error",
          detail: "Failed to generate insights",
          score: 0,
        },
      ];
    }
  }, [trades]);

  // rest of your component rendering (unchanged)...
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

      {/* Tabs and rest of UI (unchanged) */}
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

      {/* ...the remainder of the file remains your original rendering logic */}
    </div>
  );
}
