# Account Selector in Trade History Implementation

## Overview
This implementation adds account management capabilities directly to the Trade History page, allowing users to:
- View and switch between trading accounts
- Create new accounts with quick navigation
- Edit and delete accounts from the selector
- Filter trades by selected account
- Pass account size to Tradia AI for context-aware responses

## Changes Made

### 1. **Frontend Components**

#### `src/components/dashboard/TradeHistoryTable.tsx`
- **Added "Add Account" button** (line 627-635)
  - Positioned before other action buttons
  - Navigates to `/dashboard/accounts/add` for creating new accounts
  - Styled with blue background for visibility

- **Account filtering logic already present** (lines 278-284)
  - Filters trades by `selectedAccount.id`
  - Includes trades without account_id for backward compatibility
  - Updates automatically when account selection changes

#### `src/components/accounts/AccountSelector.tsx` (Completely rewritten)
- **Enhanced dropdown menu** with action buttons
  - Edit button (pencil icon) - navigates to `/dashboard/accounts/edit/{id}`
  - Delete button (trash icon) - only visible if user has multiple accounts
  - Buttons appear on hover for clean UI

- **Delete confirmation modal**
  - Prevents accidental deletion
  - Shows warning about permanent action
  - Prevents deletion if it's the only account

- **Improved styling**
  - Group hover effects for action buttons
  - Visual indicator for selected account
  - Better visual feedback on account selection

### 2. **Backend API Updates**

#### `app/api/trades/route.ts` (POST endpoint)
- Added `account_id` field to trade creation (line 71)
- Accepts both `account_id` and `accountId` for flexibility
- Stores account_id in the database

#### `app/api/trades/route.ts` (PATCH endpoint)
- Added ability to update `account_id` field (lines 192-193)
- Supports both `account_id` and `accountId` parameters

#### `app/api/trades/batch/route.ts`
- Added `account_id` to batch trade imports (line 149)
- Properly maps snake_case and camelCase variations

### 3. **API Endpoint Enhancements**

#### `app/api/tradia/ai/route.ts`
- **Enhanced system message** (line 65)
  - Added "Account Size" to account snapshot
  - Shows formatted account size in AI context

- **Updated getAccountSummary function** (lines 479-553)
  - Fetches trading accounts from database
  - Calculates total account size across all accounts
  - Returns `accountSize` in the summary object
  - Gracefully handles missing account data

- **Updated SystemMessageInput interface** (line 38)
  - Added optional `accountSize` property for type safety

### 4. **Data Model Updates**

#### `src/types/trade.ts`
- Added `account_id` field (line 13)
- Added `accountId` field for camelCase compatibility (line 14)
- Maintains backward compatibility with existing trades

#### `src/context/TradeContext.tsx`
- Updated `transformTradeForBackend` function (line 126)
- Includes account_id in trade transformation
- Supports both `account_id` and `accountId` formats

### 5. **Page Integration**

#### `app/dashboard/trades/add/page.tsx`
- Integrated `useAccount` hook to access selected account
- Automatically attaches `account_id` when creating trades
- Selected account is automatically passed with each new trade

## Workflow

### Adding a New Trade with Account Selection
1. User navigates to Trade History page
2. Selects desired account from AccountSelector dropdown
3. Clicks "Add Account" button to create a new account (if needed)
4. Clicks "Add Trade" to add a new trade
5. New trade is automatically associated with the selected account

### Managing Accounts from Trade History
1. User clicks account selector dropdown
2. Hovers over an account to reveal edit/delete buttons
3. Click edit (pencil) to modify account details
4. Click delete (trash) to remove account (with confirmation)
5. New account is available in the selector immediately

### Account Size in AI Context
1. When user sends a message to Tradia AI
2. AI receives updated account snapshot including account size
3. AI uses account size for better adaptive responses
4. Examples:
   - Risk management recommendations based on account size
   - Position sizing advice
   - Growth trajectory analysis

## Database Requirements
The `trades` table must have an `account_id` column (already exists):
```sql
ALTER TABLE trades ADD COLUMN account_id UUID REFERENCES trading_accounts(id);
```

## Features Enabled

### For Users
- ✅ Quick account selection from trade history
- ✅ Create accounts directly from trade history
- ✅ Edit account details inline
- ✅ Delete accounts with confirmation
- ✅ Switch between accounts to view separate trade histories
- ✅ Account size data visible in account selector

### For AI
- ✅ Account size context for adaptive responses
- ✅ Better risk management recommendations
- ✅ Context-aware position sizing advice
- ✅ More accurate performance analysis

## Backward Compatibility
- Trades without `account_id` are still displayed (included in trade history)
- Existing API calls continue to work without account_id
- Account filtering is optional - no changes required for existing trades

## Error Handling
- Graceful fallback if account data is unavailable
- Account deletion prevented if it's the only account
- Trade filtering updates automatically on account selection
- Proper error notifications for user actions

## Next Steps (Optional)
- Add bulk account switching option
- Add account statistics page
- Add account performance comparison charts
- Add account-specific trade analysis in AI
