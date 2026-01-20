"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LayoutClient from "@/components/LayoutClient";
import { TradeProvider } from "@/context/TradeContext";
import { UserProvider } from "@/context/UserContext";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    FileText,
    Zap,
    BarChart2,
    Brain,
    Calendar,
    Target,
    Sliders,
    Users,
    Clipboard,
    AlertTriangle,
    Shield,
    Star,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard/trade-journal/journal", label: "Journal", icon: FileText },
    { href: "/dashboard/trade-journal/insights", label: "Insights", icon: Zap },
    { href: "/dashboard/trade-journal/patterns", label: "Patterns", icon: BarChart2 },
    { href: "/dashboard/trade-journal/psychology", label: "Psychology", icon: Brain },
    { href: "/dashboard/trade-journal/calendar", label: "Calendar", icon: Calendar },
    { href: "/dashboard/trade-journal/forecast", label: "Forecast", icon: Target },
    { href: "/dashboard/trade-journal/optimizer", label: "Optimizer", icon: Sliders },
    { href: "/dashboard/trade-journal/prop", label: "Prop Desk", icon: Users },
    { href: "/dashboard/trade-journal/review", label: "Review", icon: Clipboard },
    { href: "/dashboard/trade-journal/mistakes", label: "Mistakes", icon: AlertTriangle },
    { href: "/dashboard/trade-journal/risk", label: "Risk", icon: Shield },
    { href: "/dashboard/trade-journal/playbook", label: "Playbook", icon: Star },
];

function TradeJournalNav() {
    const pathname = usePathname();

    return (
        <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117]">
            <div className="px-4 py-2">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href ||
                            (pathname === "/dashboard/trade-journal" && item.href === "/dashboard/trade-journal/journal");
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

export default function TradeJournalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LayoutClient>
            <UserProvider>
                <TradeProvider>
                    <div className="min-h-screen w-full bg-gray-50 dark:bg-[#0D1117] transition-colors duration-300">
                        {/* Page Header */}
                        <header className="bg-white dark:bg-[#161B22] border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Trade Journal
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Reflect on your trades with notes, emotions, and detailed analysis
                            </p>
                        </header>

                        {/* Sub-navigation */}
                        <TradeJournalNav />

                        {/* Main Content */}
                        <main className="p-4 md:p-6">
                            {children}
                        </main>
                    </div>
                </TradeProvider>
            </UserProvider>
        </LayoutClient>
    );
}
