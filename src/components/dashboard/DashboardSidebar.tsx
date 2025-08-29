// src/components/dashboard/DashboardSidebar.tsx
"use client";

import React from "react";
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
  Home,
  User,
  Settings
} from "lucide-react";

interface TabDef {
  value: string;
  label: string;
  icon: string;
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
  Home,
  User,
  Settings
};

export default function DashboardSidebar({
  tabs,
  activeTab,
  setActiveTab,
  isMobile = false,
  onClose
}: DashboardSidebarProps) {
  const handleTabClick = (tabValue: string) => {
    setActiveTab(tabValue);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarClasses = isMobile
    ? "flex flex-col gap-2"
    : "flex flex-col gap-1";

  return (
    <nav className={sidebarClasses}>
      {tabs.map((tab) => {
        const IconComponent = iconMap[tab.icon as keyof typeof iconMap] || BarChart3;
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
              ${isActive
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }
              ${isMobile ? "w-full justify-start" : "w-full justify-start"}
            `}
          >
            <IconComponent
              className={`w-5 h-5 transition-colors ${
                isActive
                  ? "text-white"
                  : "text-gray-400 group-hover:text-white"
              }`}
            />
            <span className={`font-medium ${
              isMobile ? "text-base" : "text-sm"
            }`}>
              {tab.label}
            </span>
            {isActive && (
              <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
}