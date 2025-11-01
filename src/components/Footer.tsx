"use client";

import { useTheme } from "next-themes";

export default function Footer() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = (resolvedTheme || theme || 'system') as 'light' | 'dark' | 'system';

  return (
    <footer className="py-10 mt-20 border-t border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0b1220]/70 supports-[backdrop-filter]:backdrop-blur">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-700 dark:text-gray-400 text-sm text-center md:text-left">
            © {new Date().getFullYear()} Tradia. Empowering Traders Everywhere.
          </p>
          <div className="flex items-center gap-6 text-gray-600 dark:text-gray-400 text-sm">
            <a href="/privacy" className="hover:text-indigo-500">Privacy Policy</a>
            <a href="/terms" className="hover:text-indigo-500">Terms of Service</a>
            <a href="/contact" className="hover:text-indigo-500">Contact</a>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="hidden sm:inline">Theme:</span>
            <select
              aria-label="Select theme"
              className="px-2 py-1 rounded-md bg-white/70 dark:bg-zinc-900 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200"
              value={currentTheme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}
