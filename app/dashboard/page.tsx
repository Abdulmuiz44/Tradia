"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import LayoutClient from "@/components/LayoutClient";
import { useTrade } from "@/context/TradeContext";
import { useAccount } from "@/context/AccountContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import AccountSwitcher from "@/components/dashboard/AccountSwitcher";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    User,
    Settings,
    Menu,
    Shield,
    Target,
    TrendingDown,
    TrendingUp,
    Activity,
    Crown,
    X
} from "lucide-react";
import AnimatedDropdown from "@/components/ui/AnimatedDropdown";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// --- Tab Definitions ---
type DashboardTabDef = {
    value: string;
    label: string;
    icon: string;
    href?: string;
};

const BASE_TAB_DEFS: DashboardTabDef[] = [
    { value: "dashboard", label: "Prop Dashboard", icon: "Activity", href: "/dashboard" },
    { value: "overview", label: "Overview", icon: "BarChart3", href: "/dashboard/overview" },
    { value: "history", label: "Trade History", icon: "History", href: "/dashboard/trade-history" },
    { value: "journal", label: "Trade Journal", icon: "BookOpen", href: "/dashboard/trade-journal" },
    { value: "analytics", label: "Trade Analytics", icon: "TrendingUp", href: "/dashboard/trade-analytics" },
    { value: "chat", label: "Tradia AI", icon: "Bot", href: "/dashboard/trades/chat" },
    { value: "tradia-predict", label: "Tradia Predict", icon: "Brain", href: "/tradia-predict" },
    { value: "risk", label: "Risk Management", icon: "Shield", href: "/dashboard/risk-management" },
    { value: "reporting", label: "Reporting", icon: "FileText", href: "/dashboard/reporting" },
    { value: "planner", label: "Trade Planner", icon: "Target", href: "/dashboard/trade-planner" },
    { value: "position-sizing", label: "Position Sizing", icon: "Calculator", href: "/dashboard/position-sizing" },
    { value: "education", label: "Trade Education", icon: "GraduationCap", href: "/dashboard/trade-education" },
    { value: "upgrade", label: "Upgrade", icon: "Crown", href: "/dashboard/upgrade" },
];

function PropFirmDashboardContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const { accountFilteredTrades: trades = [] } = useTrade() as any;
    const { selectedAccount } = useAccount();

    const [activeTab, setActiveTab] = useState("dashboard");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // --- Metrics Calculation ---
    const dailyMetrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTrades = trades.filter((t: any) => {
            const closeTime = t.closeTime ? new Date(t.closeTime) : null;
            return closeTime && closeTime >= today;
        });
        const dailyPnL = todayTrades.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0);
        const dailyWins = todayTrades.filter((t: any) => (Number(t.pnl) || 0) > 0).length;
        const dailyLosses = todayTrades.filter((t: any) => (Number(t.pnl) || 0) < 0).length;
        return {
            pnl: dailyPnL,
            tradesCount: todayTrades.length,
            wins: dailyWins,
            losses: dailyLosses,
            winRate: todayTrades.length > 0 ? (dailyWins / todayTrades.length) * 100 : 0
        };
    }, [trades]);

    const accountSize = selectedAccount?.account_size || 100000;
    const maxDailyLoss = accountSize * 0.05;
    const maxTotalDrawdown = accountSize * 0.10;
    const currentDailyDrawdown = Math.abs(Math.min(dailyMetrics.pnl, 0));
    const dailyDrawdownPercent = Math.min((currentDailyDrawdown / maxDailyLoss) * 100, 100);

    const totalPnL = trades.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0);
    const currentTotalDrawdown = Math.abs(Math.min(totalPnL, 0));
    const totalDrawdownPercent = Math.min((currentTotalDrawdown / maxTotalDrawdown) * 100, 100);

    const equityData = useMemo(() => {
        const initialBalance = accountSize - totalPnL;
        let current = initialBalance;
        const reversedTrades = [...trades].sort((a: any, b: any) =>
            (new Date(a.closeTime || 0).getTime()) - (new Date(b.closeTime || 0).getTime())
        );
        const data = [{ index: 0, balance: initialBalance }];
        reversedTrades.forEach((t: any, i) => {
            current += (Number(t.pnl) || 0);
            data.push({ index: i + 1, balance: current });
        });
        return data;
    }, [trades, accountSize, totalPnL]);

    const disciplineScore = useMemo(() => {
        let score = 100;
        trades.forEach((t: any) => {
            if ((Number(t.pnl) || 0) < 0 && !t.stopLossPrice) score -= 10;
        });
        return Math.max(0, Math.min(100, score));
    }, [trades]);

    const userInitial = session?.user?.name?.[0]?.toUpperCase() || "U";

    // Shared Sidebar Rendering Logic
    const SidebarContent = () => (
        <>
            <div className="flex flex-col h-full sticky top-0">
                <div className="flex items-center gap-3 p-5 border-b border-gray-200 dark:border-[#2a2f3a]">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Image src="/TRADIA-LOGO.png" alt="Tradia logo" width={20} height={20} className="h-5 w-auto" priority />
                    </div>
                    <div>
                        <h1 className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">Tradia</h1>
                        <p className="text-gray-500 dark:text-gray-500 text-xs">Trading Dashboard</p>
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                    {/* Account Switcher - Visible in mobile sidebar */}
                    <div className="lg:hidden mb-4">
                        <AccountSwitcher />
                    </div>
                    <DashboardSidebar tabs={BASE_TAB_DEFS} activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>

                <div className="p-4 border-t border-[var(--surface-border)] dark:border-[#2a2f3a]">
                    <AnimatedDropdown
                        title="Account"
                        panelClassName="w-[95%] max-w-sm"
                        positionClassName="left-4 top-16"
                        trigger={(
                            <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-[var(--surface-secondary)] dark:bg-transparent hover:bg-[var(--surface-hover)] dark:hover:bg-gray-700 transition-colors" aria-label="Open account menu">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? session?.user?.email ?? "Profile"} />
                                    <AvatarFallback className="bg-blue-600 text-white text-sm">{userInitial}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <p className="text-[var(--text-primary)] dark:text-white text-sm font-medium truncate">
                                        {session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-[var(--text-muted)] dark:text-gray-400 text-xs truncate">
                                        {session?.user?.email || ''}
                                    </p>
                                </div>
                            </button>
                        )}
                    >
                        <div className="p-2">
                            <button onClick={() => router.push("/dashboard/profile")} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-left text-black dark:text-white font-light rounded-md">
                                <User className="w-4 h-4" /> <span>Profile</span>
                            </button>
                            <button onClick={() => router.push("/dashboard/settings")} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-left text-black dark:text-white font-light rounded-md">
                                <Settings className="w-4 h-4" /> <span>Settings</span>
                            </button>
                            <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 text-left text-red-600 dark:text-red-400 font-light rounded-md">
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </AnimatedDropdown>
                </div>
            </div>
        </>
    );

    return (
        <main className="min-h-screen w-full bg-white dark:bg-[#0f1319] transition-colors duration-300 overflow-x-hidden">
            <div className="flex min-h-screen max-w-full">
                {/* Desktop Sidebar */}
                <div className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 bg-gray-50 dark:bg-[#0D1117] border-r border-gray-200 dark:border-[#2a2f3a]">
                    <SidebarContent />
                </div>

                {/* Mobile Sidebar Overlay */}
                <div className={`fixed inset-0 z-40 lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`} onClick={() => setMobileMenuOpen(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="absolute left-0 top-0 h-full w-64 max-w-[80vw] bg-white dark:bg-[#161B22] border-r border-gray-200 dark:border-[#2a2f3a] overflow-y-auto">
                        <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white"><X size={20} /></button>
                        <SidebarContent />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-gray-200 dark:border-[#2a2f3a] bg-white dark:bg-[#0D1117] sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <Menu size={24} />
                            </button>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                Dashboard
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <AccountSwitcher />
                            <NotificationBell />
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                        <div className="max-w-7xl mx-auto space-y-6">

                            {/* Metrics Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="border-none bg-white dark:bg-[#161B22] bg-opacity-50 backdrop-blur-sm shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                                            Daily Loss Limit <Shield className="h-4 w-4 text-blue-500" />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-end justify-between mb-2">
                                            <span className="text-2xl font-bold dark:text-white">${currentDailyDrawdown.toFixed(2)}</span>
                                            <span className="text-sm text-gray-500">Max: ${maxDailyLoss.toLocaleString()}</span>
                                        </div>
                                        <Progress value={dailyDrawdownPercent} className={`h-2 ${dailyDrawdownPercent > 80 ? 'bg-red-100' : 'bg-blue-100'}`} />
                                    </CardContent>
                                </Card>

                                <Card className="border-none bg-white dark:bg-[#161B22] bg-opacity-50 backdrop-blur-sm shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                                            Max Drawdown <Target className="h-4 w-4 text-purple-500" />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-end justify-between mb-2">
                                            <span className="text-2xl font-bold dark:text-white">${currentTotalDrawdown.toFixed(2)}</span>
                                            <span className="text-sm text-gray-500">Max: ${maxTotalDrawdown.toLocaleString()}</span>
                                        </div>
                                        <Progress value={totalDrawdownPercent} className="h-2" />
                                    </CardContent>
                                </Card>

                                <Card className="border-none bg-white dark:bg-[#161B22] bg-opacity-50 backdrop-blur-sm shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                                            Today&apos;s Pulse <Activity className="h-4 w-4 text-green-500" />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4">
                                            <div className={`text-3xl font-bold ${dailyMetrics.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {dailyMetrics.pnl >= 0 ? '+' : ''}{dailyMetrics.pnl.toFixed(2)}
                                            </div>
                                            <div className="flex flex-col text-xs text-gray-500">
                                                <span className="flex items-center gap-1"><TrendingUp size={12} className="text-green-500" /> {dailyMetrics.wins} Wins</span>
                                                <span className="flex items-center gap-1"><TrendingDown size={12} className="text-red-500" /> {dailyMetrics.losses} Losses</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 border-none bg-white dark:bg-[#161B22] shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                                    <CardHeader><CardTitle className="text-gray-900 dark:text-white">Equity Curve</CardTitle></CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={equityData}>
                                                <defs>
                                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                                <XAxis dataKey="index" hide />
                                                <YAxis domain={['auto', 'auto']} stroke="#6b7280" fontSize={12} />
                                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }} />
                                                <Area type="monotone" dataKey="balance" stroke="#3b82f6" fill="url(#colorBalance)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <div className="space-y-6">
                                    <Card className="border-none bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                                        <CardHeader className="pb-2"><CardTitle className="text-white/90 text-sm font-medium flex items-center gap-2"><Crown size={18} /> Discipline Score</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold mb-2">{disciplineScore}/100</div>
                                            <Progress value={disciplineScore} className="h-2 bg-white/20" />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                        </div>
                    </main>
                </div>
            </div>
        </main>
    );
}

export default function PropFirmDashboard() {
    return (
        <LayoutClient>
            <PropFirmDashboardContent />
        </LayoutClient>
    );
}