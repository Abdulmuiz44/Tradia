/**
 * TradiaLogo Component
 * 
 * Centralized component for displaying the Tradia logo throughout the app.
 * Ensures consistency and that ONLY TRADIA-LOGO.png is used everywhere.
 * 
 * Usage:
 * <TradiaLogo size="sm" /> // 32px
 * <TradiaLogo size="md" /> // 48px
 * <TradiaLogo size="lg" /> // 64px
 * <TradiaLogo size="xl" /> // 96px
 */

import Image from "next/image";
import React from "react";

interface TradiaLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
  alt?: string;
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
  priority = false,
  alt = "Tradia logo",
}: TradiaLogoProps) {
  const logoSize = LOGO_SIZES[size];

  return (
    <Image
      src="/TRADIA-LOGO.png"
      alt={alt}
      width={logoSize.width}
      height={logoSize.height}
      className={`select-none ${logoSize.className} ${className}`}
      priority={priority}
    />
  );
}
