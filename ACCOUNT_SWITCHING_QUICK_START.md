# Account Switching System - Quick Start Guide

## What Was Implemented

A complete multi-account management system that allows users to seamlessly switch between trading accounts and have all data automatically sync across the entire dashboard.

## For Users

### How to Use

1. **Navigate to Dashboard Overview**
   - Go to `/dashboard`
   - You'll see the Account Switcher at the top (below the title)

2. **Switch Accounts**
   - Click the dropdown showing your current account
   - Select a different account from the list
   - All data updates instantly

3. **Your Account is Remembered**
   - Selected account persists when you reload the page
   - Even after closing the browser, your selection is saved

4. **Manage Accounts**
   - Click the dropdown to see options
   - Edit icon: Modify account details
   - Delete icon: Remove an account (confirmation required)
   - "Add New Account" button: Create another trading account

## What Syncs

When you switch accounts, everything updates:
- ✅ Overview cards (win rate, total profit, etc.)
- ✅ All charts and graphs
- ✅ Trade history
- ✅ Trade journal
- ✅ Trade analytics
- ✅ Risk metrics
- ✅ Tradia AI context (reads from selected account)
- ✅ All other dashboard features

## For Developers

### Key Files

1. **New Component**: `src/components/dashboard/AccountSwitcher.tsx`
   - Beautiful dropdown UI for account selection
   - Full light/dark mode support
   - Mobile responsive

2. **Enhanced**: `src/context/TradeContext.tsx`
   - Added `accountFilteredTrades` property
   - Automatically filters trades by selected account
   - Backward compatible

3. **Updated**: `app/dashboard/page.tsx`
   - Imports AccountSwitcher
   - Uses account-filtered trades
   - AccountSwitcher appears on Overview tab

### How It Works

```javascript
// In TradeContext
const accountFilteredTrades = selectedAccount
  ? trades.filter(t => !t.account_id || t.account_id === selectedAccount.id)
  : trades;
```

The context automatically filters all trades whenever the selected account changes.

### Using Account Data in Components

```javascript
// In any component
const { accountFilteredTrades } = useTrade();
const { selectedAccount } = useAccount();

// accountFilteredTrades only contains trades from selectedAccount
// selectedAccount has: id, name, account_size, currency, platform, broker
```

## Important Notes

### Database Requirement
- Trades must have an `account_id` field (UUID)
- When creating trades, set `account_id` to `selectedAccount.id`
- Legacy trades without `account_id` show for all accounts

### Account ID Field
```sql
-- Trades table must have:
ALTER TABLE trades ADD COLUMN account_id UUID REFERENCES trading_accounts(id);
```

### API Integration
When creating trades:
```javascript
const newTrade = {
  ...tradeData,
  account_id: selectedAccount.id  // Critical!
};
```

## Testing

Quick way to test the system:

1. Create 2-3 trading accounts
2. Add trades to different accounts
3. Switch between accounts on the Overview page
4. Verify data changes for each account
5. Reload the page - account selection should persist
6. Check that all pages (history, analytics, journal) show correct account's data

## Performance

Current implementation:
- Uses client-side filtering with `Array.filter()`
- Efficient for <10,000 trades per user
- For larger datasets, consider database-level filtering

## Common Issues

### Account not switching?
- Check browser console for errors
- Verify AccountContext provider wraps the app
- Ensure `selectedAccount` is defined

### Data not updating?
- Verify trades have `account_id` set correctly
- Check account IDs match (UUID format)
- Clear browser cache and reload

### UI not visible?
- Confirm you're on the Overview tab
- Check AccountSwitcher import
- Verify Providers wrapper includes AccountProvider

## File Structure

```
Tradia/
├── src/
│   ├── components/
│   │   └── dashboard/
│   │       └── AccountSwitcher.tsx (NEW)
│   └── context/
│       └── TradeContext.tsx (ENHANCED)
├── app/
│   └── dashboard/
│       └── page.tsx (UPDATED)
├── ACCOUNT_SWITCHING_SYSTEM.md (Full documentation)
└── ACCOUNT_SWITCHING_QUICK_START.md (This file)
```

## Next Steps

1. Ensure all trades have `account_id` populated
2. Test with multiple accounts
3. Verify data syncs across all dashboard pages
4. Monitor console for any errors
5. Consider adding account-specific settings/preferences

## Support

Refer to `ACCOUNT_SWITCHING_SYSTEM.md` for:
- Detailed architecture explanation
- Complete troubleshooting guide
- Future enhancement ideas
- Component documentation
- Technical deep dives
