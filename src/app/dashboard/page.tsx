
// src/app/dashboard/page.tsx
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Lazy-loaded charts
const ProfitLossChart = dynamic(() => import("@/components/charts/ProfitLossChart"), { ssr: false });
const PerformanceTimeline = dynamic(() => import("@/components/charts/PerformanceTimeline"), { ssr: false });
const TradeBehavioralChart = dynamic(() => import("@/components/charts/TradeBehavioralChart"), { ssr: false });
const DrawdownChart = dynamic(() => import("@/components/charts/DrawdownChart"), { ssr: false });
const TradePatternChart = dynamic(() => import("@/components/charts/TradePatternChart"), { ssr: false });

// Planner
import TradePlannerTable from "@/components/dashboard/TradePlannerTable";
import { TradePlanProvider } from "@/context/TradePlanContext";

// Pricing Component
import PricingPlans from "@/components/payment/PricingPlans";

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

// type casting hack
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

// Filter ranges
const FILTERS = [
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 60 days", value: "60d" },
  { label: "Last 3 months", value: "3m" },
  { label: "Last 6 months", value: "6m" },
  { label: "Last 1 year", value: "1y" },
  { label: "Custom", value: "custom" },
];

/* ---------------------------
   Module-level helpers (pure)
   --------------------------- */

// candidate keys to look for timestamps in a trade object
const TIMESTAMP_KEYS = [
  "openTime",
  "open_time",
  "opened_at",
  "entered_at",
  "enteredAt",
  "time",
  "timestamp",
  "created_at",
  "createdAt",
  "closeTime",
  "close_time",
  "closedAt",
  "closed_time",
  "exit_time",
  "exitTime",
  "time_close",
  "open_time_ms",
  "open_ts",
  "ts",
];

const parseToMs = (val: unknown): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    // heuristic: 10-digit -> seconds
    if (val < 1e11) return Math.floor(val * 1000);
    return Math.floor(val);
  }
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (n < 1e11) return Math.floor(n * 1000);
    return Math.floor(n);
  }
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) return parsed;
  return null;
};

