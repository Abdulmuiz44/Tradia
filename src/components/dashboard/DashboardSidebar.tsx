// src/components/dashboard/DashboardSidebar.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/context/AccountContext";
import {
  BarChart3,
  History,
  Database,
  BookOpen,
  Bot,
  TrendingUp,
  Shield,
  Target,
  Calculator,
  GraduationCap,
  Crown,
  Compass,
  Home,
  User,
  Users,
  Settings,
  Brain,
  FileText,
  Wallet,
  ChevronRight,
} from "lucide-react";

interface TabDef {
  value: string;
  label: string;
  icon: string;
  href?: string;
}

interface DashboardSidebarProps {
  tabs: TabDef[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const iconMap = {
  BarChart3,
  History,
  Database,
  BookOpen,
  Bot,
  TrendingUp,
  Shield,
  Target,
  Calculator,
  GraduationCap,
  Crown,
  Compass,
  Home,
  User,
  Users,
  Settings,
  Brain,
  FileText,
};

export default function DashboardSidebar({
  tabs,
  activeTab,
  setActiveTab,
  isMobile = false,
  onClose,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { selectedAccount, accounts } = useAccount();

  const handleTabClick = (tab: TabDef) => {
    if (!tab.href) {
      setActiveTab(tab.value);
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleManageAccounts = () => {
    router.push("/dashboard/accounts");
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Current Account Section */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Account</p>
            {selectedAccount ? (
              <>
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{selectedAccount.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  ${selectedAccount.account_size.toLocaleString()} {selectedAccount.currency}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No account selected</p>
            )}
          </div>
        </div>
        <button
          onClick={handleManageAccounts}
          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-[#161B22] hover:bg-gray-50 dark:hover:bg-[#1c2128] rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700"
        >
          <span>Manage Accounts</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">{accounts.length}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex flex-col flex-1 ${isMobile ? "gap-1" : "gap-0.5"}`}>
        {tabs.map((tab) => {
          const IconComponent = iconMap[tab.icon as keyof typeof iconMap] || BarChart3;
          const isActive = activeTab === tab.value;

          const baseClasses = [
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            isMobile ? "w-full text-sm" : "w-full text-sm",
          ];

          const stateClasses = isActive
            ? "bg-white dark:bg-white text-gray-900 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1c2128]";

          const buttonClasses = [...baseClasses, stateClasses].join(" ");

          const buttonContent = (
            <>
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isActive
                ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-[#2a2f3a]/50 group-hover:bg-gray-200 dark:group-hover:bg-[#2a2f3a]"
                }`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <span className={`font-medium flex-1 ${isActive ? "text-gray-900" : ""}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
            </>
          );

          if (tab.href) {
            return (
              <a
                key={tab.value}
                href={tab.href}
                className={buttonClasses}
                data-track="dashboard_tab_click"
                data-track-meta={`{"tab":"${tab.value}","label":"${tab.label}"}`}
              >
                {buttonContent}
              </a>
            );
          }

          return (
            <button
              key={tab.value}
              onClick={() => handleTabClick(tab)}
              className={buttonClasses}
              data-track="dashboard_tab_click"
              data-track-meta={`{"tab":"${tab.value}","label":"${tab.label}"}`}
            >
              {buttonContent}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
