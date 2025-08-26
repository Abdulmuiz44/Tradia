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
  const [filter, setFilter] = useState("24h");
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  const [userInitial, setUserInitial] = useState("U");

  // Fetch username initial from Supabase
  useEffect(() => {
    const fetchUser = async () => {
      if (!session?.user?.email) return;
      const { data, error } = await supabase
        .from("users")
        .select("name")
        .eq("email", session.user.email)
        .single();
      if (data?.name) {
        setUserInitial(data.name.trim()[0].toUpperCase());
      } else if (session.user.email) {
        setUserInitial(session.user.email.trim()[0].toUpperCase());
      }
    };
    fetchUser();
  }, [session, supabase]);

  // Apply filter to trades
  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    const now = new Date();
    let fromDate: Date | null = null;

    switch (filter) {
      case "24h":
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "60d":
        fromDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case "3m":
        fromDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case "6m":
        fromDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case "1y":
        fromDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "custom":
        if (customRange.from && customRange.to) {
          fromDate = new Date(customRange.from);
          const toDate = new Date(customRange.to);
          return trades.filter((t: any) => {
            const d = new Date(t.open_time || t.time);
            return d >= fromDate! && d <= toDate;
          });
        }
        break;
      default:
        break;
    }

    if (fromDate) {
      return trades.filter((t: any) => {
        const d = new Date(t.open_time || t.time);
        return d >= fromDate!;
      });
    }
    return trades;
  }, [filter, trades, customRange]);

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

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (session && (session as any).user) {
      setIsAuthed(true);
      setAuthChecked(true);
    } else {
      setIsAuthed(false);
      setAuthChecked(true);
    }
  }, [session]);

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
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger className="p-2 rounded-full bg-transparent hover:bg-zinc-600">
                <Filter size={20} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2 bg-zinc-800 text-white border border-zinc-700 p-2">
                {FILTERS.map((f) => (
                  <DropdownMenuItem key={f.value} onClick={() => setFilter(f.value)}>
                    {f.label}
                  </DropdownMenuItem>
                ))}
                {filter === "custom" && (
                  <div className="flex flex-col gap-2 p-2 text-xs">
                    <label>
                      From: <input type="date" className="bg-zinc-700 p-1 rounded" value={customRange.from} onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))} />
                    </label>
                    <label>
                      To: <input type="date" className="bg-zinc-700 p-1 rounded" value={customRange.to} onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))} />
                    </label>
                  </div>
                )}
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
