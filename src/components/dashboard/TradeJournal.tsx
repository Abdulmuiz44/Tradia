"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";

import {
  Trash2,
  Pencil,
  Save,
  X,
  Download,
  RefreshCw,
  Tag as TagIcon,
  BarChart2,
  ImageIcon,
  FileText,
  Plus,
  Filter,
  Search,
  Star,
  ArrowUpRight,
  Clipboard,
  Upload,
  Calendar as CalendarIcon,
  Check,
  AlertTriangle,
  TrendingUp,
  Sliders,
  Target,
  Flag,
  Award,
  Activity,
  Clock,
  Users,
} from "lucide-react";

import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  differenceInCalendarDays,
  parseISO,
} from "date-fns";

import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { generateInsights, Insight } from "@/utils/generateInsights";
import type { Trade as TradeFromTypes } from "@/types/trade";

/* ChartJS registration */
ChartJS.register(
  LineElement,
  BarElement,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

/* --------------------------------------------------------------------------------
   Types & helpers
-------------------------------------------------------------------------------- */

type Tier = "free" | "plus" | "premium" | "pro";
type SubTab = "journal" | "insights" | "patterns" | "psychology" | "calendar" | "forecast" | "optimizer" | "prop";

type Trade = TradeFromTypes & {
  id?: string | number;
  _id?: string | number;
  tradeId?: string | number;
  openTime?: string | Date;
  closeTime?: string | Date;
  outcome?: string;
  pnl?: number | string;
  symbol?: string;
  note?: string;
  tags?: string[];
  strategy?: string;
  SL?: number | string;
  TP?: number | string;
  rr?: number | string;
  reviewed?: boolean;
  pinned?: boolean;
};

const getTradeId = (t: Trade | { id?: string | number } | string | number): string => {
  if (typeof t === "string" || typeof t === "number") return String(t);
  const raw = (t as any).id ?? (t as any)._id ?? (t as any).tradeId ?? `${(t as any).symbol ?? "UNK"}-${(t as any).openTime ?? Math.random()}`;
  return String(raw);
};

const parsePL = (v?: string | number | null): number => {
  const str = String(v ?? "0");
  const n = parseFloat(str.replace(/[^0-9\.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

const fmtDateTime = (d?: string | Date) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : (d as Date);
  return isNaN(dt.getTime()) ? "Invalid Date" : format(dt, "dd MMM yyyy, HH:mm");
};

const toCSV = (rows: Array<Record<string, any>>): string => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
};

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/* -------------------------------------------------------------------------
   Main component
------------------------------------------------------------------------- */

export default function TradeJournal(): React.ReactElement {
  const { data: session } = useSession();
  const tier = ((session?.user as { subscription?: Tier } | undefined)?.subscription as Tier) || "free";

  const { trades = [], updateTrade, deleteTrade, refreshTrades } = useTrade() as any;
  // strongly-typed alias so array callbacks infer Trade instead of implicit any
  const tradesTyped = trades as Trade[];

  // UI
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "breakeven">("all");
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState<SubTab>("journal");
  const [editMode, setEditMode] = useState(false);
  // allow loose shape for edits (strings from inputs) without changing trade logic
  const [rowEdits, setRowEdits] = useState<Record<string, Partial<Trade> & Record<string, any>>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [attachments, setAttachments] = useState<Record<string, File[]>>({});
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [pinnedMap, setPinnedMap] = useState<Record<string, boolean>>({});
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [importPreview, setImportPreview] = useState<Trade[] | null>(null);

  // selection + bulk
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // position sizing
  const [accountBalance, setAccountBalance] = useState<number | "">("");
  const [riskPercent, setRiskPercent] = useState<number>(1);

  // psychology note persisted locally
  const storageKey = "trading_psych_note_" + (session?.user?.email ?? session?.user?.name ?? "anon");
  const [psychNote, setPsychNote] = useState<string>("");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (saved) setPsychNote(saved);
  }, [storageKey]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(storageKey, psychNote);
  }, [psychNote, storageKey]);

  // pins/tips
  const [pinnedTips, setPinnedTips] = useState<string[]>([]);

  // pending deletes
  const [pendingDeletes, setPendingDeletes] = useState<{ id: string; trade: Trade; timeoutId: number }[]>([]);
  const [undoVisible, setUndoVisible] = useState(false);

  // local suggestions
  const [suggestedTagsMap, setSuggestedTagsMap] = useState<Record<string, string[]>>({});

  // charts mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ---------------------------
     Derived / filtered trades
     --------------------------- */
  const filtered = useMemo(() => {
    let list = tradesTyped;
    if (filter !== "all") list = list.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === filter);
    if (pinnedOnly) list = list.filter((t: Trade) => pinnedMap[getTradeId(t)] || (t as any).pinned);
    if (tagFilter) list = list.filter((t: Trade) => Array.isArray(t.tags) && t.tags.includes(tagFilter));
    if (selectedDay) {
      list = list.filter((t: Trade) => {
        try {
          const dt = new Date(t.openTime as any);
          return isSameDay(dt, selectedDay);
        } catch {
          return false;
        }
      });
    }
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((t: Trade) => {
      const fields = [
        t.symbol,
        t.outcome,
        t.note,
        t.strategy,
        ...(Array.isArray(t.tags) ? t.tags.join(" | ") : []),
      ]
        .filter(Boolean)
        .map((x: any) => String(x).toLowerCase())
        .join(" ");
      return fields.includes(s);
    });
  }, [trades, filter, pinnedOnly, pinnedMap, tagFilter, selectedDay, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const A = new Date(a.openTime as any).getTime() || 0;
    const B = new Date(b.openTime as any).getTime() || 0;
    return B - A;
  }), [filtered]);

  /* ---------------------------
     Stats & analytics
     --------------------------- */

  const summary = useMemo(() => {
  const plValues = tradesTyped.map((t: Trade) => parsePL(t.pnl));
    const total = plValues.length;
  const win = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "win").length;
  const loss = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "loss").length;
  const breakeven = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "breakeven").length;
  const netPL = plValues.reduce((s: number, v: number) => s + v, 0);
  const avgPL = total ? netPL / total : 0;
  const winRate = total ? (win / total) * 100 : 0;
  const winsArr = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "win").map((t: Trade) => parsePL(t.pnl));
  const lossesArr = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "loss").map((t: Trade) => parsePL(t.pnl));
  const avgWin = winsArr.length ? winsArr.reduce((s: number, v: number) => s + v, 0) / winsArr.length : 0;
  const avgLoss = lossesArr.length ? lossesArr.reduce((s: number, v: number) => s + v, 0) / lossesArr.length : 0;
  const expectancy = (winRate / 100) * avgWin - ((lossesArr.length / (total || 1)) * Math.abs(avgLoss));
  const variance = total ? plValues.reduce((sum: number, v: number) => sum + Math.pow(v - avgPL, 2), 0) / total : 0;
    const stdev = Math.sqrt(variance);
  const consistentCount = plValues.filter((v: number) => Math.abs(v - avgPL) <= stdev).length;
    const consistency = total ? (consistentCount / total) * 100 : 0;

    // sharpe-like ratio (no risk-free)
    const sharpe = stdev ? (avgPL / stdev) : 0;

    // average trade length
  const lengths = tradesTyped.map((t: Trade) => {
      try {
        const o = new Date(t.openTime as any).getTime();
        const c = new Date(t.closeTime as any).getTime();
        if (!o || !c) return 0;
        return Math.max(0, (c - o) / (1000 * 60)); // minutes
      } catch { return 0; }
    });
  const avgLengthMin = lengths.length ? lengths.reduce((s: number, v: number) => s + v, 0) / lengths.length : 0;

    return { total, win, loss, breakeven, netPL, avgPL, winRate, consistency, expectancy, avgWin, avgLoss, stdev, sharpe, avgLengthMin };
  }, [trades]);

  /* ---------------------------
     Generate insights (AI-style + heuristics)
     --------------------------- */
  const computedInsights = useMemo<Insight[]>(() => {
    try {
      const base = generateInsights((tradesTyped || []) as Trade[] || []);
      // add more heuristics and rank
      const extra: Insight[] = [];

      // streak-based advice
  const wins = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "win").length;
  const losses = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "loss").length;
      if (trades.length >= 10) {
        // detect recent tilt (e.g., many losses in a short window)
    const recent = tradesTyped.slice(-8);
    const recentLosses = recent.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "loss").length;
        if (recentLosses >= 4) {
          extra.push({
            id: "tilt-warning",
            title: "Potential Tilt / Bad Run",
            detail: `You had ${recentLosses} losses in your last ${recent.length} trades. Consider stepping away or reviewing setups before trading more.`,
            score: 90,
          });
        }
      }

      // big loss detector
  const bigLoss = tradesTyped.map((t: Trade) => parsePL(t.pnl)).filter((v: number) => v < 0).sort((a,b)=>a-b)[0];
      if (bigLoss && Math.abs(bigLoss) > Math.abs(summary.avgWin) * 3) {
        extra.push({
          id: "big-loss",
          title: "Outlier Loss Detected",
          detail: `You have an outlier loss of $${Math.abs(bigLoss).toFixed(2)} which is much larger than your avg win. Consider reviewing sizing and SL rules.`,
          score: 85,
        });
      }

      // sharpe tip
      if (summary.sharpe < 0.5) {
        extra.push({
          id: "sharpe-low",
          title: "Low Reward-to-Volatility",
          detail: `Sharpe-like ratio is low (${summary.sharpe.toFixed(2)}). Consider improving edge or reducing variability.`,
          score: 80,
        });
      }

      // combine and sort
      const combined = [...(base || []), ...extra].sort((a,b)=> (b.score ?? 0) - (a.score ?? 0));
      return combined;
    } catch (err) {
      console.error("generateInsights error:", err);
      return [{
        id: "insight-error",
        title: "Error",
        detail: "Failed to generate insights",
        score: 0
      }];
    }
  }, [trades, summary]);

  /* ---------------------------
     Patterns & trading behavior
     --------------------------- */
  const patterns = useMemo(() => {
    const bySymbol: Record<string, { count: number; win: number; loss: number; pl: number }> = {};
    const byDOW: Record<string, { count: number; pl: number }> = {};
    const sessions: Record<"asia" | "london" | "newyork" | "other", { count: number; pl: number }> = {
      asia: { count: 0, pl: 0 },
      london: { count: 0, pl: 0 },
      newyork: { count: 0, pl: 0 },
      other: { count: 0, pl: 0 },
    };

    const hours = Array.from({length:24}, () => ({ trades: 0, pl: 0 }));
    const calMap: Record<string, { trades: number; net: number }> = {};
    const stratMap: Record<string, { trades: number; wins: number; losses: number; netPL: number }> = {};

  for (const t of tradesTyped) {
      const sym = t.symbol ?? "N/A";
      bySymbol[sym] ??= { count: 0, win: 0, loss: 0, pl: 0 };
      bySymbol[sym].count += 1;
      const outcome = (t.outcome ?? "").toLowerCase();
      if (outcome === "win") bySymbol[sym].win += 1;
      if (outcome === "loss") bySymbol[sym].loss += 1;
      bySymbol[sym].pl += parsePL(t.pnl);

  const dt = new Date(t.openTime as any);
      const valid = !isNaN(dt.getTime());
      const dow = valid ? format(dt, "EEE") : "—";
      byDOW[dow] ??= { count: 0, pl: 0 };
      byDOW[dow].count += 1;
      byDOW[dow].pl += parsePL(t.pnl);

      if (valid) {
        const h = dt.getUTCHours();
        hours[h].trades += 1;
        hours[h].pl += parsePL(t.pnl);
  const bucket: "asia" | "london" | "newyork" | "other" = h >=0 && h < 7 ? "asia" : h >=7 && h <12 ? "london" : h >=12 && h <20 ? "newyork" : "other";
  sessions[bucket].count += 1;
  sessions[bucket].pl += parsePL(t.pnl);
        const dayKey = format(dt, "yyyy-MM-dd");
        calMap[dayKey] ??= { trades: 0, net: 0 };
        calMap[dayKey].trades += 1;
        calMap[dayKey].net += parsePL(t.pnl);
      }

      const strat = (t.strategy ?? "Unassigned").trim() || "Unassigned";
      stratMap[strat] ??= { trades: 0, wins: 0, losses: 0, netPL: 0 };
      stratMap[strat].trades += 1;
      if (outcome === "win") stratMap[strat].wins += 1;
      if (outcome === "loss") stratMap[strat].losses += 1;
      stratMap[strat].netPL += parsePL(t.pnl);
    }

  const topSymbols = Object.entries(bySymbol).sort((a,b)=> b[1].count - a[1].count).slice(0,8).map(([sym,s])=>({
      symbol: sym,
      trades: s.count,
      winRate: s.count ? (s.win/s.count)*100 : 0,
      netPL: s.pl
    }));

    return { bySymbol, byDOW, sessions, hours, calMap, topSymbols, stratMap };
  }, [trades]);

  /* ---------------------------
     Charts data
     --------------------------- */

  const charts = useMemo(() => {
    // order trades chronologically ascending
    const ordered = [...tradesTyped].sort((a,b)=> new Date(a.openTime as any).getTime() - new Date(b.openTime as any).getTime());
    const labels = ordered.map(t => format(new Date(t.openTime as any), "MMM d"));
    const cumPnlArr: number[] = [];
    let cum = 0;
    for (const t of ordered) {
      cum += parsePL(t.pnl);
      cumPnlArr.push(cum);
    }

    // rolling win rate (window 20)
  const winArr: number[] = ordered.map((t: Trade) => (String(t.outcome).toLowerCase() === "win" ? 1 : 0));
    const rollingWindow = 20;
    const rolling = winArr.map((_, idx) => {
      const start = Math.max(0, idx - rollingWindow + 1);
      const slice = winArr.slice(start, idx + 1);
  const avg = slice.reduce((s:number,v:number)=>s+v,0) / (slice.length || 1);
      return +(avg*100).toFixed(2);
    });

    const pnlOverTime = {
      labels,
      datasets: [
        {
          label: "Cumulative PnL",
          data: cumPnlArr,
          borderColor: "#60a5fa",
          backgroundColor: "#60a5fa44",
          fill: true,
          tension: 0.2,
        }
      ]
    };

    const rollingWinData = {
      labels,
      datasets: [
        {
          label: `Rolling WR (${rollingWindow})`,
          data: rolling,
          borderColor: "#34d399",
          backgroundColor: "#34d39933",
          fill: true,
          tension: 0.2,
        }
      ]
    };

    // histogram of PnL buckets
  const pnls = ordered.map((t: Trade) => parsePL(t.pnl));
    const bucketCount = 12;
    const min = Math.min(...(pnls.length ? pnls : [0]));
    const max = Math.max(...(pnls.length ? pnls : [0]));
    const range = Math.max(1, max - min);
    const buckets = Array.from({length: bucketCount}).map(()=>0);
    const bucketLabels = Array.from({length: bucketCount}).map((_,i)=> {
      const low = (min + (i/ bucketCount) * range);
      const high = (min + ((i+1)/bucketCount)*range);
      return `${Math.round(low)}..${Math.round(high)}`;
    });
    pnls.forEach(v=>{
      const idx = Math.min(bucketCount-1, Math.floor(((v - min) / range) * bucketCount));
      buckets[idx] += 1;
    });

    const pnlHistogram = {
      labels: bucketLabels,
      datasets: [{ label: "Trades", data: buckets, backgroundColor: "#f472b6" }]
    };

    return { pnp: pnlOverTime, rollingWinData, pnlHistogram };
  }, [trades]);

  /* ---------------------------
     RR parsing utility (borrowed from Overview)
     --------------------------- */
  const parseRR = (t: Trade): number => {
    const keys = ["rr","RR","riskReward","risk_reward","rrRatio","rr_ratio","R_R","risk_reward_ratio","riskRewardRatio"];
    for (const k of keys) {
      const c = (t as any)[k];
      if (c === undefined || c === null) continue;
      if (typeof c === "number" && Number.isFinite(c)) return c as number;
      if (typeof c === "string") {
        const s = c.trim();
        const sClean = s.replace(/\s+/g, "");
        // colon or slash
        if (sClean.includes(":")) {
          const parts = sClean.split(":");
          if (parts.length === 2) {
            const a = parseFloat(parts[0]!);
            const b = parseFloat(parts[1]!);
            if (!Number.isNaN(a) && !Number.isNaN(b) && a !== 0) return b / a;
          }
        }
        if (sClean.includes("/")) {
          const parts = sClean.split("/");
          if (parts.length === 2) {
            const a = parseFloat(parts[0]!);
            const b = parseFloat(parts[1]!);
            if (!Number.isNaN(a) && !Number.isNaN(b) && a !== 0) return b / a;
          }
        }
        // "2R"
        const withoutR = sClean.replace(/R$/i, "");
        const n = parseFloat(withoutR);
        if (!Number.isNaN(n)) return n;
        const m = s.match(/-?\d+(?:\.\d+)?/);
        if (m) return parseFloat(m[0]!);
      }
    }
    return Number.NaN;
  };

  /* ---------------------------
     SL/TP optimizer (heuristic)
     --------------------------- */
  const [sltpSuggestion, setSltpSuggestion] = useState<{ recommendedRR: number; note: string } | null>(null);
  useEffect(() => {
    const wins = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "win").map((t: Trade) => parsePL(t.pnl));
    const losses = tradesTyped.filter((t: Trade) => (t.outcome ?? "").toLowerCase() === "loss").map((t: Trade) => parsePL(t.pnl));
    const avgWin = wins.length ? wins.reduce((s,v)=>s+v,0)/wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s,v)=>s+v,0)/losses.length : 0;
    let recommendedRR = 1;
    if (Math.abs(avgLoss) > 0) recommendedRR = Math.max(1, Math.abs(avgWin) / Math.abs(avgLoss));
    recommendedRR = Math.round(recommendedRR * 10) / 10;
    setSltpSuggestion({
      recommendedRR,
      note: `Based on historic avgWin ${avgWin.toFixed(2)} and avgLoss ${avgLoss.toFixed(2)} recommend ${recommendedRR}R target.`
    });
  }, [trades]);

  const applySltpToSelected = (rr: number) => {
    const ids = Object.entries(selected).filter(([_,v])=>v).map(([id])=>id);
    if (!ids.length) { alert("No selected trades"); return; }
    ids.forEach(id => {
      const t = tradesTyped.find((x: Trade) => getTradeId(x) === id);
      if (!t) return;
      setRowEdits(prev => ({...prev, [id]: { ...(prev[id]||{}), rr: String(rr) }}));
      try { (updateTrade as any)?.(id, { ...(t as any), rr: String(rr) }); } catch {}
    });
    alert(`Applied ${rr}R to ${ids.length} trades (attempted server update).`);
  };

  /* ---------------------------
     Streak & behavioral detectors
     --------------------------- */
  const streaks = useMemo(() => {
    let maxWinStreak = 0, maxLossStreak = 0, currWin = 0, currLoss = 0;
    for (const t of trades) {
      const o = (t.outcome ?? "").toLowerCase();
      if (o === "win") { currWin++; currLoss = 0; }
      else if (o === "loss") { currLoss++; currWin = 0; }
      else { currWin = 0; currLoss = 0; }
      maxWinStreak = Math.max(maxWinStreak, currWin);
      maxLossStreak = Math.max(maxLossStreak, currLoss);
    }
    return { maxWinStreak, maxLossStreak };
  }, [trades]);

  // detect revenge trading: consecutive increasing size after losses (heuristic: look for increasing absolute PnL losses followed by larger trades)
  const revengeDetector = useMemo(() => {
    if (tradesTyped.length < 5) return { flagged: false, reason: "" };
    // check last 5 trades: if a loss streak >2 followed by a larger risk trade (by |pnl|) flagged
    const last: Trade[] = tradesTyped.slice(-6);
    const losses = last.filter((t: Trade) => parsePL(t.pnl) < 0);
    const lossConsec = (() => {
      let c = 0, max = 0;
      for (const t of last) {
        if (parsePL(t.pnl) < 0) { c++; max = Math.max(max, c); } else c = 0;
      }
      return max;
    })();
  const increasedRisk = last.some((t: Trade) => Math.abs(parsePL(t.pnl)) > Math.abs(summary.avgLoss) * 1.5);
    if (lossConsec >= 3 && increasedRisk) {
      return { flagged: true, reason: `Detected ${lossConsec} consecutive losses and one or more larger-than-average trades — possible revenge trading.` };
    }
    return { flagged: false, reason: "" };
  }, [trades, summary]);

  /* ---------------------------
     Psychology extras
     --------------------------- */
  // quick mood buttons (appends timestamped mood to psychNote)
  const moods = ["Calm","Focused","Hesitant","Revengeful","Overconfident","Tired","Distracted","Confident"];
  const addMoodStamp = (mood: string) => setPsychNote(prev => prev ? `${prev}\n[${format(new Date(), "yyyy-MM-dd HH:mm")}] Mood: ${mood}` : `[${format(new Date(), "yyyy-MM-dd HH:mm")}] Mood: ${mood}`);

  // journaling prompts generator (random)
  const prompts = [
    "What was my edge on the last trade?",
    "What could I have done to reduce risk?",
    "Which patterns repeated today?",
    "What emotional state influenced my entries?",
    "How did I follow my plan?",
    "What will I change tomorrow?"
  ];
  const randomPrompt = () => prompts[Math.floor(Math.random()*prompts.length)];

  /* ---------------------------
     CSV import/export & PDF
     --------------------------- */
  const csvFileRef = useRef<HTMLInputElement | null>(null);
  const onImportCSVClick = () => csvFileRef.current?.click();

  const parseCSV = (text: string): Trade[] => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0]!.split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
      const trade: Trade = {
        symbol: obj.Symbol ?? obj.symbol,
        openTime: obj.Date ?? obj.openTime,
        outcome: obj.Outcome ?? obj.outcome,
        pnl: obj.PnL ?? obj.pnl,
        strategy: obj.Strategy ?? obj.strategy,
        SL: obj.SL ?? undefined,
        TP: obj.TP ?? undefined,
        note: obj.Note ?? obj.note,
        tags: obj.Tags ? String(obj.Tags).split("|").map((s:string)=>s.trim()) : undefined
      };
      return trade;
    });
    return rows;
  };

  const onImportCSV = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0]!;
    const text = await f.text();
    const parsed = parseCSV(text);
    if (!parsed.length) { alert("No rows found."); return; }
    setImportPreview(parsed);
    // best-effort import using updateTrade fallback
    const fn = updateTrade as unknown as (...args: any[]) => Promise<any>;
    if (fn) {
      for (const r of parsed) {
        try {
          try { await fn(r); } catch { await fn(getTradeId(r), r); }
        } catch (err) { console.warn("import failed", err); }
      }
      try { await (refreshTrades as any)?.(); } catch {}
      setImportPreview(null);
      alert("Import attempted.");
    } else {
      alert("Preview generated. No programmatic import available.");
    }
  };

  const onExportCSV = () => {
    const rows = sorted.map((t) => ({
      Date: fmtDateTime(t.openTime),
      Symbol: t.symbol ?? "",
      Outcome: t.outcome ?? "",
      PnL: parsePL(t.pnl).toFixed(2),
      Strategy: t.strategy ?? "",
      SL: t.SL ?? "",
      TP: t.TP ?? "",
      Note: t.note ?? "",
      Tags: Array.isArray(t.tags) ? t.tags.join("|") : "",
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trades.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Trade Journal", 14, 16);
    const head = [["Date", "Symbol", "Outcome", "PnL", "Strategy", "SL", "TP", "Tags", "Note"]];
    const body = sorted.map((t) => [
      fmtDateTime(t.openTime),
      t.symbol ?? "",
      (t.outcome ?? "").toUpperCase(),
      `$${parsePL(t.pnl).toFixed(2)}`,
      t.strategy ?? "",
      String(t.SL ?? ""),
      String(t.TP ?? ""),
      Array.isArray(t.tags) ? t.tags.join(", ") : "",
      t.note ?? "",
    ]);
    (doc as any).autoTable({
      head,
      body,
      startY: 22,
      styles: { fontSize: 8, cellWidth: "wrap" },
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save("trade-journal.pdf");
  };

  /* ---------------------------
     Row component
     --------------------------- */
  function Row({ t }: { t: Trade }) {
    const id = getTradeId(t);
    const patch = rowEdits[id] || {};
    const pending = !!savingMap[id];

    const fileRef = useRef<HTMLInputElement | null>(null);
    const tags: string[] = Array.isArray(t.tags) ? t.tags : [];
    const mergedTags = Array.from(new Set([...(tags || []), ...((patch.tags as string[]) || [])])).filter(Boolean);

    const addTag = () => {
      const tag = prompt("Add tag:");
      if (!tag) return;
      setRowEdits(prev => ({...prev, [id]: { ...(prev[id]||{}), tags: [...mergedTags, tag] }}));
    };

    const removeTag = (tg: string) => {
      setRowEdits(prev => ({...prev, [id]: { ...(prev[id]||{}), tags: mergedTags.filter(x=>x!==tg) }}));
    };

    const togglePin = () => {
      const next = !pinnedMap[id];
      setPinnedMap(s=> ({...s, [id]: next}));
      try { (updateTrade as any)?.(id, { ...(t as any), pinned: next }); } catch {}
    };

    const applySuggestedTags = () => {
      const sug = suggestedTagsMap[id] ?? [];
      if (!sug.length) { alert("No suggestions"); return; }
      setRowEdits(prev => ({...prev, [id]: { ...(prev[id]||{}), tags: Array.from(new Set([...(t.tags ?? []), ...sug])) }}));
      alert(`Applied ${sug.length} suggested tags`);
    };

    const quickReview = () => {
      const checklist = [
        "Entry matched plan",
        "SL placed",
        "Emotion checked",
        "Size OK",
        "Exit planned"
      ];
      const ok = confirm(`Quick checklist:\n- ${checklist.join("\n- ")}\n\nMark as reviewed?`);
      if (!ok) return;
      setRowEdits(prev => ({...prev, [id]: { ...(prev[id]||{}), reviewed: true }}));
      onSaveRow({ ...(t as any), reviewed: true });
    };

    const toggleSelect = () => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

    return (
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr,1fr,1fr,1.3fr,1fr,auto] gap-3 items-center border-b border-zinc-800 py-3">
        <div className="text-xs md:text-sm text-zinc-300">{fmtDateTime(t.openTime)}</div>

        <div className="text-sm">
          {editMode ? (
            <input className="w-full rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-sm"
              defaultValue={String(patch.symbol ?? t.symbol ?? "")}
              onChange={(e)=> setRowEdits(prev=> ({...prev, [id]: {...(prev[id]||{}), symbol: e.target.value}}))}
            />
          ) : <span className="font-medium">{t.symbol ?? "—"}</span>}
        </div>

        <div>
          {editMode ? (
            <select className="w-full rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-sm"
              defaultValue={String(patch.outcome ?? t.outcome ?? "").toLowerCase()}
              onChange={(e)=> setRowEdits(prev=> ({...prev, [id]: {...(prev[id]||{}), outcome: e.target.value}}))}
            >
              <option value="">—</option>
              <option value="win">WIN</option>
              <option value="loss">LOSS</option>
              <option value="breakeven">BREAKEVEN</option>
            </select>
          ) : (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ (t.outcome ?? "").toLowerCase() === "win" ? "bg-green-600/20 text-green-400" : (t.outcome ?? "").toLowerCase() === "loss" ? "bg-red-600/20 text-red-400" : "bg-yellow-600/20 text-yellow-300"}`}>
              {(t.outcome ?? "—").toString().toUpperCase()}
            </span>
          )}
        </div>

        <div className="text-sm">
          {editMode ? (
            <input type="number" step="0.01" className="w-full rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-sm"
              defaultValue={String(patch.pnl ?? t.pnl ?? 0)}
              onChange={(e)=> setRowEdits(prev=> ({...prev, [id]: {...(prev[id]||{}), pnl: e.target.value as any}}))}
            />
          ) : (
            <span className={`${parsePL(t.pnl) >= 0 ? "text-green-400" : "text-red-400"} font-semibold`}>${parsePL(t.pnl).toFixed(2)}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {editMode ? (
              <input placeholder="Strategy" className="rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-sm w-44"
                defaultValue={String(patch.strategy ?? t.strategy ?? "")}
                onChange={(e)=> setRowEdits(prev=> ({...prev, [id]: {...(prev[id]||{}), strategy: e.target.value}}))}
              />
            ) : (
              <span className="text-xs text-zinc-300">{t.strategy ?? <span className="text-zinc-500">—</span>}</span>
            )}

            <div className="flex flex-wrap gap-1">
              {mergedTags.length ? mergedTags.map(tg => (
                <span key={tg} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 text-[11px] border border-zinc-700">
                  <TagIcon className="h-3 w-3 opacity-70" />
                  {tg}
                  {editMode && <button className="opacity-60 hover:opacity-100" onClick={()=> removeTag(tg)} title="Remove tag"><X className="h-3 w-3" /></button>}
                </span>
              )) : <span className="text-xs text-zinc-500">No tags</span>}
              {suggestedTagsMap[id]?.length ? <button onClick={applySuggestedTags} className="text-xs text-zinc-300 ml-2 underline">Apply suggested ({suggestedTagsMap[id].length})</button> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <input placeholder="SL" className="rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-xs w-20"
                  defaultValue={String(patch.SL ?? t.SL ?? "")}
                  onChange={(e)=> setRowEdits(prev=> ({...prev, [id]: {...(prev[id]||{}), SL: e.target.value}}))}
                />
                <input placeholder="TP" className="rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-xs w-20"
                  defaultValue={String(patch.TP ?? t.TP ?? "")}
                  onChange={(e)=> setRowEdits(prev=> ({...prev, [id]: {...(prev[id]||{}), TP: e.target.value}}))}
                />
              </>
            ) : (
              <div className="text-xs text-zinc-400">{t.SL ? `SL:${t.SL}` : "SL:—"} • {t.TP ? `TP:${t.TP}` : "TP:—"}</div>
            )}
          </div>
        </div>

        <div className="text-xs">
          {editMode ? <input className="w-full rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-sm" placeholder="Add note" defaultValue={String(patch.note ?? t.note ?? "")} onChange={(e)=> setRowEdits(prev=> ({...prev, [id]: {...(prev[id]||{}), note: e.target.value}}))} /> : <p className="text-xs text-zinc-300 whitespace-pre-wrap">{t.note || <span className="text-zinc-500">—</span>}</p>}
        </div>

        <div className="flex items-center justify-end gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=> { if (e.target.files) setAttachments(prev => ({...prev, [id]: [...(prev[id]||[]), ...Array.from(e.target.files!)] })); }} multiple />
          <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-300 hover:text-white" onClick={()=> fileRef.current?.click()} title="Attach image"><ImageIcon className="h-4 w-4" /></Button>
          {attachments[id]?.length ? <span className="text-[10px] text-zinc-400">{attachments[id]!.length} file(s)</span> : null}

          <Button variant="ghost" className={`h-8 w-8 p-0 ${pinnedMap[id] || (t as any).pinned ? "text-yellow-400" : "text-zinc-300"} hover:text-white`} onClick={togglePin} title={pinnedMap[id] || (t as any).pinned ? "Unpin" : "Pin trade"}><Star className="h-4 w-4" /></Button>

          <Button variant="ghost" className="h-8 w-8 p-0 text-emerald-300 hover:text-emerald-200" onClick={quickReview} title="Quick review"><Check className="h-4 w-4" /></Button>

          <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-300" onClick={toggleSelect} title="Select for bulk"><Sliders className={`h-4 w-4 ${selected[id] ? "text-indigo-400" : "text-zinc-300"}`} /></Button>

          {editMode ? <Button variant="secondary" className="h-8 px-2 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={()=> onSaveRow(t)} disabled={pending || !rowEdits[id]} title="Save"><Save className="h-4 w-4" /></Button> : null}

          <Button variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" onClick={()=> onDelete(t)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  /* ---------------------------
     Row save, delete & bulk helpers
     --------------------------- */
  const setEdit = (id: string, patch: Partial<Trade>) => setRowEdits(prev => ({...prev, [id]: {...(prev[id]||{}), ...patch}}));

  const onSaveRow = async (base: Trade) => {
    const id = getTradeId(base);
    const patch = rowEdits[id] || {};
    if (!Object.keys(patch).length) return;
    setSavingMap(m => ({...m, [id]: true}));
    try {
      const payload = { ...base, ...patch };
      const fn = updateTrade as unknown as (...args:any[])=>Promise<any>;
      if (fn) {
        try { await fn(id, payload); } catch { await fn(payload); }
      }
      setRowEdits(prev => { const { [id]: _, ...rest } = prev; return rest; });
    } catch (e: any) {
      console.error(e); alert(`Save failed: ${e?.message ?? e}`);
    } finally {
      setSavingMap(m => ({...m, [id]: false}));
    }
  };

  const onSaveAll = async () => {
    const ids = Object.keys(rowEdits);
    if (!ids.length) return;
    for (const id of ids) {
      const base = trades.find((t: any) => getTradeId(t) === id);
      if (!base) continue;
      // eslint-disable-next-line no-await-in-loop
      await onSaveRow(base);
    }
  };

  const onDelete = async (t: Trade) => {
    const id = getTradeId(t);
    if (!id) return;
    const timeoutId = window.setTimeout(async () => {
      try { await (deleteTrade as any)?.(id); } catch (err) { console.error("final delete failed:", err); }
      finally { setPendingDeletes(p => p.filter(q => q.id !== id)); setUndoVisible(false); }
    }, 7000);
    setPendingDeletes(p => [...p, { id, trade: t, timeoutId }]);
    setUndoVisible(true);
  };

  const undoDelete = (id?: string) => {
    if (!id) {
      const last = pendingDeletes[pendingDeletes.length - 1];
      if (!last) return;
      clearTimeout(last.timeoutId);
      setPendingDeletes(p => p.slice(0, -1));
    } else {
      const found = pendingDeletes.find(q => q.id === id);
      if (!found) return;
      clearTimeout(found.timeoutId);
      setPendingDeletes(p => p.filter(x => x.id !== id));
    }
    if (pendingDeletes.length <= 1) setUndoVisible(false);
  };

  /* ---------------------------
     Small helpers
     --------------------------- */
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of trades as Trade[]) if (Array.isArray(t.tags)) t.tags.forEach(x => x && set.add(x));
    return Array.from(set).sort();
  }, [trades]);

  // suggested tags based on note heuristics
  useEffect(() => {
    const map: Record<string, string[]> = {};
    for (const t of trades as Trade[]) {
      const id = getTradeId(t);
      const note = String(t.note ?? "").toLowerCase();
      const found: string[] = [];
      const look = ["breakout","reversal","scalp","swing","earnings","momentum","gap","trend","rejection","stop","overbought","oversold"];
      for (const k of look) if (note.includes(k)) found.push(k);
      if (found.length) map[id] = found;
    }
    setSuggestedTagsMap(map);
  }, [trades]);

  const copyInsightsMarkdown = async () => {
    const md = computedInsights.map(i => `### ${i.title}\n\n${i.detail}\n\nScore: ${i.score}\n\n---\n`).join("\n");
    try { await navigator.clipboard.writeText(md); alert("Insights copied to clipboard as markdown."); } catch { alert("Failed to copy."); }
  };

  /* ---------------------------
     Calendar helpers
     --------------------------- */
  const monthDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const daySummary = (d: Date) => {
    const key = format(d, "yyyy-MM-dd");
    return patterns.calMap[key] ?? { trades: 0, net: 0 };
  };

  /* ---------------------------
     UI render
     --------------------------- */
  const Toolbar = (
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative">
          <Filter className="absolute left-2 top-2.5 h-4 w-4 opacity-70" />
          <select className="pl-8 pr-3 py-2 rounded-md bg-zinc-800 text-white border border-zinc-700 text-sm" value={filter} onChange={(e)=> setFilter(e.target.value as any)}>
            <option value="all">All</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="breakeven">Breakevens</option>
          </select>
        </div>

        <div className="relative">
          <select className="pl-3 pr-3 py-2 rounded-md bg-zinc-800 text-white border border-zinc-700 text-sm" value={tagFilter ?? ""} onChange={(e)=> setTagFilter(e.target.value || null)} title="Filter by tag">
            <option value="">All tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 opacity-70" />
          <input className="w-full pl-8 pr-3 py-2 rounded-md bg-zinc-800 text-white border border-zinc-700 text-sm" placeholder="Search symbol, tag, note, strategy" value={search} onChange={(e)=> setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Account" className="w-28 rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-sm" value={accountBalance === "" ? "" : String(accountBalance)} onChange={(e)=> setAccountBalance(e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" placeholder="% risk" className="w-20 rounded-md bg-zinc-800 text-white border border-zinc-700 px-2 py-1 text-sm" value={String(riskPercent)} onChange={(e)=> setRiskPercent(Number(e.target.value))} />
        </div>

        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={async ()=> { try { await (refreshTrades as any)?.(); alert("Trades refreshed."); } catch (e:any){ alert("Refresh failed: " + (e?.message ?? e)); }}} title="Refresh trades"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>

        <Button variant="secondary" className={`${editMode ? "bg-amber-600 hover:bg-amber-500" : "bg-zinc-800 hover:bg-zinc-700"} text-white`} onClick={()=> { setEditMode(s=>!s); setRowEdits({}); }} title={editMode ? "Exit edit mode" : "Enter edit mode"}>{ editMode ? <X className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" /> }{ editMode ? "Done" : "Edit" }</Button>

        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={onSaveAll} disabled={!Object.keys(rowEdits).length}><Save className="h-4 w-4 mr-2" />Save All</Button>

        <input ref={csvFileRef} type="file" accept=".csv" className="hidden" onChange={(e) => onImportCSV(e.target.files)} />
        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={onImportCSVClick}><Upload className="h-4 w-4 mr-2" />Import</Button>

        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={onExportCSV}><FileText className="h-4 w-4 mr-2" />CSV</Button>

        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={onExportPDF}><Download className="h-4 w-4 mr-2" />PDF</Button>

        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={()=> setPinnedOnly(s=>!s)}><Star className="h-4 w-4 mr-2" />{pinnedOnly ? "Pinned only" : "Pins"}</Button>

        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={copyInsightsMarkdown}><Clipboard className="h-4 w-4 mr-2" />Copy Insights</Button>
      </div>
    </div>
  );

  /* ---------------------------
     Main JSX
     --------------------------- */
  return (
    <div className="space-y-4">
      {/* Summary top card */}
      <Card className="rounded-2xl shadow-md border bg-white dark:bg-gray-900 dark:border-gray-800 transition duration-300">
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4 text-center text-sm">
          {[
            ["Total Trades", summary.total],
            ["Wins", summary.win, "text-green-500"],
            ["Losses", summary.loss, "text-red-500"],
            ["Breakevens", summary.breakeven, "text-yellow-500"],
            ["Net P/L", `$${summary.netPL.toFixed(2)}`, summary.netPL >= 0 ? "text-green-500" : "text-red-500"],
            ["Avg P/L", `$${summary.avgPL.toFixed(2)}`, summary.avgPL >= 0 ? "text-green-500" : "text-red-500"],
            ["Win Rate", `${summary.winRate.toFixed(1)}%`, "text-indigo-500"],
            ["Consistency", `${summary.consistency.toFixed(1)}%`, "text-blue-500"],
            ["Expectancy", `${summary.expectancy.toFixed(2)}`, summary.expectancy >= 0 ? "text-green-500" : "text-red-500"],
          ].map(([lbl, val, clr], i) => (
            <div key={i}>
              <p className="text-muted-foreground">{lbl}</p>
              <p className={`font-bold ${clr || ""}`}>{val}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Undo banner */}
      {undoVisible && pendingDeletes.length > 0 && (
        <div className="bg-yellow-900/40 border border-yellow-800 text-yellow-100 p-3 rounded flex items-center justify-between">
          <div>
            Pending deletion of {pendingDeletes.length} trade{pendingDeletes.length > 1 ? "s" : ""}.{" "}
            <span className="italic">You have 7s to undo.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="bg-yellow-700 text-black" onClick={() => undoDelete()}>Undo last</Button>
            <Button variant="ghost" className="bg-transparent text-yellow-200" onClick={() => { pendingDeletes.forEach(p=> clearTimeout(p.timeoutId)); setPendingDeletes([]); setUndoVisible(false); }}>Cancel All</Button>
          </div>
        </div>
      )}

      {/* Top toolbar */}
      {Toolbar}

      {/* Subtabs */}
      <Tabs
        items={[
          { value: "journal", label: "Journal" },
          { value: "insights", label: "Insights" },
          { value: "patterns", label: "Patterns" },
          { value: "psychology", label: "Psychology" },
          { value: "calendar", label: "Calendar" },
          { value: "forecast", label: "Forecast" },
          { value: "optimizer", label: "Optimizer" },
          { value: "prop", label: "Prop-Firm" },
        ]}
        activeTab={subTab}
        setActiveTab={(v)=> setSubTab(v as SubTab)}
      />

      {/* Journal */}
      {subTab === "journal" && (
        <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-2 text-xs text-zinc-400">Showing {sorted.length} trade{sorted.length === 1 ? "" : "s"} {selectedDay ? `• filtered ${format(selectedDay, "dd MMM yyyy")}` : ""}</div>
            <div className="px-4 pb-2 text-[11px] text-zinc-500">Tip: Use strategy tags, SL/TP optimizer, bulk actions and the quick review checklist to speed up journaling.</div>

            <div className="px-4">
              <div className="hidden md:grid md:grid-cols-[1.3fr,1fr,1fr,1.3fr,1fr,auto] gap-3 text-zinc-400 text-xs border-b border-zinc-800 py-2">
                <div>Date</div>
                <div>Symbol</div>
                <div>Outcome</div>
                <div>Strategy / Tags</div>
                <div>Note</div>
                <div className="text-right">Actions</div>
              </div>

              <div className="divide-y divide-zinc-800">
                {sorted.length ? sorted.map(t => <Row key={getTradeId(t)} t={t as Trade} />) : <div className="py-10 text-center text-zinc-400">No trades found.</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {subTab === "insights" && (
        <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200">
              <BarChart2 className="h-5 w-5" />
              <h3 className="font-semibold">AI & Heuristic Insights</h3>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" className="text-zinc-300" onClick={copyInsightsMarkdown}><Clipboard className="h-4 w-4 mr-2" /> Copy MD</Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {computedInsights.map(ins => (
                <div key={ins.id} className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50 flex flex-col gap-2">
                  <div className="text-sm font-semibold text-white">{ins.title}</div>
                  <p className="text-xs text-zinc-300">{ins.detail}</p>
                  <div className="h-2 w-full bg-zinc-800 rounded">
                    <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, ins.score ?? 0))}%` }} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(`${ins.title} — ${ins.detail}`); }}>Copy</Button>
                    <Button variant="secondary" onClick={() => setPinnedTips(p => p.includes(ins.detail) ? p : [ins.detail, ...p])}>Pin</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patterns */}
      {subTab === "patterns" && (
        <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
          <CardContent className="p-5 space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Top Symbols</h4>
                <div className="space-y-2">
                  {patterns.topSymbols.length ? patterns.topSymbols.map(s => (
                    <div key={s.symbol} className="flex items-center justify-between rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm">
                      <span className="font-medium">{s.symbol}</span>
                      <span className="text-xs text-zinc-300">{s.trades} trades • {s.winRate.toFixed(0)}% WR • <span className={s.netPL >= 0 ? "text-green-400" : "text-red-400"}>${s.netPL.toFixed(2)}</span></span>
                    </div>
                  )) : <p className="text-zinc-400 text-sm">No data</p>}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2">By Day of Week</h4>
                <div className="space-y-2">
                  {Object.entries(patterns.byDOW || {}).map(([dow,s]) => (
                    <div key={dow} className="flex items-center justify-between rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm">
                      <span className="font-medium">{dow}</span>
                      <span className={s.pl >= 0 ? "text-green-400" : "text-red-400"}>${s.pl.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Session Performance (UTC)</h4>
                <div className="space-y-2">
                  {Object.entries(patterns.sessions || {}).map(([name,s]) => (
                    <div key={name} className="flex items-center justify-between rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm capitalize">
                      <span className="font-medium">{name}</span>
                      <span className="text-xs text-zinc-300">{s.count} trades • <span className={s.pl >= 0 ? "text-green-400" : "text-red-400"}>${s.pl.toFixed(2)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Hourly Performance (UTC)</h4>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {patterns.hours.map((h, idx) => {
                  const bg = h.pl >= 0 ? `bg-emerald-600/15` : `bg-red-600/15`;
                  return (
                    <div key={idx} className={`p-2 rounded border border-zinc-800 text-xs text-zinc-200 ${bg}`}>
                      <div className="font-semibold">{idx}:00</div>
                      <div className="text-[11px] text-zinc-300">{h.trades} trades</div>
                      <div className={`${h.pl >= 0 ? "text-green-400" : "text-red-400"} text-sm`}>${h.pl.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-zinc-900/40 rounded p-4 border border-zinc-800">
                <h5 className="text-sm text-zinc-200 mb-2">Equity Curve</h5>
                {mounted ? <Line data={charts.pnp} /> : <div className="h-48" />}
              </div>

              <div className="bg-zinc-900/40 rounded p-4 border border-zinc-800">
                <h5 className="text-sm text-zinc-200 mb-2">Rolling Win Rate</h5>
                {mounted ? <Line data={charts.rollingWinData} /> : <div className="h-48" />}
              </div>
            </div>

            <div className="bg-zinc-900/40 rounded p-4 border border-zinc-800">
              <h5 className="text-sm text-zinc-200 mb-2">PnL Distribution</h5>
              {mounted ? <Bar data={charts.pnlHistogram} /> : <div className="h-48" />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast */}
      {subTab === "forecast" && (
        <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200">
              <ArrowUpRight className="h-5 w-5" />
              <h3 className="font-semibold">Forecast & Pattern Prediction (Heuristic)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* heuristic forecast */}
              <HeuristicForecast trades={trades as Trade[]} summary={summary} />
              <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
                <h5 className="text-sm text-zinc-300">Actionable suggestion</h5>
                <p className="mt-2 text-white">Combine the probability shown with your plan — do not rely only on this. This is not financial advice.</p>
                <div className="mt-4 text-xs text-zinc-400">For a production-grade forecast, integrate a trained model server-side and surface calibrated probabilities here.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimizer */}
      {subTab === "optimizer" && (
        <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200"><Target className="h-5 w-5" /><h3 className="font-semibold">SL/TP Optimization</h3></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
                <div className="text-sm text-zinc-300">Global suggested RR</div>
                <div className="text-2xl text-white my-2">{sltpSuggestion ? `${sltpSuggestion.recommendedRR}R` : "—"}</div>
                <div className="text-xs text-zinc-400">{sltpSuggestion?.note}</div>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={()=> applySltpToSelected(sltpSuggestion?.recommendedRR ?? 1)}>Apply to selected</Button>
                  <Button variant="ghost" onClick={()=> alert("Heuristic: uses average wins/losses. Use backtests or model-based optimizer for production.")}>Explain</Button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
                <div className="text-sm text-zinc-300">Per-strategy suggestions</div>
                <div className="mt-2 space-y-2">
                  {Object.entries(patterns.stratMap || {}).map(([name,s]) => {
                    const recommended = Math.max(1, Math.round(((s.netPL / Math.max(1, s.trades || 1)) / (Math.abs(summary.avgLoss) || 1)) * 10) / 10 || 1);
                    return (
                      <div key={name} className="rounded p-2 bg-zinc-900/40 border border-zinc-800 flex justify-between items-center text-sm">
                        <div>
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-zinc-400">{s.trades} trades • WR: {s.trades ? ((s.wins/s.trades)*100).toFixed(1) : "0"}%</div>
                        </div>
                        <div className="flex gap-2">
                          <div className="text-xs text-zinc-200">Suggest {recommended}R</div>
                          <Button variant="ghost" onClick={()=> applySltpToSelected(recommended)}>Apply</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prop-Firm */}
      {subTab === "prop" && (
        <PropTracker trades={trades as Trade[]} />
      )}

      {/* Psychology */}
      {subTab === "psychology" && (
        <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2"><Activity className="h-5 w-5" /><h3 className="font-semibold">Psychology & Behavior</h3></div>

            <div className="flex flex-wrap gap-2">
              {moods.map(m => <button key={m} className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs text-zinc-200" onClick={()=> addMoodStamp(m)}>{m}</button>)}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <textarea className="w-full min-h-[180px] rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 p-3 text-sm" placeholder="Free-write journaling..." value={psychNote} onChange={(e)=> setPsychNote(e.target.value)} />
                <div className="flex gap-2 justify-end mt-2">
                  <Button variant="secondary" onClick={()=> setPsychNote("")}><X className="h-4 w-4 mr-2" />Clear</Button>
                  <Button variant="secondary" onClick={()=> { alert("Saved locally."); }}><Save className="h-4 w-4 mr-2" />Save</Button>
                </div>
              </div>

              <div>
                <div className="bg-zinc-900/40 rounded p-3 border border-zinc-800">
                  <h5 className="text-sm text-zinc-300">Behavioral Insights</h5>
                  <div className="mt-2 text-xs text-zinc-400">Max win streak: {streaks.maxWinStreak} • Max loss streak: {streaks.maxLossStreak}</div>
                  <div className="mt-2 text-xs text-zinc-400">Avg trade time: {summary.avgLengthMin.toFixed(1)} min • Sharpe-like: {summary.sharpe.toFixed(2)}</div>
                  {revengeDetector.flagged ? <div className="mt-3 p-2 bg-red-900/30 rounded text-xs text-red-300">⚠️ {revengeDetector.reason}</div> : null}
                </div>

                <div className="mt-4 bg-zinc-900/40 rounded p-3 border border-zinc-800">
                  <h5 className="text-sm text-zinc-300">Guided Prompts</h5>
                  <div className="mt-2 text-xs text-zinc-200">{randomPrompt()}</div>
                  <div className="mt-3"><Button variant="secondary" onClick={()=> setPsychNote(prev => prev + "\n\n" + randomPrompt())}>Add prompt to note</Button></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      {subTab === "calendar" && (
        <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3"><CalendarIcon /><h3 className="font-semibold">Calendar & Timeline</h3>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" onClick={()=> setCalendarMonth(m => subMonths(m,1))}>Prev</Button>
                <div className="text-sm text-zinc-300">{format(calendarMonth,"MMMM yyyy")}</div>
                <Button variant="ghost" onClick={()=> setCalendarMonth(m => addMonths(m,1))}>Next</Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthDays.map(d => {
                const ds = daySummary(d);
                const net = ds.net;
                const bg = net > 0 ? "bg-emerald-600/15" : net < 0 ? "bg-red-600/15" : "bg-zinc-800/10";
                return (
                  <button key={d.toISOString()} onClick={() => { setSelectedDay(prev => prev && isSameDay(prev,d) ? null : d); setSubTab("journal"); }} className={`p-3 rounded border ${isSameDay(d, selectedDay ?? new Date(0)) ? "border-green-500" : "border-zinc-800"} ${bg} text-left`} title={`${ds.trades} trade(s) • ${net >= 0 ? "+" : ""}${net.toFixed(2)} USD`}>
                    <div className="text-xs text-zinc-300">{format(d,"dd")}</div>
                    <div className="text-[11px] text-zinc-200">{ds.trades} trades</div>
                    <div className={`text-[11px] ${net>=0 ? "text-green-400" : "text-red-400"}`}>${net.toFixed(0)}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-zinc-400">Click a day to filter Journal. Use calendar to spot streaks, cluster risk events and outlier days.</div>
          </CardContent>
        </Card>
      )}

      {/* Import preview */}
      {importPreview && (
        <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-zinc-200">Import preview ({importPreview.length} rows)</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={()=> setImportPreview(null)}>Close</Button>
              </div>
            </div>
            <div className="max-h-64 overflow-auto text-sm">
              <table className="w-full text-left">
                <thead className="text-xs text-zinc-400"><tr><th>Date</th><th>Symbol</th><th>Outcome</th><th>PnL</th><th>Tags</th></tr></thead>
                <tbody>
                  {importPreview.map((r,i)=> (<tr key={i} className="border-t border-zinc-800"><td className="py-1">{fmtDateTime(r.openTime)}</td><td className="py-1">{r.symbol}</td><td className="py-1">{r.outcome}</td><td className="py-1">${parsePL(r.pnl).toFixed(2)}</td><td className="py-1">{Array.isArray(r.tags)? r.tags.join(", ") : ""}</td></tr>))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Small subcomponents used above
---------------------------------------------------------------------------*/

function HeuristicForecast({ trades, summary }: { trades: Trade[]; summary: any }) {
  // A simple heuristic forecast widget
  const N = 12;
  const recent = trades.slice(-N);
  const wins = recent.filter((t)=> (t.outcome ?? "").toLowerCase() === "win").length;
  const recentWinRate = recent.length ? wins / recent.length : summary.winRate / 100;
  // streak
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const o = (trades[i]?.outcome ?? "").toLowerCase();
    if (o === "win") { if (streak >= 0) streak++; else break; }
    else if (o === "loss") { if (streak <= 0) streak--; else break; }
    else break;
  }
  const streakFactor = Math.tanh(streak / 5);
  const expectancyNorm = summary.expectancy / (Math.abs(summary.avgWin) + Math.abs(summary.avgLoss) + 1);
  const score = 2.0 * recentWinRate + 1.2 * streakFactor + 1.5 * (expectancyNorm || 0);
  const p = Math.round(sigmoid(score - 1.5) * 100);

  return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
      <div className="text-sm text-zinc-300">Probability next trade will be a WIN</div>
      <div className="text-3xl font-semibold text-white my-3">{p}%</div>
      <div className="text-xs text-zinc-400">Recent WR {(recentWinRate*100).toFixed(1)}% • streak {streak} • expectancy {summary.expectancy.toFixed(2)}</div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={()=> navigator.clipboard.writeText(`${p}% — Recent WR ${(recentWinRate*100).toFixed(1)}%`) }>Copy</Button>
        <Button variant="ghost" onClick={()=> alert("Heuristic forecast: uses recent WR, streak, and expectancy. Replace with a trained model for production.")}>Why this?</Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Prop tracker subcomponent
---------------------------------------------------------------------------*/

function PropTracker({ trades }: { trades: Trade[] }) {
  const [propInitial, setPropInitial] = useState<number | "">(100000);
  const [propTargetPercent, setPropTargetPercent] = useState<number>(10);
  const [propMaxDrawdownPercent, setPropMaxDrawdownPercent] = useState<number>(5);
  const [propMinWinRate, setPropMinWinRate] = useState<number>(50);

  const propStatus = useMemo(() => {
    const initial = typeof propInitial === "number" && propInitial > 0 ? propInitial : 100000;
    const pnl = trades.reduce((s,t)=> s + parsePL(t.pnl), 0);
    const current = initial + pnl;
    const pctGain = ((current - initial) / initial) * 100;
    let peak = initial;
    let maxDD = 0;
    let equity = initial;
    const sortedChron = [...trades].sort((a,b)=> new Date(a.openTime as any).getTime() - new Date(b.openTime as any).getTime());
    for (const t of sortedChron) {
      equity += parsePL(t.pnl);
      if (equity > peak) peak = equity;
      const dd = ((peak - equity) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
    const winCount = trades.filter(t => (t.outcome ?? "").toLowerCase() === "win").length;
    const total = trades.length;
    const winRate = total ? (winCount / total) * 100 : 0;
    const passedTarget = pctGain >= propTargetPercent;
    const passedDD = maxDD <= propMaxDrawdownPercent;
    const passedWinRate = winRate >= propMinWinRate;
    return { initial, pnl, current, pctGain, maxDD, winRate, passedTarget, passedDD, passedWinRate, milestones: [propTargetPercent, propTargetPercent*2, propTargetPercent*3].map(m=>({ percent: m, achieved: pctGain >= m })) };
  }, [trades, propInitial, propTargetPercent, propMaxDrawdownPercent, propMinWinRate]);

  return (
    <Card className="rounded-2xl shadow-md border bg-white dark:bg-[#0b1220] dark:border-[#202830]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Flag className="h-5 w-5" /><h3 className="font-semibold">Prop-Firm & Milestone Tracker</h3></div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
            <div className="text-xs text-zinc-400">Initial funded account</div>
            <input type="number" placeholder="Initial capital" className="w-full mt-2 p-2 rounded bg-zinc-800" value={propInitial === "" ? "" : String(propInitial)} onChange={(e)=> setPropInitial(e.target.value === "" ? "" : Number(e.target.value))} />
            <div className="flex gap-2 mt-3">
              <input type="number" placeholder="Target %" className="w-1/2 p-2 rounded bg-zinc-800" value={String(propTargetPercent)} onChange={(e)=> setPropTargetPercent(Number(e.target.value))} />
              <input type="number" placeholder="Max DD %" className="w-1/2 p-2 rounded bg-zinc-800" value={String(propMaxDrawdownPercent)} onChange={(e)=> setPropMaxDrawdownPercent(Number(e.target.value))} />
            </div>
            <div className="flex gap-2 mt-3">
              <input type="number" placeholder="Min WR %" className="w-1/2 p-2 rounded bg-zinc-800" value={String(propMinWinRate)} onChange={(e)=> setPropMinWinRate(Number(e.target.value))} />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
            <div className="text-sm text-zinc-300">Progress</div>
            <div className="text-2xl text-white my-2">{propStatus.pctGain.toFixed(2)}%</div>
            <div className="text-xs text-zinc-400">Net P/L: ${propStatus.pnl.toFixed(2)} • Current equity: ${propStatus.current.toFixed(2)}</div>
            <div className="mt-3 text-xs text-zinc-300 mb-2">Max Drawdown: {propStatus.maxDD.toFixed(2)}% (limit {propMaxDrawdownPercent}%)</div>
            <div className="w-full bg-zinc-800 rounded h-3 overflow-hidden">
              <div style={{ width: `${Math.min(100, Math.max(0, propStatus.maxDD))}%` }} className={`h-3 ${propStatus.maxDD <= propMaxDrawdownPercent ? "bg-green-500" : "bg-red-500"}`} />
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-xs text-zinc-300">Win Rate: {propStatus.winRate.toFixed(1)}% • Required: {propMinWinRate}%</div>
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" onClick={()=> { const status = []; if (propStatus.passedTarget) status.push("Target ✓"); if (propStatus.passedDD) status.push("Drawdown ✓"); if (propStatus.passedWinRate) status.push("WinRate ✓"); alert(`Prop check:\n${status.length ? status.join("\n") : "Not passing yet."}`); }}>Check</Button>
                <Button variant="ghost" onClick={()=> alert("This tracker is heuristic. Use official prop-firm rules for compliance.")}>Explain</Button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Milestones</h4>
          <div className="flex gap-2">
            {propStatus.milestones.map(m => <div key={m.percent} className={`p-3 rounded-md ${m.achieved ? "bg-green-800" : "bg-zinc-900/30"} border border-zinc-800 text-sm`}>{m.percent}% • {m.achieved ? "Achieved" : "Pending"}</div>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}