"use client"; // enable client-side rendering

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import { TradePlanProvider } from "@/context/TradePlanContext";
import { UserProvider } from "@/context/UserContext";
import { NotificationProvider } from "@/context/NotificationContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TradeMigrationModal from "@/components/modals/TradeMigrationModal";
import AnimatedDropdown from "@/components/ui/AnimatedDropdown";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import OverviewCards from "@/components/dashboard/OverviewCards";
import WeeklyCoachRecap from "@/components/dashboard/WeeklyCoachRecap";
import RiskGuard from "@/components/dashboard/RiskGuard";
import MentalCoach from "@/components/dashboard/MentalCoach";
import TradeHistoryTable from "@/components/dashboard/TradeHistoryTable";
import RiskMetrics from "@/components/dashboard/RiskMetrics";
import PositionSizing from "@/components/dashboard/PositionSizing";
import TraderEducation from "@/components/dashboard/TraderEducation";
import TradeJournal from "@/components/dashboard/TradeJournal";
import TradePlannerTable from "@/components/dashboard/TradePlannerTable";
import PricingPlans from "@/components/payment/PricingPlans";
import UserAnalyticsDashboard from "@/components/analytics/UserAnalyticsDashboard";

import Spinner from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    User,
    Settings,
    X,
    Menu,
    Sun,
    Filter,
    Lock,
    RefreshCw,
    Crown,
} from "lucide-react";
import ClientOnly from "@/components/ClientOnly";
import LayoutClient from "@/components/LayoutClient";
import TradeAnalytics from "@/components/dashboard/TradeAnalytics";
import SurveyPrompt from "@/components/marketing/SurveyPrompt";


// Chart Components
import ProfitLossChart from "@/components/charts/ProfitLossChart";
import DrawdownChart from "@/components/charts/DrawdownChart";
import PerformanceTimeline from "@/components/charts/PerformanceTimeline";
import TradeBehavioralChart from "@/components/charts/TradeBehavioralChart";
import TradePatternChart from "@/components/charts/TradePatternChart";
import NotificationBell from "@/components/notifications/NotificationBell";

type DashboardTabDef = {
    value: string;
    label: string;
    icon: string;
    href?: string;
};

// Base tabs available to all users
const BASE_TAB_DEFS: DashboardTabDef[] = [
    { value: "overview", label: "Overview", icon: "BarChart3" },
    { value: "history", label: "Trade History", icon: "History", href: "/dashboard/trade-history" },
    { value: "journal", label: "Trade Journal", icon: "BookOpen", href: "/dashboard/trade-journal" },
    { value: "analytics", label: "Trade Analytics", icon: "TrendingUp", href: "/dashboard/trade-analytics" },

    {
        value: "chat",
        label: "Tradia AI",
        icon: "Bot",
        href: "/dashboard/trades/chat",
    },
    {
        value: "tradia-predict",
        label: "Tradia Predict",
        icon: "Brain",
        href: "/tradia-predict",
    },
    { value: "risk", label: "Risk Management", icon: "Shield", href: "/dashboard/risk-management" },
    { value: "reporting", label: "Reporting", icon: "FileText", href: "/dashboard/reporting" },
    { value: "planner", label: "Trade Planner", icon: "Target", href: "/dashboard/trade-planner" },
    { value: "position-sizing", label: "Position Sizing", icon: "Calculator", href: "/dashboard/position-sizing" },
    { value: "education", label: "Trade Education", icon: "GraduationCap", href: "/dashboard/trade-education" },
    { value: "upgrade", label: "Upgrade", icon: "Crown", href: "/dashboard/upgrade" },
];

// Admin-only tabs
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

/* ---------------------------
   Module-level helpers (pure)
   --------------------------- */

