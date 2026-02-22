/**
 * TradiaLogo Component
 * 
 * Centralized component for displaying the Tradia logo throughout the app.
 * Simplified to a high-contrast Black/White SVG for a premium, minimal aesthetic.
 */

import React from "react";

interface TradiaLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  color?: "white" | "black" | "current";
}

const LOGO_SIZES = {
  xs: { width: 24, height: 24, className: "w-6 h-6" },
  sm: { width: 32, height: 32, className: "w-8 h-8" },
  md: { width: 48, height: 48, className: "w-12 h-12" },
  lg: { width: 64, height: 64, className: "w-16 h-16" },
  xl: { width: 96, height: 96, className: "w-24 h-24" },
};

export default function TradiaLogo({
  size = "md",
  className = "",
  color = "current",
}: TradiaLogoProps) {
  const logoSize = LOGO_SIZES[size];

  const fillClass = color === "white" ? "fill-white" : color === "black" ? "fill-black" : "fill-current";

  return (
    <svg
      width={logoSize.width}
      height={logoSize.height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${logoSize.className} ${fillClass} ${className} select-none`}
    >
      {/* High-contrast minimal "T" logo */}
      <rect width="100" height="100" rx="24" fill="currentColor" fillOpacity="0.05" />
      <path
        d="M25 35C25 32.2386 27.2386 30 30 30H70C72.7614 30 75 32.2386 75 35V42C75 44.7614 72.7614 47 70 47H55V70C55 72.7614 52.7614 75 50 75C47.2386 75 45 72.7614 45 70V47H30C27.2386 47 25 44.7614 25 42V35Z"
        fill="currentColor"
      />
    </svg>
  );
}
