// src/app/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
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
import { Menu, X, RefreshCw } from "lucide-react";
import { AiOutlineFilter } from "react-icons/ai";

/* Lazy-loaded charts (ssr: false). We'll render them inside Suspense. */
const ProfitLossChart = dynamic(() => import("@/components/charts/ProfitLossChart"), { ssr: false });
const PerformanceTimeline = dynamic(() => import("@/components/charts/PerformanceTimeline"), { ssr: false });
const TradeBehavioralChart = dynamic(() => import("@/components/charts/TradeBehavioralChart"), { ssr: false });
const DrawdownChart = dynamic(() => import("@/components/charts/DrawdownChart"), { ssr: false });
const TradePatternChart = dynamic(() => import("@/components/charts/TradePatternChart"), { ssr: false });

/* Planner */
import TradePlannerTable from "@/components/dashboard/TradePlannerTable";
import { TradePlanProvider } from "@/context/TradePlanContext";

/* Pricing Component */
import PricingPlans from "@/components/payment/PricingPlans";

/* Tabs definitions */
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

/* Cast child components to any to avoid TypeScript prop mismatches */
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

type FilterOption =
  | "24h"
  | "7d"
  | "30d"
  | "60d"
  | "3m"
  | "90d"
  | "6m"
  | "1y"
  | "custom";

