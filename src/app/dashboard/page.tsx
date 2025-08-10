// src/app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Tabs } from "@/components/ui/tabs";
import OverviewCards from "@/components/dashboard/OverviewCards";
import TradeHistoryTable from "@/components/dashboard/TradeHistoryTable";
import RiskMetrics from "@/components/dashboard/RiskMetrics";
import StrategyTagging from "@/components/dashboard/StrategyTagging";
import CsvUpload from "@/components/dashboard/CsvUpload";
import ExportButtons from "@/components/dashboard/ExportButtons";
import ScreenshotUpload from "@/components/dashboard/ScreenshotUpload";
import Spinner from "@/components/ui/spinner";
import LayoutClient from "@/components/LayoutClient";
import ClientOnly from "@/components/ClientOnly";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import { Menu, X, Filter, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Lazy‐loaded charts
const ProfitLossChart = dynamic(
  () => import("@/components/charts/ProfitLossChart"),
  { ssr: false }
);
const PerformanceTimeline = dynamic(
  () => import("@/components/charts/PerformanceTimeline"),
  { ssr: false }
);
const TradeBehavioralChart = dynamic(
  () => import("@/components/charts/TradeBehavioralChart"),
  { ssr: false }
);
const DrawdownChart = dynamic(
  () => import("@/components/charts/DrawdownChart"),
  { ssr: false }
);
const TradePatternChart = dynamic(
  () => import("@/components/charts/TradePatternChart"),
  { ssr: false }
);

// Free Features
import TradeJournal from "@/components/dashboard/TradeJournal";
import TradeAlerts from "@/components/dashboard/TradeAlerts";
import PositionSizing from "@/components/dashboard/PositionSizing";
import TraderEducation from "@/components/dashboard/TraderEducation";
import Leaderboard from "@/components/dashboard/Leaderboard";

// Planner
import TradePlannerForm from "@/components/planner/TradePlannerForm";
import TradePlannerTable from "@/components/dashboard/TradePlannerTable";
import { TradePlanProvider } from "@/context/TradePlanContext";

// Pricing Component
import PricingPlans from "@/components/payment/PricingPlans";

// Reordered tab definitions
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

function DashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Use trade context hook to access trades + sync helper
  const { trades, syncFromMT5 } = useTrade();

  // filter modal state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // --- NEW: Sync modal & states ---
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [platform, setPlatform] = useState<
    "mt5" | "matchtrader" | "ctrader" | "tradelocker" | "other"
  >("mt5");
  const [mt5Login, setMt5Login] = useState("");
  const [mt5Password, setMt5Password] = useState("");
  const [mt5Server, setMt5Server] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<any | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleFilterApply = () => {
    setFilterModalOpen(false);
  };

  // Replaces prior placeholder: open the sync modal
  const handleSyncNow = () => {
    setSyncModalOpen(true);
  };

  // Default backend URL for Python service (if you prefer Next API route, change here)
  const DEFAULT_MT5_BACKEND = "http://localhost:5000/sync_mt5";

  // Performs the actual sync — calls syncFromMT5 from TradeContext
  const performSync = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSyncError(null);

    // basic validation for MT5
    if (platform === "mt5") {
      if (!mt5Login || !mt5Password || !mt5Server) {
        setSyncError("Please provide MT5 account, password and server.");
        return;
      }
    } else {
      // for other platforms, currently not implemented
      setSyncError(
        `Integration for ${platform} not available yet. Only MT5 is supported in this flow.`
      );
      return;
    }

    setIsSyncing(true);
    try {
      // call the context sync helper — which will call the backend and import trades
      const result = await syncFromMT5(mt5Login, mt5Password, mt5Server, DEFAULT_MT5_BACKEND);

      if (!result.success) {
        throw new Error(result.error || "Sync failed");
      }

      // result.account and trades are returned from the context call
      setAccountInfo(result.account ?? null);
      setLastSync(new Date().toISOString());

      // close modal and notify
      setSyncModalOpen(false);
      alert("Account synced successfully.");
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncError(err?.message || "Unknown error during sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  if (!session) {
    return (
      <div className="text-white text-center mt-20">
        Access Denied. Please sign in.
      </div>
    );
  }

  // find the current tab label for header
  const currentTabLabel =
    TAB_DEFS.find((t) => t.value === activeTab)?.label || "Dashboard";

  return (
    <main className="min-h-screen w-full flex justify-center bg-[#0D1117] transition-colors duration-300">
      <div className="w-full max-w-[1600px] p-4 md:p-6 text-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {/* mobile hamburger */}
            <button
              className="md:hidden p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {/* dynamic title */}
            <h1 className="text-xl font-semibold">{currentTabLabel}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Now button */}
            <button
              className="p-2 rounded-full bg-transparent hover:bg-zinc-600"
              onClick={handleSyncNow}
              title="Sync Now"
            >
              <RefreshCw size={20} />
            </button>

            {/* display connected account summary (if any) */}
            {accountInfo && (
              <div className="hidden sm:flex flex-col text-right text-xs">
                <span className="font-medium">{accountInfo.login}</span>
                <span className="text-muted-foreground">
                  {accountInfo.balance !== undefined
                    ? `${accountInfo.currency ? accountInfo.currency + " " : "$"}${Number(
                        accountInfo.balance
                      ).toFixed(2)}`
                    : "No balance"}
                </span>
              </div>
            )}

            {/* only show filter on Overview */}
            {activeTab === "overview" && (
              <button
                className="p-2 rounded-full bg-transparent hover:bg-zinc-600"
                onClick={() => setFilterModalOpen(true)}
                aria-label="Filter"
              >
                <Filter size={20} />
              </button>
            )}

            {/* profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="w-9 h-9">
                  <AvatarImage
                    src={session.user?.image ?? ""}
                    alt={session.user?.name ?? "Profile"}
                  />
                  <AvatarFallback>{session.user?.name?.[0]}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2 bg-zinc-800 text-white border border-zinc-700">
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  Sign Out
                </DropdownMenuItem>
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
                  activeTab === tab.value
                    ? "bg-green-600 text-white"
                    : "text-white hover:bg-zinc-700"
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
              {activeTab === "overview" && (
                // pass accountInfo into OverviewCards if you want the Overview to surface account details
                <OverviewCards fromDate={fromDate} toDate={toDate} accountInfo={accountInfo} />
              )}
              {activeTab === "history" && <TradeHistoryTable trades={trades} />}
              {activeTab === "journal" && <TradeJournal />}
              {activeTab === "insights" && (
                <div className="text-center text-gray-300 py-20">
                  {/* Placeholder for your AI Insights component */}
                  AI Insights coming soon...
                </div>
              )}
              {activeTab === "analytics" && (
                <div className="grid gap-6">
                  <ProfitLossChart trades={trades} />
                  <DrawdownChart trades={trades} />
                  <PerformanceTimeline trades={trades} />
                  <TradeBehavioralChart trades={trades} />
                  <TradePatternChart trades={trades} />
                </div>
              )}
              {activeTab === "risk" && <RiskMetrics trades={trades} />}
              {activeTab === "planner" && (
                <TradePlanProvider>
                  <div className="grid gap-6 bg-transparent">
                    <TradePlannerForm />
                    <TradePlannerTable />
                  </div>
                </TradePlanProvider>
              )}
              {activeTab === "position-sizing" && <PositionSizing />}
              {activeTab === "education" && <TraderEducation />}
              {activeTab === "upgrade" && (
                <div className="max-w-4xl mx-auto">
                  <PricingPlans />
                </div>
              )}
            </>
          )}
        </div>

        {/* Filter Modal */}
        {filterModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-[#1F2329] p-6 rounded-md shadow-lg w-80">
              <h2 className="text-lg font-semibold mb-4 text-white">
                Select Date Range
              </h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-white">
                    From Date
                  </label>
                  <input
                    type="date"
                    className="mt-2 p-2 w-full border border-gray-300 rounded-md bg-[#2D353F] text-white"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">
                    To Date
                  </label>
                  <input
                    type="date"
                    className="mt-2 p-2 w-full border border-gray-300 rounded-md bg-[#2D353F] text-white"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-between">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-lg"
                  onClick={() => setFilterModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-lg"
                  onClick={handleFilterApply}
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- SYNC Modal --- */}
        {syncModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <form
              onSubmit={performSync}
              className="bg-[#1F2329] p-6 rounded-md shadow-lg w-96 max-w-full"
            >
              <h2 className="text-lg font-semibold mb-4 text-white">Connect Account</h2>

              <div className="mb-3">
                <label className="block text-sm text-muted-foreground mb-2">Platform</label>
                <select
                  value={platform}
                  onChange={(e) =>
                    setPlatform(e.target.value as
                      | "mt5"
                      | "matchtrader"
                      | "ctrader"
                      | "tradelocker"
                      | "other")
                  }
                  className="w-full p-2 bg-[#2D353F] rounded border border-gray-600 text-white"
                >
                  <option value="mt5">MetaTrader 5 (MT5)</option>
                  <option value="matchtrader">MatchTrader</option>
                  <option value="ctrader">cTrader</option>
                  <option value="tradelocker">TradeLocker</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Show MT5 fields */}
              {platform === "mt5" && (
                <>
                  <div className="mb-3">
                    <label className="block text-sm text-muted-foreground mb-2">Account Login</label>
                    <input
                      value={mt5Login}
                      onChange={(e) => setMt5Login(e.target.value)}
                      className="w-full p-2 bg-[#2D353F] rounded border border-gray-600 text-white"
                      placeholder="Account number"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm text-muted-foreground mb-2">Password</label>
                    <input
                      type="password"
                      value={mt5Password}
                      onChange={(e) => setMt5Password(e.target.value)}
                      className="w-full p-2 bg-[#2D353F] rounded border border-gray-600 text-white"
                      placeholder="Trading password"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm text-muted-foreground mb-2">Server</label>
                    <input
                      value={mt5Server}
                      onChange={(e) => setMt5Server(e.target.value)}
                      className="w-full p-2 bg-[#2D353F] rounded border border-gray-600 text-white"
                      placeholder="Broker Server (e.g. Broker-Demo)"
                    />
                  </div>
                </>
              )}

              {platform !== "mt5" && (
                <div className="mb-3 text-sm text-muted-foreground">
                  Integration for the selected platform is not yet available from the client.
                  Contact support or choose MT5 for automatic sync.
                </div>
              )}

              {syncError && (
                <div className="text-sm text-red-400 mb-2">{syncError}</div>
              )}

              <div className="flex justify-between items-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSyncModalOpen(false);
                    setSyncError(null);
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {isSyncing ? (
                    <div className="flex items-center gap-2">
                      <Spinner />
                      <span className="text-sm text-muted-foreground">Syncing...</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="bg-green-500 text-white px-4 py-2 rounded-lg"
                    >
                      Connect & Sync
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
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
