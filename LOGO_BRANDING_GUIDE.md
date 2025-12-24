# Tradia Logo & Branding Guidelines

## Overview
This document ensures that **ONLY TRADIA-LOGO.png** is used throughout the entire application. No other logos (Vercel, Next.js, etc.) should ever be visible to users.

## Logo Asset
- **File**: `/public/TRADIA-LOGO.png`
- **Purpose**: The sole branding asset for all Tradia touchpoints
- **Use**: Navigation, favicons, PWA icons, social media, all UI elements

## Implementation Strategy

### 1. Central Logo Component
All logo usage should go through the `TradiaLogo` component:

```tsx
import TradiaLogo from "@/components/TradiaLogo";

// In your component:
<TradiaLogo size="md" /> // Available sizes: xs, sm, md, lg, xl
<TradiaLogo size="lg" priority /> // Use priority for above-the-fold
```

### 2. Favicon & Browser Icons
✅ **IMPLEMENTED** in `app/layout.tsx`:
```tsx
<link rel="icon" href="/TRADIA-LOGO.png" type="image/png" sizes="any" />
<link rel="apple-touch-icon" href="/TRADIA-LOGO.png" sizes="180x180" />
```

### 3. PWA & Web App Manifest
✅ **IMPLEMENTED** in `public/manifest.json`:
- All app icons use `/TRADIA-LOGO.png`
- Shortcuts use `/TRADIA-LOGO.png`
- Screenshots reference Tradia content only

### 4. Header & Navigation
✅ **IMPLEMENTED** in `src/components/Navbar.tsx`:
- Uses `/TRADIA-LOGO.png` directly
- Or via `TradiaLogo` component for consistency

### 5. Dashboard & Sidebar
✅ **IMPLEMENTED** in `app/dashboard/page.tsx`:
- All logo references use `/TRADIA-LOGO.png`
- No external logos visible

## Removed Assets
The following assets are **NOT USED** anywhere in the application:
- `next.svg` - Next.js logo (removed from all files)
- `vercel.svg` - Vercel logo (removed from all files)
- `icon-192x192.png` - Generic icon
- `icon-512x512.png` - Generic icon
- `apple-touch-icon.png` - Generic icon

## Third-Party Analytics
⚠️ **Note**: The following libraries are used for analytics/monitoring (invisible to users):
- `@vercel/analytics` - Server-side analytics only, no UI
- `@vercel/speed-insights` - Performance monitoring only, no UI
- `PostHog` - Analytics tracking, no UI
- `Hector Analytics` - Activity tracking, no UI

These are **backend services** and **do not display any logos or branding** to users.

## Verification Checklist

### Browser Tab
- [ ] Browser tab icon shows only TRADIA-LOGO.png
- [ ] No Vercel, Next.js, or other logos visible

### Mobile Home Screen
- [ ] iOS home screen icon is TRADIA-LOGO.png
- [ ] Android home screen icon is TRADIA-LOGO.png

### Header/Navigation
- [ ] Logo in navbar is TRADIA-LOGO.png
- [ ] No other company logos visible
- [ ] Logo is clickable and goes to home

### Favicon
- [ ] Favicon is TRADIA-LOGO.png
- [ ] All favicon sizes use TRADIA-LOGO.png
- [ ] Shortcut icons use TRADIA-LOGO.png

### PWA Installation
- [ ] Installed app shows TRADIA-LOGO.png
- [ ] App manifest uses only TRADIA-LOGO.png
- [ ] Splash screen uses Tradia branding

### Footer & Emails
- [ ] Any email templates use TRADIA-LOGO.png
- [ ] Footer content branded as Tradia only
- [ ] No third-party logos visible

## Adding New Features

When adding new features that need logos/icons:

1. **Use the TradiaLogo component**:
   ```tsx
   import TradiaLogo from "@/components/TradiaLogo";
   <TradiaLogo size="lg" />
   ```

2. **OR reference the asset directly**:
   ```tsx
   import Image from "next/image";
   <Image src="/TRADIA-LOGO.png" alt="Tradia" width={48} height={48} />
   ```

3. **NEVER use**:
   - Other SVG files (next.svg, vercel.svg, etc.)
   - Other PNG files (icon-*.png, apple-touch-icon.png, etc.)
   - External brand logos

## Branding Colors
- **Primary Blue**: #3b82f6 (from tailwind)
- **Dark Background**: #0f0f23
- **Logo**: TRADIA-LOGO.png (all colors included)

## Files Modified (2025-12-24)
1. ✅ `app/layout.tsx` - Updated all favicon/icon references
2. ✅ `src/components/Navbar.tsx` - Updated navbar logo
3. ✅ `public/manifest.json` - Updated PWA icons
4. ✅ `src/components/TradiaLogo.tsx` - Created centralized logo component

## Support
For questions about branding or logo usage:
1. Check this guide
2. Use the `TradiaLogo` component
3. Always reference `/TRADIA-LOGO.png`
4. Never use other logos

---

**Status**: ✅ Fully Implemented  
**Last Updated**: 2025-12-24  
**Logo Asset**: `/public/TRADIA-LOGO.png`
