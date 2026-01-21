"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LayoutClient from "@/components/LayoutClient";
import { cn } from "@/lib/utils";
import MobileBackButton from "@/components/ui/MobileBackButton";
import {
    LayoutDashboard,
    LineChart,
    Shield,
    BarChart2,
    Target,
    Activity,
    Zap,
    Users,
    GitMerge,
    Settings
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard/trade-analytics/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/trade-analytics/performance", label: "Performance", icon: LineChart },
    { href: "/dashboard/trade-analytics/risk", label: "Risk", icon: Shield },
    { href: "/dashboard/trade-analytics/patterns", label: "Patterns", icon: BarChart2 },
    { href: "/dashboard/trade-analytics/forecast", label: "Forecast", icon: Target },
    { href: "/dashboard/trade-analytics/guard", label: "Guard", icon: Activity },
    { href: "/dashboard/trade-analytics/tilt", label: "Tilt", icon: Zap },
    { href: "/dashboard/trade-analytics/prop", label: "Prop", icon: Users },
    { href: "/dashboard/trade-analytics/matcher", label: "Matcher", icon: GitMerge },
    { href: "/dashboard/trade-analytics/controls", label: "Controls", icon: Settings },
];

function AnalyticsNav() {
    const pathname = usePathname();

    return (
        <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117]">
            <div className="px-4 py-2">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href ||
                            (pathname === "/dashboard/trade-analytics" && item.href === "/dashboard/trade-analytics/overview");
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                                    isActive
                                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md hover:text-white dark:hover:text-gray-900"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="text-xs md:text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

export default function TradeAnalyticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LayoutClient>
            <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300">
                {/* Page Header */}
                <header className="bg-white dark:bg-[#161B22] border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="lg:hidden">
                            <MobileBackButton />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                Trade Analytics
                            </h1>
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Deep insights into your trading performance and patterns
                            </p>
                        </div>
                    </div>
                </header>

                {/* Sub-navigation */}
                <AnalyticsNav />

                {/* Main Content */}
                <main className="p-4 md:p-6 pb-20 md:pb-6">
                    {children}
                </main>
            </div>
        </LayoutClient>
    );
}