// candidate keys to look for timestamps in a trade object
const TIMESTAMP_KEYS = [
    "openTime",
    "opentime",
    "opened_at",
    "entered_at",
    "enteredAt",
    "time",
    "timestamp",
    "created_at",
    "createdAt",
    "closeTime",
    "closetime",
    "closedAt",
    "closed_time",
    "exit_time",
    "exitTime",
    "time_close",
    "opentime",
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

function DashboardContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const supabase = createClientComponentClient();

    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Admin state
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminChecked, setAdminChecked] = useState(false);

    const { trades, refreshTrades, needsMigration } = useTrade();

    const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
    const [migrationDismissed, setMigrationDismissed] = useState(false);
    const [isSurveyOpen, setIsSurveyOpen] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem("survey_shown") !== "1") {
            setIsSurveyOpen(true);
            sessionStorage.setItem("survey_shown", "1");
        }
    }, []);

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
            return;
        }

        // Check if user is admin immediately (synchronous)
        const userEmail = session.user.email || session.user.name || '';
        const isAdminUser = userEmail === "abdulmuizproject@gmail.com" ||
            userEmail.includes("abdulmuizproject@gmail.com");

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
    }, [session, supabase, adminChecked]);

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
            await signOut({ redirect: false });
        } catch (err) {
            console.error("Sign out error:", err);
        } finally {
            // Force a full page reload to ensure clean logout
            window.location.href = "/login";
        }
    };

    const handleMigrationClose = () => {
        setShowMigrationPrompt(false);
        setMigrationDismissed(true);
    };

    const handleMigrationSuccess = () => {
        setShowMigrationPrompt(false);
        setMigrationDismissed(true);
        refreshTrades();
    };

    useEffect(() => {
        if (needsMigration && !migrationDismissed) {
            setShowMigrationPrompt(true);
        }
    }, [needsMigration, migrationDismissed]);


    // compute filteredTrades based on `filter` and `customRange`
    const filteredTrades = useMemo(() => {
        const arr: any[] = Array.isArray(trades) ? trades : [];
        const now = Date.now();
        const plan = String((session?.user as any)?.plan || 'free').toLowerCase();
        const allowedDays = isAdmin
            ? Infinity
            : (plan === 'free' ? 30 : plan === 'pro' ? 182 : plan === 'plus' ? Infinity : plan === 'elite' ? Infinity : 30);
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

        // Enforce plan limit clamp on fromMs (skip for admins)
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
                return customRange.from && customRange.to ? `${customRange.from} to ${customRange.to}` : "Custom range";
            default:
                return "Last 24 hours";
        }
    }, [filter, customRange]);

    // Auto-redirect unauthenticated users to login
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [status, router]);

    if (status === 'loading') return <Spinner />;
    if (status === 'unauthenticated') return <Spinner />;

    // Dynamic tab definitions based on user role - simple computation without useMemo to avoid hooks issues
    const getTabDefinitions = () => {
        if (!adminChecked) {
            return BASE_TAB_DEFS;
        }

        const rawPlan = String((session?.user as any)?.plan || 'free').toLowerCase();
        const normalizedPlan = rawPlan === 'starter' ? 'free' : rawPlan;

        let tabs = BASE_TAB_DEFS;

        if (normalizedPlan !== 'pro' && normalizedPlan !== 'plus' && normalizedPlan !== 'elite') {
            tabs = tabs.filter(t => t.value !== 'tradia-predict');
        }

        // Hide upgrade tab for elite users
        const base = (normalizedPlan === 'elite' || isAdmin)
            ? tabs.filter(t => t.value !== 'upgrade')
            : tabs;
        const finalTabs = isAdmin ? [...base, ...ADMIN_TAB_DEFS] : base;
        return finalTabs;
    };

    const TAB_DEFS = getTabDefinitions();

    const currentTabLabel = TAB_DEFS.find((t) => t.value === activeTab)?.label || "Dashboard";

    return (
        <main className="min-h-screen w-full bg-[var(--surface-primary)] dark:bg-[#0D1117] transition-colors duration-300 overflow-x-hidden">
            <TradeMigrationModal
                open={showMigrationPrompt}
                onClose={handleMigrationClose}
                onMigrated={handleMigrationSuccess}
            />
            <SurveyPrompt isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
            <div className="flex min-h-screen max-w-full">
                {/* Desktop Sidebar */}
                <div className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:bg-[var(--surface-secondary)] dark:lg:bg-[#161B22] lg:border-r lg:border-[var(--surface-border)] dark:lg:border-[#2a2f3a]">
                    <div className="flex flex-col h-full sticky top-0">
                        {/* Logo/Brand */}
                        <div className="flex items-center gap-3 p-6 border-b border-[var(--surface-border)] dark:border-[#2a2f3a] bg-[var(--surface-secondary)] dark:bg-transparent">
                            <Image src="/Tradia-logo-ONLY.png" alt="Tradia logo" width={24} height={24} className="h-6 w-auto" priority />
                            <div>
                                <h1 className="text-slate-900 dark:text-white font-extrabold text-lg tracking-tight">Tradia</h1>
                                <p className="text-slate-500 dark:text-gray-300 text-xs">Trading Dashboard</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 p-4 overflow-y-auto bg-[var(--surface-secondary)] dark:bg-transparent">
                            <DashboardSidebar
                                tabs={TAB_DEFS}
                                activeTab={activeTab}
                                setActiveTab={(tab) => setActiveTab(tab)}
                            />
                        </div>

                        {/* User Profile Section */}
                        <div className="p-4 border-t border-[var(--surface-border)] dark:border-[#2a2f3a] bg-[var(--surface-secondary)] dark:bg-[#161B22]">
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
                                            onClick={() => router.push("/checkout")}
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
                                <Image src="/Tradia-logo-ONLY.png" alt="Tradia logo" width={28} height={28} className="h-7 w-auto" priority />
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
                    <div className="flex items-center justify-between p-4 md:p-6 border-b border-[var(--surface-border)] dark:border-[#2a2f3a] bg-[var(--surface-secondary)] text-[var(--text-primary)] dark:bg-[#0D1117] dark:text-white overflow-x-auto">
                        <div className="flex items-center gap-3">
                            {/* Mobile menu button */}
                            <button
                                className="lg:hidden p-2 rounded-xl bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 transition-colors"
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Open Menu"
                            >
                                <Menu size={20} />
                            </button>
                            <div>
                                <h1 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] dark:text-white">{currentTabLabel}</h1>
                                <p className="text-[var(--text-secondary)] dark:text-gray-300 text-xs sm:text-sm hidden sm:block">
                                    {activeTab === "chat" ? 'Your personal trading coach with voice support' :
                                        activeTab === "overview" ? 'Comprehensive trading overview and key metrics' :
                                            activeTab === "analytics" ? 'Detailed performance analytics and insights' :
                                                activeTab === "tradia-predict" ? 'AI-powered market predictions using OpenAI GPT-4 to forecast next market direction' :
                                                    activeTab === "user-analytics" ? 'Admin-only user analytics and backend metrics' :
                                                        `Manage your ${currentTabLabel.toLowerCase()}`}
                                </p>
                                {/* Admin Status Indicator */}
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-green-500' : 'bg-slate-400 dark:bg-gray-500'}`}></div>
                                    <span className="text-xs text-[var(--text-secondary)] dark:text-white">
                                        {isAdmin ? 'Admin Access' : 'Standard Access'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto">
                            {/* Theme toggle */}
                            <button
                                onClick={() => {
                                    try {
                                        const root = document.documentElement;
                                        const isDark = root.classList.contains('dark');
                                        if (isDark) { root.classList.remove('dark'); } else { root.classList.add('dark'); }
                                    } catch { }
                                }}
                                aria-label="Toggle theme"
                                className="p-2 rounded-xl bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors hidden sm:inline-flex"
                                title="Toggle theme"
                            >
                                <Sun className="w-4 h-4" />
                            </button>
                            {/* Mobile Profile Avatar - NEW */}
                            <div className="lg:hidden">
                                <AnimatedDropdown
                                    title="Account"
                                    panelClassName="w-[95%] max-w-sm"
                                    trigger={(
                                        <button className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-700 transition-colors" aria-label="Open account menu">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage
                                                    src={session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || session?.user?.email?.split('@')[0] || 'User')}&background=3b82f6&color=fff&size=32`}
                                                    alt={session?.user?.name || session?.user?.email?.split('@')[0] || 'Profile'}
                                                />
                                                <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">{userInitial}</AvatarFallback>
                                            </Avatar>
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
                                                onClick={() => router.push("/checkout")}
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

                            {/* Filter - Only show for relevant tabs */}
                            {(activeTab === 'overview' || activeTab === 'history' || activeTab === 'analytics' || activeTab === 'risk') && (
                                <AnimatedDropdown
                                    title="Filter Trades"
                                    panelClassName="w-[95%] max-w-md"
                                    trigger={(
                                        <button className="p-2 rounded-xl bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors" title="Filter trades" aria-label="Filter trades">
                                            <Filter size={18} />
                                        </button>
                                    )}
                                >
                                    <div className="p-3">
                                        {(() => {
                                            const plan = String((session?.user as any)?.plan || 'free').toLowerCase();
                                            const allowed = new Set<string>(['24h', '7d', '30d']);
                                            if (isAdmin) {
                                                ['60d', '3m', '6m', '1y'].forEach(v => allowed.add(v));
                                            } else {
                                                if (plan === 'pro') { ['60d', '3m', '6m'].forEach(v => allowed.add(v)); }
                                                if (plan === 'plus' || plan === 'elite') { ['60d', '3m', '6m', '1y'].forEach(v => allowed.add(v)); }
                                            }
                                            return FILTERS.filter(f => f.value !== 'custom').map((f) => {
                                                const isAllowed = allowed.has(f.value);
                                                return (
                                                    <div
                                                        key={f.value}
                                                        onClick={() => {
                                                            if (isAllowed) {
                                                                setFilter(f.value);
                                                                setCustomRange({ from: "", to: "" });
                                                            } else {
                                                                setActiveTab('upgrade');
                                                            }
                                                        }}
                                                        className={`cursor-pointer flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 ${isAllowed ? '' : 'opacity-70'}`}
                                                    >
                                                        <span>{f.label}</span>
                                                        {!isAllowed && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                                                                <Lock className="w-3.5 h-3.5" /> Upgrade
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}

                                        <div
                                            onClick={() => setFilter("custom")}
                                            className="cursor-pointer px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-700"
                                        >
                                            Custom range
                                        </div>

                                        <div className="border-t border-slate-200 dark:border-white/10 my-2" />

                                        {/* Custom inputs */}
                                        <div className="space-y-2">
                                            <div className="text-xs text-slate-500 dark:text-gray-400">Custom range</div>
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-gray-300">From</label>
                                                <input
                                                    type="date"
                                                    value={customRange.from}
                                                    onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
                                                    className="w-full mt-1 p-2 rounded bg-white border border-slate-200 text-slate-900 text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-gray-300">To</label>
                                                <input
                                                    type="date"
                                                    value={customRange.to}
                                                    onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
                                                    className="w-full mt-1 p-2 rounded bg-white border border-slate-200 text-slate-900 text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                                                />
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => {
                                                        if (customRange.from && customRange.to) {
                                                            try {
                                                                const f = new Date(customRange.from + 'T00:00:00').getTime();
                                                                const t = new Date(customRange.to + 'T23:59:59.999').getTime();
                                                                const days = Math.ceil((t - f) / (24 * 60 * 60 * 1000));
                                                                const plan = String((session?.user as any)?.plan || 'free').toLowerCase();
                                                                const allowedDays = isAdmin ? Infinity : (plan === 'free' ? 30 : plan === 'pro' ? 182 : plan === 'plus' ? Infinity : plan === 'elite' ? Infinity : 30);
                                                                if (!isAdmin && Number.isFinite(allowedDays) && days > (allowedDays as number)) {
                                                                    alert(`Your plan allows up to ${allowedDays} days. Please narrow the range or upgrade.`);
                                                                    return;
                                                                }
                                                            } catch { }
                                                            setFilter("custom");
                                                        } else {
                                                            setFilter("24h");
                                                            setCustomRange({ from: "", to: "" });
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
                                                >
                                                    Apply
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setFilter("24h");
                                                        setCustomRange({ from: "", to: "" });
                                                    }}
                                                    className="px-3 py-1 rounded-xl bg-transparent border border-[var(--surface-border)] text-[var(--text-secondary)] text-sm hover:bg-[var(--surface-hover)] dark:border-white/10 dark:text-white dark:hover:bg-white/5 transition-colors"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedDropdown>
                            )}

                            {/* Refresh button - Only show for relevant tabs */}
                            {(activeTab === 'overview' || activeTab === 'history') && (
                                <button
                                    className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
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
                                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors"
                                title="Debug admin status"
                            >
                                Debug
                            </button>

                            {/* Notifications */}
                            <NotificationBell />

                            {/* Current filter indicator */}
                            {(activeTab === 'overview' || activeTab === 'history' || activeTab === 'analytics' || activeTab === 'risk') && (
                                <div className="hidden sm:flex items-center px-3 py-1 rounded-xl bg-gray-800 text-gray-300 text-sm">
                                    {filterLabel}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0 max-w-full">
                        {/* Trading account enforcement removed */}
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Spinner />
                            </div>
                        ) : (
                            <>
                                {activeTab === "overview" && (
                                    <>

                                        <OverviewCards trades={filteredTrades} session={session} />
                                    </>
                                )}

                                {activeTab === "history" && <TradeHistoryTable />}



                                {activeTab === "journal" && (
                                    <TradeJournal />
                                )}



                                {activeTab === "analytics" && (
                                    <TradeAnalytics trades={filteredTrades} session={session} isAdmin={isAdmin} />
                                )}



                                {activeTab === "user-analytics" && (
                                    <UserAnalyticsDashboard />
                                )}

                                {activeTab === "risk" && (
                                    <>
                                        <RiskGuard />
                                        <RiskMetrics trades={filteredTrades} />
                                    </>
                                )}

                                {activeTab === "planner" && (
                                    <TradePlanProvider>
                                        <div className="grid gap-6 bg-transparent">
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
                </div>
            </div>
        </main>
    );
}

export default function DashboardPage() {
    return (
        <ClientOnly>
            <NotificationProvider>
                <UserProvider>
                    <TradeProvider>
                        <LayoutClient>
                            <DashboardContent />
                        </LayoutClient>
                    </TradeProvider>
                </UserProvider>
            </NotificationProvider>
        </ClientOnly>
    );
}