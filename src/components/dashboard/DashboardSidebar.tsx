
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

  const sidebarClasses = `${isMobile ? "flex flex-col gap-2" : "flex flex-col gap-1"} dashboard-sidebar`;

  return (
    <nav className={sidebarClasses}>
      {tabs.map((tab) => {
        const IconComponent = iconMap[tab.icon as keyof typeof iconMap] || BarChart3;
        const isActive = activeTab === tab.value;

        const buttonClasses = [
          "group",
          "dashboard-sidebar__item",
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
          isMobile ? "w-full justify-start text-xs" : "w-full justify-start text-sm",
          isActive ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const buttonContent = (
          <>
            <IconComponent className="w-5 h-5 transition-colors dashboard-sidebar__icon" />
            <span className={`font-bold ${isMobile ? "text-xs" : "text-sm"}`}>
              {tab.label}
            </span>
            {isActive && (
              <div className="ml-auto dashboard-sidebar__indicator animate-pulse" />
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

