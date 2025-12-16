# Import Trades Button - Location & Status

## Button Location

The **Import Trades** button is located in `/dashboard/trade-history` page.

### Visual Layout:

```
┌─────────────────────────────────────────────────────────┐
│                   Trade History Page                     │
│                                                          │
│  Header Section:                                        │
│  ├─ Avatar & Account Menu (Left)                        │
│  ├─ "Trade History" Title                               │
│  └─ Refresh Button (Right)                              │
│                                                          │
│  Stats Section:                                         │
│  ├─ Total Trades Card                                   │
│  ├─ Win Rate Card                                       │
│  ├─ Total P&L Card                                      │
│  └─ Avg RR Card                                         │
│                                                          │
│  ACTION BUTTONS SECTION:  ← IMPORT BUTTON HERE          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [+ Add Trade]  [↑ Import Trades]                │   │
│  │ (Blue Button)   (Green Button)                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Trade History Table:                                   │
│  ├─ Symbol | Direction | Entry | SL | TP | PnL...     │
│  └─ [List of trades]                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Code Location

**File**: `app/dashboard/trade-history/page.tsx`

**Lines 243-249**:
```tsx
<button
  onClick={() => router.push("/dashboard/trades/import")}
  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
>
  <Upload size={18} />
  Import Trades
</button>
```

## Button Details

| Property | Value |
|----------|-------|
| **Text** | "Import Trades" |
| **Icon** | Upload icon (↑) |
| **Color** | Green (bg-green-600) |
| **Hover Color** | Darker green (bg-green-700) |
| **Position** | Right of "Add Trade" button |
| **Location** | Top of Trade History page, action buttons area |
| **Navigation** | `/dashboard/trades/import` |

## How to Use

1. ✅ Go to `/dashboard/trade-history`
2. ✅ Look for the green **"Import Trades"** button next to the blue **"Add Trade"** button
3. ✅ Click it
4. ✅ You'll be redirected to `/dashboard/trades/import`

## If Button is Not Visible

If you don't see the "Import Trades" button, try:

1. **Clear browser cache** - Ctrl+Shift+Delete (Chrome)
2. **Hard refresh** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Check browser console** - F12 → Console tab for errors
4. **Check if logged in** - Must be authenticated
5. **Wait for page load** - Page might still be loading

## Alternative Routes

If the button doesn't work, you can also:
- **Direct URL**: Navigate directly to `/dashboard/trades/import`
- **Toolbar Icon**: Look for the small upload icon (📁+) in the trade history table toolbar (right side of filter button)

## Verification

The button is:
✅ Present in the code  
✅ Properly linked to `/dashboard/trades/import`  
✅ Styled with green color to stand out  
✅ Located prominently next to "Add Trade"  
✅ Responsive on mobile and desktop  

## Troubleshooting

### Button Not Responding
- Check if route `/dashboard/trades/import` exists ✅
- Check if router is initialized ✅
- Check network tab for any errors

### Button Not Visible
- Check CSS is loaded properly
- Check screen resolution (buttons might be stacked on mobile)
- Check if JavaScript is enabled

### Import Page Not Loading
- Check authentication status
- Check browser console for errors
- Verify `/dashboard/trades/import` page exists ✅

## Summary

The **Import Trades** button is working and available on the trade history page. It's the green button located right next to the blue "Add Trade" button in the action buttons section at the top of the page.

**Location**: `/dashboard/trade-history` → Look for green button with upload icon
**Action**: Click to go to `/dashboard/trades/import`
