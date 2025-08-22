// app/dashboard/settings/page.tsx

"use client";

import { useEffect, useState } from "react";
import { Switch } from "@headlessui/react";
import {
  Sun,
  Moon,
  Bell,
  User,
  Settings,
  Save,
  Info,
  Clock,
} from "lucide-react";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);
  const [defaultTimeframe, setDefaultTimeframe] = useState("1H");

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newTheme);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Settings
      </h1>
      <div className="space-y-6">

        {/* Theme Toggle */}
        <SettingItem
          icon={darkMode ? <Moon /> : <Sun />}
          label="Dark Mode"
          value={darkMode}
          onChange={toggleTheme}
        />

        {/* Notifications */}
        <SettingItem
          icon={<Bell />}
          label="Enable Notifications"
          value={notificationsEnabled}
          onChange={setNotificationsEnabled}
        />

        {/* Show Balance */}
        <SettingItem
          icon={<User />}
          label="Show Account Balance"
          value={showBalance}
          onChange={setShowBalance}
        />

        {/* Compact Mode */}
        <SettingItem
          icon={<Settings />}
          label="Enable Compact View"
          value={compactMode}
          onChange={setCompactMode}
        />

        {/* Auto Save */}
        <SettingItem
          icon={<Save />}
          label="Auto Save Trades"
          value={autoSave}
          onChange={setAutoSave}
        />

        {/* Tooltips */}
        <SettingItem
          icon={<Info />}
          label="Enable Hints & Tooltips"
          value={showTooltips}
          onChange={setShowTooltips}
        />

        {/* Timeframe Dropdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock />
            <span className="text-gray-800 dark:text-gray-200">
              Default Timeframe
            </span>
          </div>
          <select
            value={defaultTimeframe}
            onChange={(e) => setDefaultTimeframe(e.target.value)}
            className="bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
          >
            <option value="30M">30M</option>
            <option value="1H">1H</option>
            <option value="4H">4H</option>
          </select>
        </div>
      </div>
    </div>
  );
}

type SettingItemProps = {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
};

const SettingItem = ({ icon, label, value, onChange }: SettingItemProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-gray-800 dark:text-gray-200">{label}</span>
    </div>
    <Switch
      checked={value}
      onChange={onChange}
      className={`${
        value ? "bg-blue-600" : "bg-gray-300"
      } relative inline-flex h-6 w-11 items-center rounded-full`}
    >
      <span
        className={`${
          value ? "translate-x-6" : "translate-x-1"
        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
      />
    </Switch>
  </div>
);
