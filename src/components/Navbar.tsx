
// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import AnimatedDropdown from "@/components/ui/AnimatedDropdown";

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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { data: session } = useSession();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pricing", href: "/pricing" }, // replaced /insights -> /pricing
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
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
      className="w-full px-6 py-3 sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#0b1220]/60 bg-white/80 dark:bg-[#0b1220]/80 border-b border-white/20 dark:border-white/10"
      aria-label="Main navigation"
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 no-underline" aria-label="Tradia Home">
            <img
              src="/Tradia-logo-ONLY.png"
              alt="Tradia"
              className="h-10 sm:h-12 w-auto select-none"
            />
            <div className="hidden sm:block">
              <div className="text-[12px] sm:text-sm text-gray-600 dark:text-gray-300 -mt-0.5 font-medium">
                AI Trading Performance
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <ul className="flex items-center gap-1">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                    isActive(href)
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
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
              className="p-2 rounded-md transition text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
            >
              {mounted && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {mounted && (
              <span
                className="hidden lg:inline-flex items-center px-2 py-1 rounded-md text-xs bg-white/10 dark:bg-zinc-800 border border-white/10 text-gray-700 dark:text-gray-300"
                title="Current theme"
              >
                Theme: {(resolvedTheme || theme || 'system').toString().replace(/^./, c => c.toUpperCase())}
              </span>
            )}

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
                  className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                    isCta
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            {/* Profile pill */}
            {session && <CoachPill />}
          </div>
        </nav>

        {/* Mobile: right controls */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {mounted && theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {mounted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 dark:bg-zinc-800 text-gray-700 dark:text-gray-300" title="Current theme">
              {(resolvedTheme || theme || 'system').toString()}
            </span>
          )}

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
          className="md:hidden mt-3 w-full backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-[#0b1220]/80 bg-white/90 dark:bg-[#0b1220]/90 border-t border-white/20 dark:border-white/10 shadow-lg"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col gap-3">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`text-base px-2 py-2 rounded-md transition-colors ${
                  isActive(href)
                    ? "text-indigo-600 dark:text-indigo-300 bg-indigo-500/10"
                    : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
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
                  className="w-full text-left flex items-center gap-2 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
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

function CoachPill() {
  const [points, setPoints] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/coach/points', { cache: 'no-store' });
        if (res.ok) { const j = await res.json(); setPoints(Number(j.points || 0)); }
      } catch {}
    })();
  }, []);
  const { data: session } = useSession();
  const profileInitial = (
    session?.user?.name?.trim()?.charAt(0) ??
    session?.user?.email?.trim()?.charAt(0) ??
    "U"
  ).toUpperCase();
  return (
    <AnimatedDropdown
      title="Account"
      positionClassName="right-4 top-16"
      panelClassName="w-[95%] max-w-sm"
      trigger={(
        <button className="ml-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-zinc-800 border border-white/10 shadow-sm" aria-label="Open account menu">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-semibold text-white">
            {profileInitial}
          </div>
          <span className="text-sm text-gray-800 dark:text-gray-100 hidden sm:inline">
            {session?.user?.name ?? session?.user?.email ?? "User"}
          </span>
          {points !== null && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              Pts: {points}
            </span>
          )}
        </button>
      )}
    >
      <div className="p-2">
        <Link href="/dashboard/profile" className="block px-3 py-2 hover:bg-zinc-700 rounded">
          Profile
        </Link>
        <Link href="/dashboard/settings" className="block px-3 py-2 hover:bg-zinc-700 rounded">
          Settings
        </Link>
        <button
          onClick={() => {
            signOut({ callbackUrl: "/" }).catch(() => {});
          }}
          className="w-full text-left px-3 py-2 hover:bg-zinc-700 rounded text-red-400 hover:text-red-300"
        >
          Sign Out
        </button>
      </div>
    </AnimatedDropdown>
  );
}
