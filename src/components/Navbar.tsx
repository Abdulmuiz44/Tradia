
// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";

/**
 * Navbar redesigned to match the dark/glass aesthetic used across the app pages.
 * - Replaced /insights -> /pricing
 * - Responsive (desktop + mobile)
 * - Theme toggle (next-themes) with mounted check to avoid hydration mismatch
 * - Shows profile pill when signed in (initial + name)
 * - Accessible mobile menu and aria attributes
 *
 * Drop this file in place of your previous Navbar component.
 */

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pricing", href: "/pricing" }, // replaced /insights -> /pricing
    { label: "About", href: "/about" },
  ];

  interface AuthLink {
    label: string;
    href: string;
    onClick?: () => void | Promise<void>;
  }

  const authLinks: AuthLink[] = session
    ? [
        {
          label: "Log Out",
          href: "#",
          onClick: async () => {
            // ensure menu closes and then sign out
            setMenuOpen(false);
            try {
              await signOut({ callbackUrl: "/" });
            } catch {
              // ignore
            }
          },
        },
      ]
    : [
        { label: "Log In", href: "/login" },
        { label: "Get Started", href: "/signup" },
      ];

  const toggleTheme = () => {
    if (!mounted) return;
    setTheme(theme === "light" ? "dark" : "light");
  };

  const isActive = (href: string) => pathname === href;

  const profileInitial = (
    session?.user?.name?.trim()?.charAt(0) ??
    session?.user?.email?.trim()?.charAt(0) ??
    "U"
  ).toUpperCase();

  return (
    <header
      className="w-full px-6 py-3 sticky top-0 z-50 backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <img src="/tradia-logo.svg" alt="Tradia" className="h-8 w-auto" />
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-gray-900 dark:text-white">Tradia</div>
              <div className="text-xs text-gray-500 dark:text-gray-300 -mt-1">AI Trading Performance</div>
            </div>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <ul className="flex items-center gap-6">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`text-sm font-medium ${
                    isActive(href)
                      ? "text-indigo-500 dark:text-indigo-300"
                      : "text-gray-700 dark:text-gray-300"
                  } hover:underline`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4 ml-4">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-md hover:bg-white/5 transition text-gray-700 dark:text-gray-300"
            >
              {mounted && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Auth links */}
            {authLinks.map(({ label, href, onClick }) => {
              const isCta = label === "Get Started";
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={(e) => {
                    if (onClick) {
                      e.preventDefault();
                      onClick();
                    }
                  }}
                  className={`text-sm font-medium px-3 py-1 rounded-md ${
                    isCta
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "text-gray-700 dark:text-gray-300 hover:underline"
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            {/* Profile pill */}
            {session && (
              <Link
                href="/dashboard"
                className="ml-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-zinc-800 border border-white/6 shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-semibold text-white">
                  {profileInitial}
                </div>
                <span className="text-sm text-gray-800 dark:text-gray-100 hidden sm:inline">
                  {session.user?.name ?? session.user?.email ?? "User"}
                </span>
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile: right controls */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-md text-gray-700 dark:text-gray-300"
          >
            {mounted && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setMenuOpen((s) => !s)}
            aria-label="Open menu"
            className="p-2 rounded-md text-gray-700 dark:text-gray-300"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="md:hidden mt-3 w-full bg-white dark:bg-zinc-900 border-t border-white/6 shadow-lg"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col gap-3">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`text-base ${
                  isActive(href)
                    ? "text-indigo-500 dark:text-indigo-300 font-semibold"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="flex flex-col gap-2 pt-2">
              {authLinks.map(({ label, href, onClick }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={(e) => {
                    setMenuOpen(false);
                    if (onClick) {
                      e.preventDefault();
                      onClick();
                    }
                  }}
                  className={`text-base px-3 py-2 rounded-md ${
                    label === "Get Started"
                      ? "bg-indigo-600 text-white text-center"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {label}
                </Link>
              ))}

              {session && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut().catch(() => {});
                  }}
                  className="w-full text-left flex items-center gap-2 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md hover:bg-white/5"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