const extractTradeTimestamps = (tr: any): number[] => {
  const out: number[] = [];
  if (!tr || typeof tr !== "object") return out;
  for (const k of TIMESTAMP_KEYS) {
    if (k in tr) {
      const ms = parseToMs(tr[k]);
      if (ms !== null) out.push(ms);
    }
  }
  try {
    for (const key of Object.keys(tr)) {
      if (out.length > 200) break;
      if (/time|date|ts|created|opened|closed/i.test(key) && !TIMESTAMP_KEYS.includes(key)) {
        const ms = parseToMs((tr as any)[key]);
        if (ms !== null) out.push(ms);
      }
    }
  } catch {
    // ignore
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
};

const isTradeInRange = (tr: any, fromMs: number, toMs: number): boolean => {
  const times = extractTradeTimestamps(tr);
  if (!times || times.length === 0) return false;
  return times.some((t) => t >= fromMs && t <= toMs);
};

const monthsAgo = (months: number) => {
  const d = new Date();
  const target = new Date(d.getTime());
  target.setMonth(d.getMonth() - months);
  return target;
};

/* ---------------------------
   Component
   --------------------------- */

function DashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const { trades, refreshTrades } = useTrade();

  // Filtering state
  const [filter, setFilter] = useState<string>("24h"); // default Last 24 hours
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  const [userInitial, setUserInitial] = useState("U");

  // Fetch username initial from Supabase
  useEffect(() => {
    const fetchUser = async () => {
      if (!session?.user?.email) return;
      try {
        const { data } = await supabase
          .from("users")
          .select("name")
          .eq("email", session.user.email)
          .single();
        if (data?.name) {
          setUserInitial(data.name.trim()[0].toUpperCase());
        } else if (session.user.email) {
          setUserInitial(session.user.email.trim()[0].toUpperCase());
        }
      } catch {
        if (session?.user?.email) setUserInitial(session.user.email.trim()[0].toUpperCase());
      }
    };
    fetchUser();
  }, [session, supabase]);

  // refresh trades
  const handleSyncNow = async () => {
    setIsLoading(true);
    try {
      await refreshTrades();
      alert("Trades refreshed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Sync error:", msg);
      alert(`Sync failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: handle sign out and redirect to login page reliably
  const handleSignOut = async () => {
    try {
      // Use signOut without redirect then navigate with Next router to ensure SPA navigation.
      await signOut({ redirect: false });
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      // Always navigate to login page after attempting sign out.
      try {
        router.push("/login");
      } catch (e) {
        // fallback: set location if router fails
        try {
          window.location.href = "/login";
        } catch {
          /* swallow */
        }
      }
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // --- Robust auth detection: prefer NextAuth session, fallback to cookie JWTs (session or app_token) ---
  useEffect(() => {
    const checkAuth = (): void => {
      if (session && (session as any).user) {
        setIsAuthed(true);
        setAuthChecked(true);
        return;
      }

      try {
        if (typeof document === "undefined") {
          setIsAuthed(false);
          setAuthChecked(true);
          return;
        }
        const getCookie = (name: string) => {
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[2]) : null;
        };

        const token = getCookie("session") || getCookie("app_token") || null;
        if (token) {
          try {
            const parts = token.split(".");
            if (parts.length >= 2) {
              const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
              const json = decodeURIComponent(
                atob(base64)
                  .split("")
                  .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                  .join("")
              );
              const payload = JSON.parse(json) as any;
              const verified = Boolean(payload?.email_verified || payload?.email);
              setIsAuthed(verified);
            } else {
              setIsAuthed(false);
            }
          } catch (err) {
            console.error("JWT parse error:", err);
            setIsAuthed(false);
          }
        } else {
          setIsAuthed(false);
        }
      } catch (err) {
        console.error("Auth cookie parse error:", err);
        setIsAuthed(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [session]);

  /* ---------------------------
     Hooks that must run every render (unconditional)
     --------------------------- */

  // compute filteredTrades based on `filter` and `customRange`
  const filteredTrades = useMemo(() => {
    const arr: any[] = Array.isArray(trades) ? trades : [];
    const now = Date.now();
    let fromMs = now - 24 * 60 * 60 * 1000; // default 24h
    let toMs = now;

    switch (filter) {
      case "24h":
        fromMs = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        fromMs = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        fromMs = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "60d":
        fromMs = now - 60 * 24 * 60 * 60 * 1000;
        break;
      case "3m":
        fromMs = monthsAgo(3).getTime();
        break;
      case "6m":
        fromMs = monthsAgo(6).getTime();
        break;
      case "1y": {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        fromMs = d.getTime();
        break;
      }
      case "custom":
        if (customRange.from && customRange.to) {
          const f = new Date(customRange.from + "T00:00:00");
          const t = new Date(customRange.to + "T23:59:59.999");
          if (!isNaN(f.getTime())) fromMs = f.getTime();
          if (!isNaN(t.getTime())) toMs = t.getTime();
        } else {
          fromMs = now - 24 * 60 * 60 * 1000;
        }
        break;
      default:
        fromMs = now - 24 * 60 * 60 * 1000;
    }

    return arr.filter((tr) => {
      try {
        return isTradeInRange(tr, fromMs, toMs);
      } catch {
        return false;
      }
    });
  }, [trades, filter, customRange]);

  // Label for UI showing selected filter
  const filterLabel = useMemo(() => {
    switch (filter) {
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
        return customRange.from && customRange.to ? `${customRange.from} → ${customRange.to}` : "Custom range";
      default:
        return "Last 24 hours";
    }
  }, [filter, customRange]);

  // Now it's safe to early-return UI that avoids calling more hooks conditionally
  if (!authChecked) return <Spinner />;

  if (!isAuthed) {
    return <div className="text-white text-center mt-20">Access Denied. Please sign in.</div>;
  }

  const currentTabLabel = TAB_DEFS.find((t) => t.value === activeTab)?.label || "Dashboard";

  return (
    <main className="min-h-screen w-full flex justify-center bg-[#0D1117] transition-colors duration-300">
      <div className="w-full max-w-[1600px] p-4 md:p-6 text-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {/* mobile hamburger */}
            <button className="md:hidden p-1" onClick={() => setMobileMenuOpen((s) => !s)} aria-label="Toggle Menu">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-xl font-semibold">{currentTabLabel}</h1>
            <div className="ml-3 text-sm text-gray-300 hidden sm:flex items-center px-2 py-1 rounded bg-white/2">
              {filterLabel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger className="p-2 rounded-full bg-transparent hover:bg-zinc-600" title="Filter trades">
                <Filter size={20} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2 bg-zinc-800 text-white border border-zinc-700 p-2 min-w-[220px]">
                <div className="px-1 py-1">
                  {FILTERS.slice(0, FILTERS.length - 1).map((f) => (
                    <DropdownMenuItem
                      key={f.value}
                      onClick={() => {
                        setFilter(f.value);
                        setCustomRange({ from: "", to: "" });
                      }}
                    >
                      {f.label}
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuItem
                    key="custom"
                    onClick={() => {
                      setFilter("custom");
                    }}
                  >
                    Custom range
                  </DropdownMenuItem>

                  <div className="border-t border-white/6 my-2" />

                  {/* Custom inputs — remain visible after "Custom range" selected */}
                  <div className="px-2 py-1">
                    <div className="text-xs text-gray-400 mb-1">Custom range</div>
                    <label className="text-xs text-gray-300">From</label>
                    <input
                      type="date"
                      value={customRange.from}
                      onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
                      className="w-full mt-1 mb-2 p-2 rounded bg-zinc-800 border border-zinc-700 text-sm"
                    />
                    <label className="text-xs text-gray-300">To</label>
                    <input
                      type="date"
                      value={customRange.to}
                      onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
                      className="w-full mt-1 mb-3 p-2 rounded bg-zinc-800 border border-zinc-700 text-sm"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (customRange.from && customRange.to) {
                            setFilter("custom");
                          } else {
                            setFilter("24h");
                            setCustomRange({ from: "", to: "" });
                          }
                        }}
                        className="flex-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-sm"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setFilter("24h");
                          setCustomRange({ from: "", to: "" });
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

            <button className="p-2 rounded-full bg-transparent hover:bg-zinc-600" onClick={handleSyncNow} title="Refresh Trades">
              <RefreshCw size={20} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? session?.user?.email ?? "Profile"} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2 bg-zinc-800 text-white border border-zinc-700">
                <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
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
