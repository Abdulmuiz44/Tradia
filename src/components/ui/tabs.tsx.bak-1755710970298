// src/components/ui/tabs.tsx

import React from "react";
import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeTab: string;
  setActiveTab: (value: string) => void;
}

export function Tabs({ items, activeTab, setActiveTab }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-700 pb-2">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => setActiveTab(item.value)}
          className={cn(
            "text-sm font-medium px-4 py-2 rounded-md transition-colors duration-200",
            activeTab === item.value
              ? "bg-zinc-800 text-white shadow"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
