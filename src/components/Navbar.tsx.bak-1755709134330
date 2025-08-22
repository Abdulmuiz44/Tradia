/* src/components/Navbar.tsx */

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";

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
    { label: "Insights", href: "/insights" },
    { label: "About", href: "/about" },
  ];

  const authLinks = session
    ? [
        { label: "Log Out", href: "#", onClick: () => signOut() },
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

  return (
    <header className="w-full px-6 py-4 shadow-md bg-white dark:bg-gray-900 flex items-center justify-between sticky top-0 z-50">
      <div className="text-xl font-bold text-gray-900 dark:text-white">
        Tradia
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex space-x-6 items-center">
        {navLinks.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className={`text-sm ${
              isActive(href)
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-gray-700 dark:text-gray-300"
            } hover:underline`}
          >
            {label}
          </Link>
        ))}

        {authLinks.map(({ label, href, onClick }) => (
          <Link
            key={label}
            href={href}
            onClick={onClick}
            className="text-sm text-gray-700 dark:text-gray-300 hover:underline"
          >
            {label}
          </Link>
        ))}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="ml-4 text-gray-700 dark:text-gray-300"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Profile */}
        {session && (
          <Link href="/dashboard" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <div className="rounded-full w-8 h-8 bg-gray-500 flex items-center justify-center text-white text-xs">
              {session.user?.name?.[0] ?? "U"}
            </div>
            <span className="ml-2">{session.user?.name ?? "User"}</span>
          </Link>
        )}
      </nav>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-gray-700 dark:text-gray-300"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Menu size={24} />
      </button>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white dark:bg-gray-900 shadow-lg flex flex-col space-y-4 px-6 py-4 md:hidden animate-slide-in-down">
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`text-sm ${
                isActive(href)
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-700 dark:text-gray-300"
              } hover:underline`}
            >
              {label}
            </Link>
          ))}

          {authLinks.map(({ label, href, onClick }) => (
            <Link
              key={label}
              href={href}
              onClick={(e) => {
                setMenuOpen(false);
                onClick?.();
              }}
              className="text-sm text-gray-700 dark:text-gray-300 hover:underline"
            >
              {label}
            </Link>
          ))}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-gray-700 dark:text-gray-300 flex items-center space-x-2"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      )}
    </header>
  );
}
