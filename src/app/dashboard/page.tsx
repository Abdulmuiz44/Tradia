"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Tabs } from "@/components/ui/tabs";
import OverviewCards from "@/components/dashboard/OverviewCards";
import TradeHistoryTable from "@/components/dashboard/TradeHistoryTable";
import RiskMetrics from "@/components/dashboard/RiskMetrics";
import PositionSizing from "@/components/dashboard/PositionSizing";
import TraderEducation from "@/components/dashboard/TraderEducation";
import TradeJournal from "@/components/dashboard/TradeJournal";
import Spinner from "@/components/ui/spinner";
import LayoutClient from "@/components/LayoutClient";
import ClientOnly from "@/components/ClientOnly";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import { Menu, X, RefreshCw, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/LayoutClient";
import { TradePlanProvider } from "@/context/TradePlanContext";
import TradePlannerTable from "@/components/dashboard/TradePlannerTable";
import PricingPlans from "@/components/payment/PricingPlans";

// Lazy-loaded charts
const ProfitLossChart = dynamic(() => import("@/components/charts/ProfitLossChart"), { ssr: false });
const PerformanceTimeline = dynamic(() => import("@/components/charts/PerformanceTimeline"), { ssr: false });
const TradeBehavioralChart = dynamic(() => import("@/components/charts/TradeBehavioralChart"), { ssr: false });
const DrawdownChart = dynamic(() => import("@/components/charts/DrawdownChart"), { ssr: false });
const TradePatternChart = dynamic(() => import("@/components/charts/TradePatternChart"), { ssr: false });

// Tabs
const TAB_DEFS = [
  { value: "overview", label: "Overview" },
  { value: "history", label: "Trade History" },
  { value: "journal", label: "Trade Journal" },
  { value: "insights", label: "AI Insights" },
  { value: "analytics", label: "Trade Analytics" },
  { value: "risk", label: "Risk Metrics" },
  { value: "planner", label: "Trade Planner" },
  { value: "position-sizing", label: "Position Sizing" },
  { value: "education", label: "Trade Education" },
  { value: "upgrade", label: "Upgrade" },
];

/**
 * NOTE:
 * Several child components have loose/absent typings. To avoid TypeScript complaints
 * at the call sites we cast them to React.ComponentType<any>.
 * This is a minimal-change local workaround so the dashboard compiles cleanly.
 */
const OverviewCardsAny = OverviewCards as unknown as React.ComponentType<any>;
const TradeHistoryTableAny = TradeHistoryTable as unknown as React.ComponentType<any>;
const RiskMetricsAny = RiskMetrics as unknown as React.ComponentType<any>;
const PositionSizingAny = PositionSizing as unknown as React.ComponentType<any>;
const TraderEducationAny = TraderEducation as unknown as React.ComponentType<any>;
const TradeJournalAny = TradeJournal as unknown as React.ComponentType<any>;
const TradePlannerTableAny = TradePlannerTable as unknown as React.ComponentType<any>;
const PricingPlansAny = PricingPlans as unknown as React.ComponentType<any>;
const ProfitLossChartAny = ProfitLossChart as unknown as React.ComponentType<any>;
const DrawdownChartAny = DrawdownChart as unknown as React.ComponentType<any>;
const PerformanceTimelineAny = PerformanceTimeline as unknown as React.ComponentType<any>;
const TradeBehavioralChartAny = TradeBehavioralChart as unknown as React.ComponentType<any>;
const TradePatternChartAny = TradePatternChart as unknown as React.ComponentType<any>;

function DashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // trades + refresh helper from context
  const { trades, refreshTrades } = useTrade();

  // --- filter state & custom dates ---
  type RangeKey =
    | "24h"
    | "7d"
    | "30d"
    | "60d"
    | "3m"
    | "6m"
    | "1y"
    | "custom";

  const [filterRange, setFilterRange] = useState<RangeKey>("24h"); // default to Last 24 hours
  const [customFrom, setCustomFrom] = useState<string>(""); // yyyy-mm-dd
  const [customTo, setCustomTo] = useState<string>(""); // yyyy-mm-dd

  // --- ensure default filter on every mount (explicit) ---
  useEffect(() => {
    setFilterRange("24h");
    setCustomFrom("");
    setCustomTo("");
  }, []);

  // small loading indicator on initial render
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // --- auth detection (NextAuth session preferred; fallback to cookie JWT) ---
  useEffect(() => {
    if (session && (session as any).user) {
      setIsAuthed(true);
      setAuthChecked(true);
      return;
    }

    try {
      const token = (typeof document !== "undefined" && (document.cookie.match(/(^| )session=([^;]+)/) || document.cookie.match(/(^| )app_token=([^;]+)/)))
        ? (document.cookie.match(/(^| )session=([^;]+)/) ? document.cookie.match(/(^| )session=([^;]+)/)![2] : document.cookie.match(/(^| )app_token=([^;]+)/)![2])
        : null;

      if (token) {
        const payload = (() => {
          try {
            const parts = (token as string).split(".");
            if (parts.length < 2) return null;
            const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const json = decodeURIComponent(
              atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
            );
            return JSON.parse(json) as any;
          } catch {
            return null;
          }
        })();
        setIsAuthed(Boolean(payload?.email_verified));
      } else {
        setIsAuthed(false);
      }
    } catch (err) {
      console.error("Auth cookie parse error:", err);
      setIsAuthed(false);
    } finally {
      setAuthChecked(true);
    }
  }, [session]);

  // Wait until we've evaluated auth info client-side
  if (!authChecked) return <Spinner />;

  if (!isAuthed) {
    return <div className="text-white text-center mt-20">Access Denied. Please sign in.</div>;
  }

  const currentTabLabel = TAB_DEFS.find((t) => t.value === activeTab)?.label || "Dashboard";

  // --- Avatar: try to source user name from multiple places, prioritizing authoritative sources ---
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadName() {
      try {
        // 1) prefer NextAuth session user.name
        if (session?.user?.name) {
          if (!mounted) return;
          setUserName(String(session.user.name));
          return;
        }

        // 2) if session provides email, try server-side profile endpoint (if you have one)
        const email = session?.user?.email;
        if (email) {
          try {
            const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`);
            if (res.ok) {
              const json = await res.json().catch(() => ({}));
              if (json && json.name) {
                if (!mounted) return;
                setUserName(String(json.name));
                return;
              }
            }
          } catch (err) {
            // ignore and fallback
          }
        }

        // 3) fallback: read localStorage keys that might have been set on signup
        if (typeof window !== "undefined") {
          const keysToTry = ["signupName", "userName", "name", "displayName"];
          for (const k of keysToTry) {
            try {
              const v = window.localStorage.getItem(k);
              if (v && v.length > 0) {
                if (!mounted) return;
                setUserName(v);
                return;
              }
            } catch {
              // ignore localStorage access errors
            }
          }
        }

        // 4) last fallback: session email first char
        if (email && email.length > 0) {
          if (!mounted) return;
          setUserName(email.split("@")[0]);
          return;
        }
      } catch (e) {
        // swallow errors
      }
    }

    loadName();

    return () => {
      mounted = false;
    };
  }, [session]);

  const avatarInitial = String((userName && userName.length > 0 ? userName.trim()[0] : (session?.user?.name ? String(session.user.name).trim()[0] : (session?.user?.email ? String(session.user.email).trim()[0] : "U")))).toUpperCase();

  // --- Sync handler (keeps existing behavior) ---
  const handleSyncNow = async () => {
    setIsLoading(true);
    try {
      await refreshTrades();
      // small user feedback
      alert("Trades refreshed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Sync/refresh error:", msg);
      alert(`Sync failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Filtering logic: compute filteredTrades derived from `trades` and the selected range ---
  const filteredTrades = useMemo(() => {
    const arr: any[] = Array.isArray(trades) ? trades : [];
    const now = Date.now();
    let fromTime = now - 24 * 60 * 60 * 1000; // default 24h
    let toTime = now;

    switch (filterRange) {
      case "24h":
        fromTime = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        fromTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        fromTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "60d":
        fromTime = now - 60 * 24 * 60 * 60 * 1000;
        break;
      case "3m":
        fromTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case "6m":
        fromTime = now - 180 * 24 * 60 * 60 * 1000;
        break;
      case "1y":
        fromTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case "custom":
        {
          const f = customFrom ? new Date(customFrom).getTime() : NaN;
          const t = customTo ? new Date(customTo).getTime() + 24 * 60 * 60 * 1000 - 1 : NaN; // include full day
          if (!isNaN(f)) fromTime = f;
          if (!isNaN(t)) toTime = t;
        }
        break;
      default:
        fromTime = now - 24 * 60 * 60 * 1000;
    }

    // Helper to extract a date/time from a trade object (best-effort)
    const extractTradeTime = (tr: any): number | null => {
      if (!tr) return null;
      const candidateKeys = [
        "timestamp",
        "time",
        "date",
        "created_at",
        "createdAt",
        "entered_at",
        "enteredAt",
        "open_time",
        "openTime",
        "closed_time",
        "closedAt",
      ];
      for (const k of candidateKeys) {
        const v = tr[k];
        if (!v && v !== 0) continue;
        try {
          // handle numeric epoch (seconds or ms)
          if (typeof v === "number") {
            // heuristic: if in seconds (10 digits), convert to ms
            if (v < 1e11) return v * 1000;
            return v;
          }
          // strings:
          if (typeof v === "string") {
            // ISO or date string
            const parsed = Date.parse(v);
            if (!isNaN(parsed)) return parsed;
            // maybe numeric string
            const n = Number(v);
            if (!isNaN(n)) {
              if (n < 1e11) return n * 1000;
              return n;
            }
          }
        } catch {
          // continue trying other keys
        }
      }
      // if no date keys, attempt to see if trade has `created` or `ts`
      if (tr?.created) {
        const p = Date.parse(String(tr.created));
        if (!isNaN(p)) return p;
      }
      return null;
    };

    return arr.filter((tr) => {
      const ts = extractTradeTime(tr);
      if (!ts) return false;
      return ts >= fromTime && ts <= toTime;
    });
  }, [trades, filterRange, customFrom, customTo]);

  // Label for UI showing selected filter
  const filterLabel = useMemo(() => {
    switch (filterRange) {
      case "24h":
        return "Last 24 hours";
      case "7d":
        return "Last 7 days";
      case "30d":
        return "Last 30 days";
      case "60d":
        return "Last 60 days";
      case "3m":
        return "Last 3 months";
      case "6m":
        return "Last 6 months";
      case "1y":
        return "Last 1 year";
      case "custom":
        return customFrom && customTo ? `From ${customFrom} to ${customTo}` : "Custom range";
      default:
        return "Last 24 hours";
    }
  }, [filterRange, customFrom, customTo]);

  return (
    <main className="min-h-screen w-full flex justify-center bg-[#0D1117] transition-colors duration-300">
      <div className="w-full max-w-[1600px] p-4 md:p-6 text-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {/* mobile hamburger */}
            <button
              className="md:hidden p-1"
              onClick={() => setMobileMenuOpen((s) => !s)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-xl font-semibold">{currentTabLabel}</h1>
            <div className="ml-3 text-sm text-gray-300 hidden sm:flex items-center px-2 py-1 rounded bg-white/2">
              {filterLabel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-full bg-transparent hover:bg-zinc-600"
              onClick={handleSyncNow}
              title="Refresh Trades"
            >
              <RefreshCw size={20} />
            </button>

            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button className="p-2 rounded-full bg-transparent hover:bg-zinc-600" title="Filter trades">
                  <Filter size={18} />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="mt-2 bg-zinc-900 text-white border border-zinc-700 min-w-[220px] p-2">
                <div className="px-1 py-1">
                  <DropdownMenuItem onClick={() => { setFilterRange("24h"); setCustomFrom(""); setCustomTo(""); }}>
                    Last 24 hours
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setFilterRange("7d"); setCustomFrom(""); setCustomTo(""); }}>
                    Last 7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setFilterRange("30d"); setCustomFrom(""); setCustomTo(""); }}>
                    Last 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setFilterRange("60d"); setCustomFrom(""); setCustomTo(""); }}>
                    Last 60 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setFilterRange("3m"); setCustomFrom(""); setCustomTo(""); }}>
                    Last 3 months
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setFilterRange("6m"); setCustomFrom(""); setCustomTo(""); }}>
                    Last 6 months
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setFilterRange("1y"); setCustomFrom(""); setCustomTo(""); }}>
                    Last 1 year
                  </DropdownMenuItem>

                  <div className="border-t border-white/6 my-2" />

                  <div className="px-2 py-1">
                    <div className="text-xs text-gray-400 mb-1">Custom range</div>
                    <label className="text-xs text-gray-300">From</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full mt-1 mb-2 p-2 rounded bg-zinc-800 border border-zinc-700 text-sm"
                    />
                    <label className="text-xs text-gray-300">To</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full mt-1 mb-3 p-2 rounded bg-zinc-800 border border-zinc-700 text-sm"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (customFrom && customTo) {
                            setFilterRange("custom");
                          } else {
                            // if incomplete, fallback to 24h
                            setFilterRange("24h");
                            setCustomFrom("");
                            setCustomTo("");
                          }
                        }}
                        className="flex-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-sm"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setFilterRange("24h");
                          setCustomFrom("");
                          setCustomTo("");
                        }}
                        className="px-3 py-1 rounded bg-transparent border border-white/6 text-sm"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? session?.user?.email ?? "Profile"} />
                  <AvatarFallback>{avatarInitial}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2 bg-zinc-800 text-white border border-zinc-700">
                <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 ease-in-out bg-[#161B22] border-r border-[#2a2f3a] p-5 md:hidden overflow-y-auto ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-lg font-semibold">Menu</h2>
            <button onClick={() => setMobileMenuOpen(false)} aria-label="Close Menu">
              <X size={20} className="text-white" />
            </button>
          </div>
          <nav className="flex flex-col gap-4">
            {TAB_DEFS.map((tab) => (
              <button
                key={tab.value}
                className={`text-left text-sm font-medium px-2 py-1 rounded ${
                  activeTab === tab.value ? "bg-green-600 text-white" : "text-white hover:bg-zinc-700"
                }`}
                onClick={() => {
                  setActiveTab(tab.value);
                  setMobileMenuOpen(false);
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block">
          <Tabs items={TAB_DEFS} activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Tab Content */}
        <div className="mt-8 text-sm">
          {isLoading ? (
            <Spinner />
          ) : (
            <>
              {/* PASS filteredTrades into components so metrics reflect the selected range */}
              {activeTab === "overview" && <OverviewCardsAny trades={filteredTrades} />}

              {activeTab === "history" && <TradeHistoryTableAny trades={filteredTrades} />}

              {activeTab === "journal" && <TradeJournalAny />}

              {activeTab === "insights" && <div className="text-center text-gray-300 py-20">AI Insights coming soon...</div>}

              {activeTab === "analytics" && (
                <div className="grid gap-6">
                  <ProfitLossChartAny trades={filteredTrades} />
                  <DrawdownChartAny trades={filteredTrades} />
                  <PerformanceTimelineAny trades={filteredTrades} />
                  <TradeBehavioralChartAny trades={filteredTrades} />
                  <TradePatternChartAny trades={filteredTrades} />
                </div>
              )}

              {activeTab === "risk" && <RiskMetricsAny trades={filteredTrades} />}

              {activeTab === "planner" && (
                <TradePlanProvider>
                  <div className="grid gap-6 bg-transparent">
                    <TradePlannerTableAny />
                  </div>
                </TradePlanProvider>
              )}

              {activeTab === "position-sizing" && <PositionSizingAny />}

              {activeTab === "education" && <TraderEducationAny />}

              {activeTab === "upgrade" && (
                <div className="max-w-4xl mx-auto">
                  <PricingPlansAny />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const { status } = useSession();
  if (status === "loading") return <Spinner />;

  return (
    <ClientOnly>
      <TradeProvider>
        <LayoutClient>
          <DashboardContent />
        </LayoutClient>
      </TradeProvider>
    </ClientOnly>
  );
}
