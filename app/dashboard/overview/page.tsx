"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LayoutClient from "@/components/LayoutClient";
import { useTrade } from "@/context/TradeContext";
import { useAccount } from "@/context/AccountContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import OverviewCards from "@/components/dashboard/OverviewCards";
import AccountSwitcher from "@/components/dashboard/AccountSwitcher";
import NotificationBell from "@/components/notifications/NotificationBell";
import Spinner from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, X, Menu, Sun, Moon, RefreshCw, Filter, Lock, Crown } from "lucide-react";
import { signOut } from "next-auth/react";
import AnimatedDropdown from "@/components/ui/AnimatedDropdown";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useTheme } from "next-themes";

type DashboardTabDef = {
    value: string;
    label: string;
    icon: string;
    href?: string;
};

// Base tabs available to all users
const BASE_TAB_DEFS: DashboardTabDef[] = [
    { value: "dashboard", label: "Command Center", icon: "Activity", href: "/dashboard" },
    { value: "overview", label: "Overview", icon: "BarChart3" },
    { value: "history", label: "Trade History", icon: "History", href: "/dashboard/trade-history" },
    { value: "journal", label: "Trade Journal", icon: "BookOpen", href: "/dashboard/trade-journal" },
    { value: "analytics", label: "Trade Analytics", icon: "TrendingUp", href: "/dashboard/trade-analytics" },
    { value: "chat", label: "Tradia AI", icon: "Bot", href: "/chat" },
    { value: "tradia-predict", label: "Tradia Predict", icon: "Brain", href: "/tradia-predict" },
    { value: "risk", label: "Risk Management", icon: "Shield", href: "/dashboard/risk-management" },
    { value: "reporting", label: "Reporting", icon: "FileText", href: "/dashboard/reporting" },
    { value: "planner", label: "Trade Planner", icon: "Target", href: "/dashboard/trade-planner" },
    { value: "position-sizing", label: "Position Sizing", icon: "Calculator", href: "/dashboard/position-sizing" },
    { value: "education", label: "Trade Education", icon: "GraduationCap", href: "/dashboard/trade-education" },
    { value: "upgrade", label: "Upgrade", icon: "Crown", href: "/dashboard/upgrade" },
];

const ADMIN_TAB_DEFS: DashboardTabDef[] = [
    { value: "user-analytics", label: "User Analytics", icon: "Users", href: "/dashboard/user-analytics" },
];

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

const monthsAgo = (months: number) => {
    const d = new Date();
    const target = new Date(d.getTime());
    target.setMonth(d.getMonth() - months);
    return target;
};

const TIMESTAMP_KEYS = [
    "openTime", "opentime", "opened_at", "entered_at", "enteredAt", "time", "timestamp",
    "created_at", "createdAt", "closeTime", "closetime", "closedAt", "closed_time",
    "exit_time", "exitTime", "time_close", "opentime", "open_ts", "ts",
];

const parseToMs = (val: unknown): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") {
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

function OverviewContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { accountFilteredTrades: trades, refreshTrades } = useTrade();
    const { selectedAccount } = useAccount();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminChecked, setAdminChecked] = useState(false);
    const [userInitial, setUserInitial] = useState("U");

    const [filter, setFilter] = useState<string>("24h");
    const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
        from: "",
        to: "",
    });

    React.useEffect(() => {
        setMounted(true);
        if (!session?.user?.email || adminChecked) return;
        const userEmail = session.user.email || session.user.name || '';
        const isAdminUser = userEmail === "abdulmuizproject@gmail.com" ||
            userEmail.includes("abdulmuizproject@gmail.com");
        setIsAdmin(isAdminUser);
        setAdminChecked(true);
        if (session.user.email) {
            setUserInitial(session.user.email.trim()[0].toUpperCase());
        }
    }, [session, adminChecked]);

    const handleSyncNow = async () => {
        setIsLoading(true);
        try {
            await refreshTrades();
        } catch (err) {
            console.error("Sync error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
        } catch (err) {
            console.error("Sign out error:", err);
        } finally {
            window.location.href = "/login";
        }
    };

    const filteredTrades = useMemo(() => {
        const arr: any[] = Array.isArray(trades) ? trades : [];
        const now = Date.now();
        const plan = String((session?.user as any)?.plan || 'free').toLowerCase();
        const allowedDays = isAdmin ? Infinity :
            (plan === 'free' ? 30 : plan === 'pro' ? 182 : plan === 'plus' ? Infinity : plan === 'elite' ? Infinity : 30);
        let fromMs = now - 24 * 60 * 60 * 1000;
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

        if (!isAdmin && Number.isFinite(allowedDays)) {
            const minAllowed = now - (allowedDays as number) * 24 * 60 * 60 * 1000;
            if (fromMs < minAllowed) fromMs = minAllowed;
        }

        return arr.filter((tr) => {
            try {
                return isTradeInRange(tr, fromMs, toMs);
            } catch {
                return false;
            }
        });
    }, [trades, filter, customRange, isAdmin, session]);

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
                return customRange.from && customRange.to ? `${customRange.from} to ${customRange.to}` : "Custom range";
            default:
                return "Last 24 hours";
        }
    }, [filter, customRange]);

    React.useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    if (status === 'loading') return <Spinner />;
    if (status === 'unauthenticated') return <Spinner />;

    const getTabDefinitions = () => {
        if (!adminChecked) return BASE_TAB_DEFS;
        const rawPlan = String((session?.user as any)?.plan || 'free').toLowerCase();
        const normalizedPlan = rawPlan === 'starter' ? 'free' : rawPlan;
        let tabs = BASE_TAB_DEFS;
        if (normalizedPlan !== 'pro' && normalizedPlan !== 'plus' && normalizedPlan !== 'elite') {
            tabs = tabs.filter(t => t.value !== 'tradia-predict');
        }
        const base = (normalizedPlan === 'elite' || isAdmin) ? tabs.filter(t => t.value !== 'upgrade') : tabs;
        const finalTabs = isAdmin ? [...base, ...ADMIN_TAB_DEFS] : base;
        return finalTabs;
    };

    const TAB_DEFS = getTabDefinitions();

    return (
        <main className="min-h-screen w-full bg-white dark:bg-[#0f1319] transition-colors duration-300 overflow-x-hidden">
            <div className="flex min-h-screen max-w-full">
                {/* Desktop Sidebar */}
                <div className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 bg-gray-50 dark:bg-[#0D1117] border-r border-gray-200 dark:border-[#2a2f3a]">
                    <div className="flex flex-col h-full sticky top-0">
                        {/* Logo/Brand */}
                        <div className="flex items-center gap-3 p-5 border-b border-gray-200 dark:border-[#2a2f3a]">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                                <Image src="/TRADIA-LOGO.png" alt="Tradia logo" width={20} height={20} className="h-5 w-auto" priority />
                            </div>
                            <div>
                                <h1 className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">Tradia</h1>
                                <p className="text-gray-500 dark:text-gray-500 text-xs">Trading Dashboard</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            <DashboardSidebar tabs={TAB_DEFS} activeTab={activeTab} setActiveTab={() => { }} />
                        </div>

                        {/* User Profile Section */}
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
                                    {/* User Plan Info */}
                                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2 py-1 rounded-full text-xs font-light uppercase tracking-wide ${(session?.user as any)?.plan === 'elite' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                (session?.user as any)?.plan === 'plus' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                    (session?.user as any)?.plan === 'pro' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                }`}>
                                                {(session?.user as any)?.plan || 'free'} plan
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => router.push("/dashboard/profile")}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-left text-black dark:text-white font-light"
                                    >
                                        <User className="w-4 h-4 text-black dark:text-white" />
                                        <span>Profile</span>
                                    </button>
                                    <button
                                        onClick={() => router.push("/dashboard/settings")}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-left text-black dark:text-white font-light"
                                    >
                                        <Settings className="w-4 h-4 text-black dark:text-white" />
                                        <span>Settings</span>
                                    </button>
                                    {(session?.user as any)?.plan !== 'elite' && (
                                        <button
                                            onClick={() => router.push("/dashboard/upgrade")}
                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left text-amber-600 dark:text-amber-400 font-light border-t border-gray-200 dark:border-gray-600 mt-1 pt-1"
                                        >
                                            <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            <span>Upgrade Plan</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-left text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-light"
                                    >
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </AnimatedDropdown>
                        </div>
                    </div>
                </div>

                {/* Mobile Sidebar Overlay */}
                <div
                    className={`fixed inset-0 z-40 lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'
                        }`}
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="absolute left-0 top-0 h-full w-64 max-w-[80vw] bg-white dark:bg-[#161B22] border-r border-gray-200 dark:border-[#2a2f3a] transform transition-transform duration-300 overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2a2f3a]">
                            <div className="flex items-center gap-3">
                                <Image src="/TRADIA-LOGO.png" alt="Tradia logo" width={28} height={28} className="h-7 w-auto" priority />
                                <h1 className="text-black dark:text-white font-extrabold text-lg">Tradia</h1>
                            </div>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-gray-400 hover:text-black dark:hover:text-white"
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
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-[#2a2f3a] bg-white dark:bg-[#0D1117]">
                        <div className="flex items-center gap-4">
                            {/* Mobile menu button */}
                            <button
                                className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-[#161B22] border border-gray-300 dark:border-[#2a2f3a] text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-[#1c2128] transition-colors"
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Open Menu"
                            >
                                <Menu size={20} />
                            </button>

                            {/* Account Switcher - Always visible on left */}
                            <div className="hidden sm:block">
                                <AccountSwitcher />
                            </div>
                        </div>

                        <div className="flex-1 mx-4 hidden md:block">
                            <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Overview</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                                Comprehensive trading overview and key metrics
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Theme toggle */}
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="p-2 rounded-xl bg-gray-100 dark:bg-[#0f1319] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#0f1319]/80 transition-colors hidden sm:inline-flex"
                                title="Toggle theme"
                            >
                                {mounted && theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>

                            {/* Filter */}
                            <AnimatedDropdown
                                title="Filter Trades"
                                panelClassName="w-[95%] max-w-md"
                                trigger={(
                                    <button className="p-2 rounded-xl bg-gray-100 dark:bg-[#0f1319] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#0f1319]/80 transition-colors" title="Filter trades" aria-label="Filter trades">
                                        <Filter size={18} />
                                    </button>
                                )}
                            >
                                <div className="p-3">
                                    {FILTERS.filter(f => f.value !== 'custom').map((f) => (
                                        <div
                                            key={f.value}
                                            onClick={() => setFilter(f.value)}
                                            className={`cursor-pointer px-3 py-2 rounded-lg mb-1 transition-colors flex items-center justify-between ${filter === f.value
                                                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                                                : "hover:bg-gray-50 dark:hover:bg-[#1c2128] text-gray-700 dark:text-gray-300"
                                                }`}
                                        >
                                            <span>{f.label}</span>
                                            {filter === f.value && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </AnimatedDropdown>

                            {/* Refresh button */}
                            <button
                                className="p-2 rounded-xl bg-gray-100 dark:bg-[#0f1319] hover:bg-gray-200 dark:hover:bg-[#0f1319]/80 transition-colors"
                                onClick={handleSyncNow}
                                title="Refresh data"
                            >
                                <RefreshCw size={18} className={`text-gray-700 dark:text-gray-300 ${isLoading ? "animate-spin" : ""}`} />
                            </button>

                            {/* Notifications */}
                            <NotificationBell />

                            {/* Current filter indicator */}
                            <div className="hidden sm:flex items-center px-3 py-1 rounded-xl bg-gray-100 dark:bg-[#0f1319] text-gray-700 dark:text-gray-300 text-sm">
                                {filterLabel}
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0 max-w-full">
                        <OverviewCards
                            trades={filteredTrades}
                            session={session}
                            accountId={selectedAccount?.id}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function OverviewPage() {
    return (
        <LayoutClient>
            <OverviewContent />
        </LayoutClient>
    );
}


