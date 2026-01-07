# Trading Account Switching System - Implementation Guide

## Overview

Enhanced Tradia with a seamless multi-account management system that allows users to switch between trading accounts directly from the dashboard. All trading data synchronizes automatically across pages when accounts are switched.

## Key Features

### 1. **Account Switcher Component**
- **Location**: `/src/components/dashboard/AccountSwitcher.tsx`
- **Placement**: Overview page header (below title, above filters)
- **Features**:
  - Dropdown list of all user's trading accounts
  - Quick visual identification: Account name, platform, size, currency
  - Create new account button (if under account limit)
  - Edit account functionality
  - Delete account with confirmation modal
  - Current account indicator (blue dot)
  - Light/dark mode support
  - Responsive design for mobile and desktop

### 2. **Data Sync Architecture**

#### Account Context (`src/context/AccountContext.tsx`)
- Manages global account state
- Handles account selection persistence (localStorage)
- Provides `selectedAccount` to entire app
- Auto-selects first active account on mount

#### Trade Context (`src/context/TradeContext.tsx`) - Enhanced
- New property: `accountFilteredTrades`
- Automatically filters all trades by selected account ID
- Maintains backward compatibility with existing code
- Exports both:
  - `trades`: All user trades (unfiltered)
  - `accountFilteredTrades`: Trades for selected account only

#### Dashboard Page (`app/dashboard/page.tsx`) - Updated
- Imports and uses `selectedAccount` from AccountContext
- Uses `accountFilteredTrades` for all calculations
- All date filtering, analytics, and metrics now work per-account
- Account switcher appears only on Overview tab

### 3. **Data Flow Diagram**

```
User Switches Account
    ↓
AccountContext.selectAccount(accountId) called
    ↓
selectedAccount state updated
    ↓
localStorage["selectedAccountId"] = accountId
    ↓
TradeContext recalculates accountFilteredTrades
    ↓
filteredTrades useMemo recomputes with new data
    ↓
All components re-render with new account's data:
  - OverviewCards (metrics update)
  - TradeHistoryTable (trades list)
  - TradeAnalytics (charts & stats)
  - RiskMetrics (risk calculations)
  - TradeJournal (journals)
  - RiskGuard (risk monitoring)
  - Tradia AI context (uses selected account ID)
```

## Files Modified

### 1. **Created**
- `src/components/dashboard/AccountSwitcher.tsx` - New account switcher component

### 2. **Modified**
- `src/context/TradeContext.tsx`
  - Added `accountFilteredTrades` to interface
  - Added account filtering logic
  - Uses `useAccount()` hook
  
- `app/dashboard/page.tsx`
  - Imported `AccountSwitcher`
  - Imported `useAccount()`
  - Added `accountFilteredTrades` to useTrade hook
  - Added `selectedAccount` from useAccount
  - Updated `filteredTrades` to use `accountFilteredTrades`
  - Added AccountSwitcher to overview tab header

## How It Works

### Switching Accounts

1. User clicks the AccountSwitcher dropdown on Overview page
2. User selects a different trading account
3. `selectAccount(accountId)` is called in AccountContext
4. Selected account is stored in localStorage for persistence
5. `accountFilteredTrades` automatically recalculates
6. All dependent components re-render with new account's data

### Account Selection Persistence

- Selected account ID is saved to `localStorage["selectedAccountId"]`
- On app reload, the previous account is automatically re-selected
- Falls back to first active account if saved ID not found

### Data Filtering Logic

```javascript
// In TradeContext
const accountFilteredTrades = selectedAccount
  ? trades.filter(t => !t.account_id || t.account_id === selectedAccount.id)
  : trades;
```

This filters:
- Trades with matching `account_id`
- Legacy trades without `account_id` (backward compatible)
- If no account selected, returns all trades

## Components That Sync

All these components automatically update when account is switched:

### On Overview Tab (When AccountSwitcher visible)
- **OverviewCards** - Summary statistics
  - Win rate
  - Win/loss counts
  - Total profit/loss
  - ROI
  - Account balance

- **OverviewCards** (Charts)
  - Profit/loss breakdown
  - Performance timeline
  - Trade behavioral analysis
  - Trade pattern analysis