/* Helper: compute start date for filter */
function computeRange(filter: FilterOption, customFrom?: string | null, customTo?: string | null) {
  const now = new Date();
  let start: Date | null = null;
  let end: Date = now;
  switch (filter) {
    case "24h":
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "60d":
      start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "3m": {
      start = new Date();
      start.setMonth(now.getMonth() - 3);
      break;
    }
    case "6m": {
      start = new Date();
      start.setMonth(now.getMonth() - 6);
      break;
    }
    case "1y": {
      start = new Date();
      start.setFullYear(now.getFullYear() - 1);
      break;
    }
    case "custom":
      if (customFrom) start = new Date(customFrom);
      else start = null;
      if (customTo) end = new Date(customTo);
      break;
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  return { start, end };
}

/* Error boundary to avoid whole-app crash when a child throws */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    // optionally send to monitoring
    // console.error("Dashboard caught error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#07101a]">
          <div className="max-w-2xl w-full bg-[#07101a] border border-white/6 rounded-2xl p-6 text-white">
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-300">An unexpected error occurred in the dashboard. Try refreshing the page.</p>
            <div className="mt-4">
              <button onClick={() => location.reload()} className="px-4 py-2 bg-indigo-600 rounded text-white">
                Refresh
              </button>
            </div>
            <details className="mt-4 text-xs text-gray-400">
              <summary>Technical details</summary>
              <pre className="whitespace-pre-wrap mt-2 text-xs">{String(this.state.error)}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function DashboardContent(): React.ReactElement {
  const { data: session } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // connection modal
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // connection fields
  const [platform, setPlatform] = useState<string>("mt5");
  const [platformLogin, setPlatformLogin] = useState<string>("");
  const [platformPassword, setPlatformPassword] = useState<string>("");
  const [platformServer, setPlatformServer] = useState<string>("");

  // filtering
  const [filterOption, setFilterOption] = useState<FilterOption>("24h");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // profile menu
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // avatar initial
  const [avatarInitial, setAvatarInitial] = useState<string>("U");

  // trade context (defensive)
  const tradeContext = useTrade();
  const trades = tradeContext?.trades ?? [];
  const refreshTrades = tradeContext?.refreshTrades ?? (async () => {});

  // mount splash
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  /* AUTH check strategy:
     1) If next-auth session exists, attempt to confirm emailVerified via /api/user/me
     2) Else fallback to cookie JWT (parse safely)
     3) If server check indicates emailVerified true => allow
     4) If unable to verify but session exists -> allow (pragmatic; you can tighten later)
  */
  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        if (session && (session as any).user) {
          // try server-side truth check if available
          try {
            const res = await fetch("/api/user/me");
            if (res.ok) {
              const data = await res.json().catch(() => null);
              // Accept either boolean flag or truthy field names
              const emailVerified = data?.emailVerified ?? data?.email_verified ?? data?.verified ?? false;
              if (!cancelled) setIsAuthed(Boolean(emailVerified) || Boolean(session));
              return;
            }
            // if /api/user/me not implemented or fails, at least accept session
            if (!cancelled) setIsAuthed(true);
            return;
          } catch {
            if (!cancelled) setIsAuthed(true);
            return;
          }
        }

        // fallback: check cookie JWTs (session/app_token)
        const getCookie = (name: string) => {
          try {
            if (typeof document === "undefined") return null;
            const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
            return match ? decodeURIComponent(match[2]) : null;
          } catch {
            return null;
          }
        };

        const parseJwtPayload = (token: string | null) => {
          if (!token) return null;
          try {
            const parts = token.split(".");
            if (parts.length < 2) return null;
            const payload = parts[1];
            const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
            const json = decodeURIComponent(
              atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
            );
            return JSON.parse(json);
          } catch {
            return null;
          }
        };

        const token = getCookie("session") || getCookie("app_token");
        if (token) {
          const payload = parseJwtPayload(token);
          const emailVerified = payload?.email_verified ?? payload?.emailVerified ?? false;
          if (!cancelled) setIsAuthed(Boolean(emailVerified));
        } else {
          if (!cancelled) setIsAuthed(false);
        }
      } catch (err) {
        if (!cancelled) setIsAuthed(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Avatar resolution: session name -> /api/user/me -> localStorage fallback
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        if (session && (session as any).user && (session as any).user.name) {
          const name = (session as any).user.name;
          if (typeof name === "string" && name.length > 0) {
            setAvatarInitial(name.trim()[0].toUpperCase());
            return;
          }
        }
        // try server
        try {
          const res = await fetch("/api/user/me");
          if (res.ok) {
            const data = await res.json().catch(() => null);
            const name = data?.name ?? data?.fullName ?? data?.displayName;
            const email = data?.email;
            if (name && typeof name === "string" && name.length > 0) {
              setAvatarInitial(name.trim()[0].toUpperCase());
              return;
            }
            if (email && typeof email === "string" && email.length > 0) {
              setAvatarInitial(email.trim()[0].toUpperCase());
              return;
            }
          }
        } catch {
          // ignore server failure
        }
        // localStorage fallback
        try {
          const keysToTry = ["signupName", "userName", "name", "displayName"];
          for (const k of keysToTry) {
            try {
              const v = window.localStorage.getItem(k);
              if (v && v.length > 0) {
                setAvatarInitial(v.trim()[0].toUpperCase());
                return;
              }
            } catch {
              // ignore single key read error
            }
          }
        } catch {
          // ignore localStorage errors entirely
        }
      } catch {
        // silent
      }
    };

    if (typeof window !== "undefined") loadAvatar();
  }, [session]);

  // Wait for auth check
  if (!authChecked) return <Spinner />;

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117]">
        <div className="rounded-xl p-8 bg-gradient-to-br from-black/20 to-white/5 border border-white/5 text-white max-w-lg text-center">
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-sm text-gray-300">Please verify your email or sign in to access the dashboard.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => router.push("/login")} className="px-4 py-2 bg-indigo-600 rounded text-white">Sign in</button>
            <button onClick={() => router.push("/signup")} className="px-4 py-2 border rounded border-white/10 text-white">Sign up</button>
          </div>
        </div>
      </div>
    );
  }

  const currentTabLabel = TAB_DEFS.find((t) => t.value === activeTab)?.label || "Dashboard";

  // Filtered trades memoized, very defensive
  const filteredTrades = useMemo(() => {
    try {
      if (!Array.isArray(trades)) return [];
      const { start, end } = computeRange(filterOption, customFrom || null, customTo || null);
      if (!start) return trades;
      const s = start.getTime();
      const e = end.getTime();
      return trades.filter((tr: any) => {
        try {
          const dateValue =
            tr?.openedAt ?? tr?.opened_at ?? tr?.date ?? tr?.timestamp ?? tr?.time ?? tr?.createdAt ?? tr?.created_at;
          if (!dateValue) return false;
          const d = typeof dateValue === "number" ? new Date(dateValue) : new Date(dateValue);
          if (Number.isNaN(d.getTime())) return false;
          const t = d.getTime();
          return t >= s && t <= e;
        } catch {
          return false;
        }
      });
    } catch (err) {
      console.error("Filtering error:", err);
      return Array.isArray(trades) ? trades : [];
    }
  }, [trades, filterOption, customFrom, customTo]);

  // Handlers
  const openConnectModal = () => {
    setPlatform("mt5");
    setPlatformLogin("");
    setPlatformPassword("");
    setPlatformServer("");
    setConnectModalOpen(true);
  };

  const handleConnectPlatform = async () => {
    try {
      if (!platformLogin || !platformPassword) {
        alert("Please provide platform login and password.");
        return;
      }
      const payload = {
        platform,
        login: platformLogin,
        password: platformPassword,
        server: platformServer,
      };
      const res = await fetch("/api/connect-platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(`Connection failed: ${d?.error || d?.message || "Unknown error"}`);
        return;
      }
      // refresh trades if available
      try {
        await refreshTrades();
      } catch {
        // ignore refresh failure
      }
      setConnectModalOpen(false);
      alert("Connected successfully and trades refreshed.");
    } catch (err) {
      console.error("Connect error", err);
      alert("Failed to connect. Check console for details.");
    }
  };

  const handleQuickRefresh = async () => {
    try {
      setIsLoading(true);
      await refreshTrades();
      alert("Trades refreshed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Sync failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen w-full flex justify-center bg-[#0D1117] transition-colors duration-300">
        <div className="w-full max-w-[1600px] p-4 md:p-6 text-white">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-1"
                onClick={() => setMobileMenuOpen((s) => !s)}
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <h1 className="text-xl font-semibold">{currentTabLabel}</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter */}
              <div className="relative">
                <button
                  title="Filter trades"
                  className="p-2 rounded-full bg-transparent hover:bg-zinc-700"
                  onClick={() => setFilterDropdownOpen((s) => !s)}
                >
                  <AiOutlineFilter size={18} />
                </button>

                {filterDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#0b1116] border border-zinc-700 rounded-md p-3 z-50 shadow-lg">
                    <div className="text-sm font-medium text-gray-200 mb-2">Quick ranges</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "24h", label: "Last 24 hours" },
                        { id: "7d", label: "Last 7 days" },
                        { id: "30d", label: "Last 30 days" },
                        { id: "60d", label: "Last 60 days" },
                        { id: "3m", label: "Last 3 months" },
                        { id: "90d", label: "Last 90 days" },
                        { id: "6m", label: "Last 6 months" },
                        { id: "1y", label: "Last 1 year" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setFilterOption(opt.id as FilterOption);
                            setFilterDropdownOpen(false);
                          }}
                          className={`text-left px-2 py-2 rounded text-sm ${
                            filterOption === (opt.id as FilterOption) ? "bg-green-600 text-white" : "text-gray-200 hover:bg-zinc-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 border-t border-zinc-700 pt-3">
                      <div className="text-sm text-gray-200 mb-2">Custom range</div>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="w-1/2 p-2 rounded bg-transparent border border-zinc-700 text-gray-200"
                        />
                        <input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="w-1/2 p-2 rounded bg-transparent border border-zinc-700 text-gray-200"
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            if (!customFrom || !customTo) {
                              alert("Please select both from and to dates.");
                              return;
                            }
                            setFilterOption("custom");
                            setFilterDropdownOpen(false);
                          }}
                          className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-sm"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            setCustomFrom("");
                            setCustomTo("");
                          }}
                          className="px-3 py-2 rounded border border-zinc-700 text-sm"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh */}
              <button className="p-2 rounded-full bg-transparent hover:bg-zinc-600" onClick={handleQuickRefresh} title="Refresh Trades">
                <RefreshCw size={20} />
              </button>

              {/* Connect Account (modal) */}
              <button className="px-3 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white ml-2" onClick={openConnectModal} title="Connect trading account">
                Connect Account
              </button>

              {/* Avatar + simple menu */}
              <div className="relative ml-3">
                <button onClick={() => setProfileMenuOpen((s) => !s)} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold" aria-label="Open profile menu">
                  {avatarInitial}
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-[#0b1116] border border-zinc-700 rounded-md p-2 z-50 shadow-lg">
                    <button
                      className="w-full text-left px-2 py-2 text-sm text-gray-200 hover:bg-zinc-800 rounded"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push("/dashboard/profile");
                      }}
                    >
                      Profile
                    </button>
                    <button
                      className="w-full text-left px-2 py-2 text-sm text-gray-200 hover:bg-zinc-800 rounded"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push("/dashboard/settings");
                      }}
                    >
                      Settings
                    </button>
                    <button
                      className="w-full text-left px-2 py-2 text-sm text-gray-200 hover:bg-zinc-800 rounded"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        signOut();
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
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
                  className={`text-left text-sm font-medium px-2 py-1 rounded ${activeTab === tab.value ? "bg-green-600 text-white" : "text-white hover:bg-zinc-700"}`}
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
          <div className="hidden md:flex gap-2 mb-4">
            {TAB_DEFS.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={`px-3 py-2 rounded text-sm font-medium ${activeTab === t.value ? "bg-indigo-600 text-white" : "text-gray-300 bg-transparent hover:bg-zinc-800"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-2 text-sm">
            {isLoading ? (
              <Spinner />
            ) : (
              <>
                {activeTab === "overview" && <OverviewCardsAny trades={filteredTrades} />}

                {activeTab === "history" && <TradeHistoryTableAny trades={filteredTrades} />}

                {activeTab === "journal" && <TradeJournalAny trades={filteredTrades} />}

                {activeTab === "insights" && <div className="text-center text-gray-300 py-20">AI Insights coming soon...</div>}

                {activeTab === "analytics" && (
                  <Suspense fallback={<div className="py-8"><Spinner /></div>}>
                    <div className="grid gap-6">
                      <ProfitLossChartAny trades={filteredTrades} />
                      <DrawdownChartAny trades={filteredTrades} />
                      <PerformanceTimelineAny trades={filteredTrades} />
                      <TradeBehavioralChartAny trades={filteredTrades} />
                      <TradePatternChartAny trades={filteredTrades} />
                    </div>
                  </Suspense>
                )}

                {activeTab === "risk" && <RiskMetricsAny trades={filteredTrades} />}

                {activeTab === "planner" && (
                  <TradePlanProvider>
                    <div className="grid gap-6 bg-transparent">
                      <TradePlannerTableAny trades={filteredTrades} />
                    </div>
                  </TradePlanProvider>
                )}

                {activeTab === "position-sizing" && <PositionSizingAny trades={filteredTrades} />}

                {activeTab === "education" && <TraderEducationAny trades={filteredTrades} />}

                {activeTab === "upgrade" && (
                  <div className="max-w-4xl mx-auto">
                    <PricingPlansAny />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Connect Account Modal */}
        {connectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setConnectModalOpen(false)} />
            <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 p-6 backdrop-blur-sm shadow-2xl z-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Connect Trading Account</h3>
                <button onClick={() => setConnectModalOpen(false)} className="text-gray-300">Close</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-gray-300">Platform</span>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="mt-2 w-full p-2 rounded bg-transparent border border-white/10 text-gray-100">
                    <option value="mt5">MT5</option>
                    <option value="metatrader">MetaTrader</option>
                    <option value="ctrader">cTrader</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-300">Broker Server</span>
                  <input value={platformServer} onChange={(e) => setPlatformServer(e.target.value)} placeholder="Broker server (host)" className="mt-2 w-full p-2 rounded bg-transparent border border-white/10 text-gray-100" />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm text-gray-300">Login</span>
                  <input value={platformLogin} onChange={(e) => setPlatformLogin(e.target.value)} placeholder="Account login" className="mt-2 w-full p-2 rounded bg-transparent border border-white/10 text-gray-100" />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm text-gray-300">Password</span>
                  <input type="password" value={platformPassword} onChange={(e) => setPlatformPassword(e.target.value)} placeholder="Account password" className="mt-2 w-full p-2 rounded bg-transparent border border-white/10 text-gray-100" />
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setConnectModalOpen(false)} className="px-4 py-2 rounded border border-zinc-700 text-sm">Cancel</button>
                <button onClick={handleConnectPlatform} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Connect</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}

export default function DashboardPage(): React.ReactElement {
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
