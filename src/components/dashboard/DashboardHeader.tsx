"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
    User,
    Settings,
    LogOut,
    Menu,
    Sun,
    Moon,
    Activity,
    UserCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AnimatedDropdown from "@/components/ui/AnimatedDropdown";
import AccountSwitcher from "@/components/dashboard/AccountSwitcher";
import NotificationBell from "@/components/notifications/NotificationBell";
import MobileBackButton from "@/components/ui/MobileBackButton";

interface DashboardHeaderProps {
    title: string;
    description?: string;
    showAccountSwitcher?: boolean;
    actions?: React.ReactNode;
    onMenuClick?: () => void;
    showBackButton?: boolean;
}

export default function DashboardHeader({
    title,
    description,
    showAccountSwitcher = true,
    actions,
    onMenuClick,
    showBackButton = false,
}: DashboardHeaderProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [userInitial, setUserInitial] = useState("U");

    useEffect(() => {
        setMounted(true);
        if (session?.user?.email) {
            setUserInitial(session.user.email.trim()[0].toUpperCase());
        } else if (session?.user?.name) {
            setUserInitial(session.user.name.trim()[0].toUpperCase());
        }
    }, [session]);

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
            window.location.href = "/login";
        } catch (err) {
            console.error("Sign out error:", err);
        }
    };

    return (
        <header className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-[#2a2f3a] bg-white dark:bg-[#0D1117] sticky top-0 z-30 transition-colors">
            <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                {onMenuClick && (
                    <button
                        className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-[#161B22] border border-gray-300 dark:border-[#2a2f3a] text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-[#1c2128] transition-colors"
                        onClick={onMenuClick}
                        aria-label="Open Menu"
                    >
                        <Menu size={20} />
                    </button>
                )}

                {showBackButton && <MobileBackButton className="mr-2" />}

                {/* Account Switcher - Desktop & Mobile */}
                {showAccountSwitcher && (
                    <div className="flex items-center">
                        <AccountSwitcher />
                    </div>
                )}

                {/* Title and Description - Desktop only when Switcher is present, always otherwise */}
                <div className={`hidden md:block ${!showAccountSwitcher ? 'block' : ''}`}>
                    <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate max-w-[300px]">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Custom Actions */}
                {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}

                {/* Theme toggle */}
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-[#0f1319] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/5 transition-colors hidden sm:inline-flex border border-transparent dark:border-white/5"
                        title="Toggle theme"
                    >
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                )}

                {/* Notifications */}
                <NotificationBell />

                {/* User Account Menu */}
                <AnimatedDropdown
                    title="Account"
                    panelClassName="w-[240px]"
                    trigger={
                        <button
                            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:hover:border-white/5"
                            aria-label="Open account menu"
                        >
                            <Avatar className="w-8 h-8 border border-gray-200 dark:border-white/10">
                                <AvatarImage
                                    src={session?.user?.image ?? ""}
                                    alt={session?.user?.name ?? "User"}
                                />
                                <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden sm:block text-left mr-1">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[100px]">
                                    {session?.user?.name || "Trader"}
                                </p>
                            </div>
                        </button>
                    }
                >
                    <div className="p-2 space-y-1">
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5 mb-1">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Trading Profile</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {session?.user?.email}
                            </p>
                        </div>

                        <button
                            onClick={() => router.push("/dashboard/profile")}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-sm transition-colors text-gray-700 dark:text-zinc-300"
                        >
                            <UserCircle className="w-4 h-4" />
                            <span>Profile</span>
                        </button>
                        <button
                            onClick={() => router.push("/dashboard/settings")}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-sm transition-colors text-gray-700 dark:text-zinc-300"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                        </button>

                        <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 text-sm transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </AnimatedDropdown>
            </div>
        </header>
    );
}
