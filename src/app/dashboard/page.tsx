
// src/app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
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
import { Menu, X, RefreshCw, Filter, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Advanced Analytics Component
const TradeAnalytics = dynamic(() => import("@/components/dashboard/TradeAnalytics"), { ssr: false });

// Planner
import TradePlannerTable from "@/components/dashboard/TradePlannerTable";
import { TradePlanProvider } from "@/context/TradePlanContext";

// Pricing Component
import PricingPlans from "@/components/payment/PricingPlans";

// MT5 Components
import MT5IntegrationWizard from "@/components/mt5/MT5IntegrationWizard";

// AI Chat Interface
import AIChatInterface from "@/components/ai/AIChatInterface";

// Dashboard Sidebar
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

// User Analytics
import UserAnalyticsDashboard from "@/components/analytics/UserAnalyticsDashboard";

// Chart Components
import ProfitLossChart from "@/components/charts/ProfitLossChart";
import DrawdownChart from "@/components/charts/DrawdownChart";
import PerformanceTimeline from "@/components/charts/PerformanceTimeline";
import TradeBehavioralChart from "@/components/charts/TradeBehavioralChart";
import TradePatternChart from "@/components/charts/TradePatternChart";

// Base tabs available to all users
const BASE_TAB_DEFS = [
  { value: "overview", label: "Overview", icon: "BarChart3" },
  { value: "history", label: "Trade History", icon: "History" },
  { value: "mt5", label: "MT5 Integration", icon: "Database" },
  { value: "journal", label: "Trade Journal", icon: "BookOpen" },
  { value: "tradia-ai", label: "Tradia AI", icon: "Bot" },
  { value: "analytics", label: "Trade Analytics", icon: "TrendingUp" },
  { value: "risk", label: "Risk Metrics", icon: "Shield" },
  { value: "planner", label: "Trade Planner", icon: "Target" },
  { value: "position-sizing", label: "Position Sizing", icon: "Calculator" },
  { value: "education", label: "Trade Education", icon: "GraduationCap" },
  { value: "upgrade", label: "Upgrade", icon: "Crown" },
];

// Admin-only tabs
const ADMIN_TAB_DEFS = [
  { value: "user-analytics", label: "User Analytics", icon: "Users" },
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  const { trades, refreshTrades } = useTrade();

  // Filtering state
  const [filter, setFilter] = useState<string>("24h"); // default Last 24 hours
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  const [userInitial, setUserInitial] = useState("U");

  // Check admin status synchronously and fetch user data - only run once
  useEffect(() => {
    if (!session?.user?.email || adminChecked) {
      console.log('Skipping admin check:', { hasSession: !!session, hasEmail: !!session?.user?.email, adminChecked });
      return;
    }

    // Check if user is admin immediately (synchronous)
    const userEmail = session.user.email || session.user.name || '';
    const isAdminUser = userEmail === "abdulmuizproject@gmail.com" ||
                       userEmail.includes("abdulmuizproject@gmail.com");

    console.log('🔍 Admin check result:', {
      email: session.user.email,
      name: session.user.name,
      userEmail,
      expectedEmail: "abdulmuizproject@gmail.com",
      isAdmin: isAdminUser,
      sessionKeys: Object.keys(session.user)
    });

    // Show alert for debugging (remove this later)
    if (typeof window !== 'undefined') {
      console.log(`Admin status: ${isAdminUser ? '✅ ADMIN' : '❌ NOT ADMIN'}`);
    }

    setIsAdmin(isAdminUser);
    setAdminChecked(true);

    // Fetch username initial from Supabase
    const fetchUser = async () => {
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
        if (session?.user?.email) {
          setUserInitial(session.user.email.trim()[0].toUpperCase());
        }
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

  // Dynamic tab definitions based on user role - simple computation without useMemo to avoid hooks issues
  const getTabDefinitions = () => {
    if (!adminChecked) {
      console.log('Admin check not complete, using base tabs');
      return BASE_TAB_DEFS;
    }

    const tabs = isAdmin ? [...BASE_TAB_DEFS, ...ADMIN_TAB_DEFS] : BASE_TAB_DEFS;
    console.log('Tab definitions computed:', {
      isAdmin,
      adminChecked,
      tabCount: tabs.length,
      tabs: tabs.map(t => ({ value: t.value, label: t.label })),
      hasUserAnalytics: tabs.some(t => t.value === 'user-analytics')
    });
    return tabs;
  };

  const TAB_DEFS = getTabDefinitions();

  const currentTabLabel = TAB_DEFS.find((t) => t.value === activeTab)?.label || "Dashboard";

  return (
    <main className="min-h-screen w-full bg-[#0D1117] transition-colors duration-300">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-[#161B22] lg:border-r lg:border-[#2a2f3a]">
          <div className="flex flex-col h-full">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3 p-6 border-b border-[#2a2f3a]">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Tradia</h1>
                <p className="text-gray-400 text-xs">Trading Dashboard</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4 overflow-y-auto">
              <DashboardSidebar
                tabs={TAB_DEFS}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>

            {/* User Profile Section */}
            <div className="p-4 border-t border-[#2a2f3a]">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-700 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? session?.user?.email ?? "Profile"} />
                    <AvatarFallback className="bg-blue-600 text-white text-sm">{userInitial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium truncate">
                      {session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-gray-400 text-xs truncate">
                      {session?.user?.email || ''}
                    </p>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-zinc-800 text-white border border-zinc-700">
                  <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        <div
          className={`fixed inset-0 z-40 lg:hidden ${
            mobileMenuOpen ? 'block' : 'hidden'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute left-0 top-0 h-full w-64 bg-[#161B22] border-r border-[#2a2f3a] transform transition-transform duration-300">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2f3a]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <h1 className="text-white font-bold text-lg">Tradia</h1>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <DashboardSidebar
                tabs={TAB_DEFS}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isMobile={true}
                onClose={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#2a2f3a] bg-[#0D1117]">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Menu"
              >
                <Menu size={20} className="text-white" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">{currentTabLabel}</h1>
                <p className="text-gray-400 text-sm hidden sm:block">
                  {activeTab === 'tradia-ai' ? 'Your personal trading coach with voice support' :
                   activeTab === 'overview' ? 'Comprehensive trading overview and key metrics' :
                   activeTab === 'analytics' ? 'Detailed performance analytics and insights' :
                   activeTab === 'user-analytics' ? 'Admin-only user analytics and backend metrics' :
                   `Manage your ${currentTabLabel.toLowerCase()}`}
                </p>
                {/* Admin Status Indicator */}
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {isAdmin ? 'Admin Access' : 'Standard Access'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Profile Avatar - NEW */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || session?.user?.email?.split('@')[0] || 'User')}&background=3b82f6&color=fff&size=32`}
                        alt={session?.user?.name || session?.user?.email?.split('@')[0] || 'Profile'}
                      />
                      <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">{userInitial}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-zinc-800 text-white border border-zinc-700 shadow-lg">
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/profile")}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/settings")}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 cursor-pointer text-red-400 hover:text-red-300"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Filter - Only show for relevant tabs */}
              {(activeTab === 'overview' || activeTab === 'history' || activeTab === 'analytics' || activeTab === 'risk') && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors" title="Filter trades">
                    <Filter size={18} className="text-gray-300" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 bg-zinc-800 text-white border border-zinc-700">
                    <div className="p-2">
                      {FILTERS.slice(0, FILTERS.length - 1).map((f) => (
                        <DropdownMenuItem
                          key={f.value}
                          onClick={() => {
                            setFilter(f.value);
                            setCustomRange({ from: "", to: "" });
                          }}
                          className="cursor-pointer"
                        >
                          {f.label}
                        </DropdownMenuItem>
                      ))}

                      <DropdownMenuItem
                        key="custom"
                        onClick={() => setFilter("custom")}
                        className="cursor-pointer"
                      >
                        Custom range
                      </DropdownMenuItem>

                      <div className="border-t border-white/6 my-2" />

                      {/* Custom inputs */}
                      <div className="space-y-2">
                        <div className="text-xs text-gray-400">Custom range</div>
                        <div>
                          <label className="text-xs text-gray-300">From</label>
                          <input
                            type="date"
                            value={customRange.from}
                            onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
                            className="w-full mt-1 p-2 rounded bg-zinc-700 border border-zinc-600 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-300">To</label>
                          <input
                            type="date"
                            value={customRange.to}
                            onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
                            className="w-full mt-1 p-2 rounded bg-zinc-700 border border-zinc-600 text-white text-sm"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => {
                              if (customRange.from && customRange.to) {
                                setFilter("custom");
                              } else {
                                setFilter("24h");
                                setCustomRange({ from: "", to: "" });
                              }
                            }}
                            className="flex-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm transition-colors"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => {
                              setFilter("24h");
                              setCustomRange({ from: "", to: "" });
                            }}
                            className="px-3 py-1 rounded bg-transparent border border-white/6 text-sm hover:bg-white/5 transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Refresh button - Only show for relevant tabs */}
              {(activeTab === 'overview' || activeTab === 'history' || activeTab === 'mt5') && (
                <button
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                  onClick={handleSyncNow}
                  title="Refresh data"
                >
                  <RefreshCw size={18} className="text-gray-300" />
                </button>
              )}

              {/* Admin Debug Button */}
              <button
                onClick={() => {
                  console.log('Manual admin check:', { isAdmin, session: session?.user });
                  window.location.reload();
                }}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                title="Debug admin status"
              >
                🔄
              </button>

              {/* Current filter indicator */}
              {(activeTab === 'overview' || activeTab === 'history' || activeTab === 'analytics' || activeTab === 'risk') && (
                <div className="hidden sm:flex items-center px-3 py-1 rounded-lg bg-gray-800 text-gray-300 text-sm">
                  {filterLabel}
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Spinner />
              </div>
            ) : (
              <>
                {activeTab === "overview" && <OverviewCardsAny trades={filteredTrades} />}

                {activeTab === "history" && <TradeHistoryTableAny trades={filteredTrades} />}

                {activeTab === "mt5" && (
                  <div className="max-w-4xl mx-auto">
                    <MT5IntegrationWizard userId={(session?.user as any)?.id} />
                  </div>
                )}

                {activeTab === "journal" && <TradeJournalAny />}

                {activeTab === "tradia-ai" && (
                  <div className="h-full">
                    <AIChatInterface />
                  </div>
                )}

                {activeTab === "analytics" && (
                  <TradeAnalytics />
                )}

                {activeTab === "user-analytics" && (
                  <UserAnalyticsDashboard />
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
