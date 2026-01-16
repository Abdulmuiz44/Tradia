
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
  Compass,
  Home,
  User,
  Users,
  Settings,
  Brain,
  FileText,
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
  const handleTabClick = (tab: TabDef) => {
    if (!tab.href) {
      setActiveTab(tab.value);
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <nav className={`flex flex-col ${isMobile ? "gap-1" : "gap-0.5"}`}>
      {tabs.map((tab) => {
        const IconComponent = iconMap[tab.icon as keyof typeof iconMap] || BarChart3;
        const isActive = activeTab === tab.value;

        const baseClasses = [
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          isMobile ? "w-full text-sm" : "w-full text-sm",
        ];

        const stateClasses = isActive
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-400 hover:text-white hover:bg-[#1c2128]";

        const buttonClasses = [...baseClasses, stateClasses].join(" ");

        const buttonContent = (
          <>
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isActive
                ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md"
                : "bg-[#2a2f3a]/50 group-hover:bg-[#2a2f3a]"
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
  );
}