### On Other Tabs (Account-aware)
- **TradeHistoryTable** (`/dashboard/trade-history`)
- **TradeJournal** (`/dashboard/trade-journal`)
- **TradeAnalytics** (`/dashboard/trade-analytics`)
- **RiskMetrics** (`/dashboard/risk-management`)
- **Tradia AI Chat** (`/dashboard/trades/chat`)
  - Uses `selectedAccount.id` for AI context
- **Position Sizing** (`/dashboard/position-sizing`)
- **Trade Education** (`/dashboard/trade-education`)
- **Trade Planner** (`/dashboard/trade-planner`)

## Styling

### Light Mode
- White background
- Dark text
- Gray borders
- Light hover states

### Dark Mode
- Dark background (#0f1319)
- Light text
- Subtle borders
- Dark hover states

Both modes fully styled in `AccountSwitcher.tsx`

## User Experience Flow

```
1. User lands on dashboard
2. AccountContext loads their accounts from database
3. First active account (or first account) auto-selected
4. On Overview tab, AccountSwitcher appears below title
5. User can:
   - See current account details
   - Click to open dropdown
   - Select different account
   - Create new account
   - Edit current account
   - Delete account (with confirmation)
6. When switching:
   - Account info updates at top
   - All charts/tables update instantly
   - Filter shows "[Account Name]" in filter label
   - Data persists across navigation
   - Account stays selected on page reload
```

## Technical Details

### Account ID Field
- Trades must have `account_id` field set when created
- When adding a trade via API, include the `selectedAccount.id`
- Legacy trades without `account_id` are shown for all accounts (backward compatible)

### API Considerations
- Trade creation should validate account ownership
- Ensure user can only access their own accounts
- Consider adding account_id indexes for query performance

### Performance
- `accountFilteredTrades` uses `Array.filter()` - efficient for <10K trades
- For larger datasets, consider:
  - Database-level filtering in `fetchTrades()`
  - Pagination
  - Virtual scrolling in tables

## Testing Checklist

- [ ] Create multiple trading accounts
- [ ] Verify AccountSwitcher appears only on Overview tab
- [ ] Switch accounts and verify data updates
- [ ] Verify account persists after page reload
- [ ] Verify account persists after full app reload
- [ ] Test Edit account functionality
- [ ] Test Delete account with confirmation
- [ ] Verify charts update for new account
- [ ] Verify trade history updates per account
- [ ] Verify analytics recalculate per account
- [ ] Verify Tradia AI gets correct account context
- [ ] Test light mode styling
- [ ] Test dark mode styling
- [ ] Test mobile responsive design
- [ ] Verify no errors in console

## Future Enhancements

1. **Account Specific Settings**
   - Risk limits per account
   - Strategy preferences per account
   - Platform-specific settings

2. **Multi-Account Dashboard**
   - Side-by-side account comparison
   - Consolidated metrics across accounts
   - Individual account performance vs portfolio

3. **Account Switching Shortcuts**
   - Keyboard shortcuts (Alt+1, Alt+2, etc.)
   - Recent accounts list
   - Favorites/starred accounts

4. **Account Analytics**
   - Account creation/modification history
   - Account performance over time
   - Account-specific alerts

5. **Advanced Filtering**
   - Filter trades across multiple accounts
   - Compare strategies across accounts
   - Cross-account correlation analysis

## Troubleshooting

### Account not switching
- Check browser console for errors
- Verify `selectedAccount` in React DevTools
- Check localStorage is not disabled
- Verify AccountContext provider wraps dashboard

### Data not updating
- Verify `accountFilteredTrades` is being used
- Check trade records have `account_id` set
- Verify account IDs match exactly (UUID format)
- Clear browser cache and reload

### UI not rendering
- Check for hydration issues in components
- Verify ClientOnly wrapper if needed
- Check dark mode provider is working
- Verify AccountSwitcher mount condition

## Support & Questions

For issues or questions about the account switching system:
1. Check this documentation first
2. Review error messages in browser console
3. Verify all prerequisites are met
4. Test with multiple accounts to isolate issues
