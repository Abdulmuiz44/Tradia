# User Avatar & Upgrade Menu Implementation

## Overview
Added user avatar with dropdown menu in the sidebar footer that includes an "Upgrade Plan" button linking to the checkout page.

## Changes Made

### 1. **Desktop Sidebar Avatar Menu** (`app/dashboard/page.tsx`)
- **Location**: Lines 461-520
- **Components**:
  - User avatar with fallback initials
  - User name and email display
  - Current plan badge (Free/Pro/Plus/Elite)
  
- **Menu Items**:
  - Profile → `/dashboard/profile`
  - Settings → `/dashboard/settings`
  - **Upgrade Plan** → `/checkout` (conditionally shown, hidden for Elite users)
  - Sign Out

### 2. **Mobile Header Avatar Menu** (`app/dashboard/page.tsx`)
- **Location**: Lines 615-667
- **Same functionality** as desktop but positioned in the top header for mobile users
- **Responsive design**: Only visible on screens smaller than `lg` breakpoint

### 3. **Upgrade Button Styling**
```css
- Icon: Crown (lucide-react)
- Color: Amber (#b8860b for light, #amber-400 for dark)
- Separator: Top border to distinguish from other options
- Conditional: Only shows when user.plan !== 'elite'
```

### 4. **Icon Import**
Added `Crown` to imports from `lucide-react`:
```typescript
import {
  User,
  Settings,
  X,
  Menu,
  Sun,
  Filter,
  Lock,
  RefreshCw,
  Crown,  // ← NEW
} from "lucide-react";
```

## Features

✅ **User Avatar Display**
- Shows profile image or generates placeholder with user's initials
- Positioned at bottom of desktop sidebar
- Positioned in header on mobile

✅ **Dropdown Menu**
- Profile link
- Settings link
- Upgrade Plan button (with Crown icon)
- Sign Out button
- Current plan badge

✅ **Smart Upgrade Button**
- Only visible for Free/Pro/Plus plans
- Hidden for Elite users (who already have premium access)
- Routes to `/checkout` page for payment processing
- Amber/gold styling to stand out

✅ **Responsive Design**
- Desktop: Sidebar footer
- Mobile: Top header dropdown
- Same functionality across all screen sizes

## User Experience Flow

```
User clicks Avatar
    ↓
Dropdown opens showing:
  - Profile
  - Settings
  - [Upgrade Plan] ← NEW
  - Sign Out
    ↓
User clicks "Upgrade Plan"
    ↓
Navigates to /checkout page
    ↓
User selects plan & completes payment
```

## Technical Details

### Conditional Rendering
The Upgrade button only renders when:
```typescript
{(session?.user as any)?.plan !== 'elite' && (
  // Upgrade button JSX
)}
```

### Styling
- **Light Mode**: Amber text on hover white background
- **Dark Mode**: Amber text on dark amber background
- **Border**: Top separator for visual distinction
- **Icon**: Crown from Lucide React

### Checkout Flow
The button routes to `/checkout` which:
1. Detects current user plan
2. Shows available upgrade options
3. Processes payment via Flutterwave
4. Updates user plan on success

## Files Modified

1. `app/dashboard/page.tsx`
   - Added Crown icon import
   - Added Upgrade Plan button (desktop) - lines 512-520
   - Added Upgrade Plan button (mobile) - lines 659-667

## Testing Checklist

- [ ] Avatar displays correctly in desktop sidebar
- [ ] Avatar displays correctly in mobile header
- [ ] Dropdown menu opens on click
- [ ] Profile link works
- [ ] Settings link works
- [ ] Upgrade button only shows for non-Elite users
- [ ] Upgrade button navigates to `/checkout`
- [ ] Sign Out works correctly
- [ ] Styling is consistent across light/dark modes
- [ ] Responsive on all screen sizes

## Future Enhancements

- Add badge showing current plan status
- Show upgrade benefits preview on hover
- Analytics tracking for upgrade clicks
- A/B test button placement and wording
