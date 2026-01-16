// src/components/ui/DarkModeToggle.tsx

"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Helper to get cookie value
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

// Helper to set cookie
const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

export default function DarkModeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load theme from cookie on mount
    const savedTheme = getCookie("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    setCookie("theme", newMode ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-full bg-transparent text-zinc-500 hover:text-zinc-300 transition"
      aria-label="Toggle Dark Mode"
    >
      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
