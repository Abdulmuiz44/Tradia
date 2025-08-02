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
import Spinner from "@/components/ui/spinner";
import DarkModeToggle from "@/components/ui/DarkModeToggle";
import LayoutClient from "@/components/LayoutClient";
import ClientOnly from "@/components/ClientOnly";
import { TradeProvider } from "@/context/TradeContext";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

// Dynamically import browser-only chart components
const ProfitLossChart = dynamic(() => import("@/components/charts/ProfitLossChart"), { ssr: false });
const PerformanceTimeline = dynamic(() => import("@/components/charts/PerformanceTimeline"), { ssr: false });
const TradeBehavioralChart = dynamic(() => import("@/components/charts/TradeBehavioralChart"), { ssr: false });
const DrawdownChart = dynamic(() => import("@/components/charts/DrawdownChart"), { ssr: false });
const TradePatternChart = dynamic(() => import("@/components/charts/TradePatternChart"), { ssr: false });

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadedData, setUploadedData] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (status === "loading") return <Spinner />;
  if (!session) return <div className="text-white text-center mt-20">Access Denied. Please sign in.</div>;

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "history", label: "Trade History" },
    { value: "risk", label: "Risk Metrics" },
    { value: "drawdown", label: "Drawdown" },
    { value: "patterns", label: "Patterns" },
    { value: "strategy", label: "Strategy Tagging" },
    { value: "upload", label: "Upload Trades" },
    { value: "export", label: "Export" },
    { value: "timeline", label: "Timeline" },
    { value: "behavior", label: "Behavioral" },
    { value: "profitloss", label: "Profit & Loss" },
  ];

  return (
    <ClientOnly>
      <TradeProvider trades={uploadedData}>
        <LayoutClient>
          <main className="bg-[#0D1117] min-h-screen w-full flex justify-center text-white">
            <div className="w-full max-w-[1600px] p-4 md:p-6">
              {/* Navbar Header */}
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-semibold text-zinc-200">📊 Trader Dashboard</h1>

                <div className="flex items-center gap-4">
                  <DarkModeToggle />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="focus:outline-none">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={session.user?.image ?? ""} alt={session.user?.name ?? "Profile"} />
                        <AvatarFallback>{session.user?.name?.[0]}</AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-800 text-white border border-zinc-700 mt-2">
                      <DropdownMenuItem onClick={() => router.push("dashboard/profile")}>
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("dashboard/settings")}>
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => signOut()}>
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Tabs */}
              <Tabs items={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

              {/* Main Dashboard Content */}
              <div className="mt-8">
                {isLoading ? (
                  <Spinner />
                ) : (
                  <>
                    {activeTab === "overview" && <OverviewCards />}
                    {activeTab === "history" && <TradeHistoryTable trades={uploadedData} />}
                    {activeTab === "risk" && <RiskMetrics trades={uploadedData} />}
                    {activeTab === "drawdown" && <DrawdownChart trades={uploadedData} />}
                    {activeTab === "patterns" && <TradePatternChart trades={uploadedData} />}
                    {activeTab === "strategy" && <StrategyTagging trades={uploadedData} />}
                    {activeTab === "upload" && <CsvUpload onUpload={setUploadedData} />}
                    {activeTab === "export" && <ExportButtons trades={uploadedData} />}
                    {activeTab === "timeline" && <PerformanceTimeline trades={uploadedData} />}
                    {activeTab === "behavior" && <TradeBehavioralChart trades={uploadedData} />}
                    {activeTab === "profitloss" && <ProfitLossChart trades={uploadedData} />}
                  </>
                )}
              </div>
            </div>
          </main>
        </LayoutClient>
      </TradeProvider>
    </ClientOnly>
  );
}
