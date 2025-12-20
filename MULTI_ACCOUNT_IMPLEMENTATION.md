# Multi-Account Trading System Implementation Guide

## Overview

This document outlines the complete implementation of a multi-account trading system for Tradia, enabling users to manage multiple trading accounts (e.g., personal, prop firm) with account-specific trade tracking and analytics.

## Features Implemented

### 1. Account Management
- Create, read, update, and delete trading accounts
- Support for multiple accounts per user (max 10 accounts per user)
- Account metadata including:
  - Account name
  - Account size/balance
  - Currency (USD, EUR, GBP, JPY, AUD, CAD)
  - Trading platform (MT5, MT4, cTrader, Manual)
  - Broker information (optional)
  - Account mode (manual or broker-linked)

### 2. Account-Aware Trade Tracking
- All trades are now linked to a specific account via `account_id`
- Trades can be imported/added to specific accounts
- Trade statistics are calculated per account
- Account balance tracking and PnL calculation

### 3. User Interface Components
- **AccountManager**: Full account management UI with create/edit/delete functionality
- **AccountSelector**: Dropdown selector for switching between accounts
- **AccountForm**: Form component for creating new accounts with validation
- **Integration with TradeHistoryTable**: Account selector integrated into trade history view

### 4. Backend Architecture
- API routes for CRUD operations on accounts
- Database schema enhanced with `account_size` field
- Trade table updated with `account_id` foreign key
- Account statistics view for quick analytics

## Database Changes

### Migration: `enhance_trading_accounts.sql`

```sql
-- Adds account_size column to trading_accounts
ALTER TABLE trading_accounts 
ADD COLUMN IF NOT EXISTS account_size NUMERIC(14,2) DEFAULT 0;

-- Adds account_id to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE;

-- Creates account_statistics view for analytics
CREATE OR REPLACE VIEW account_statistics AS
SELECT 
  ta.id,
  ta.user_id,
  ta.name,
  ta.account_size,
  ta.platform,
  COUNT(DISTINCT t.id) as trade_count,
  COALESCE(SUM(t.pnl), 0) as total_pnl,
  MAX(t.close_time) as last_trade_date
FROM trading_accounts ta
LEFT JOIN trades t ON ta.id = t.account_id
WHERE ta.is_active = TRUE
GROUP BY ta.id, ta.user_id, ta.name, ta.account_size, ta.platform;
```

## File Structure

```
src/
├── types/
│   └── account.ts                    # Account interfaces and types
├── context/
│   └── AccountContext.tsx            # Account state management
├── components/
│   ├── accounts/
│   │   ├── AccountManager.tsx        # Main account management UI
│   │   ├── AccountForm.tsx           # Form for creating/editing accounts
│   │   └── AccountSelector.tsx       # Dropdown selector for accounts
│   └── dashboard/
│       └── TradeHistoryTable.tsx     # Updated with account selector
├── components/
│   └── Providers.tsx                 # Updated to include AccountProvider

app/
├── api/
│   └── accounts/
│       ├── route.ts                  # GET, POST for accounts
│       └── [id]/route.ts             # GET, PATCH, DELETE for individual accounts
└── dashboard/
    └── accounts/
        └── page.tsx                  # Accounts management page

database/
└── migrations/
    └── enhance_trading_accounts.sql  # Database schema updates
```

## Context API (AccountContext)

### Hooks and Methods

```typescript
useAccount() // Returns:
{
  accounts: TradingAccount[]           // List of all user's accounts
  selectedAccount: TradingAccount      // Currently selected account
  loading: boolean                     // Loading state
  stats: AccountStats                  // Aggregated account statistics
  selectAccount(accountId: string)     // Switch to account
  createAccount(payload)               // Create new account
  updateAccount(accountId, payload)    // Update account details
  deleteAccount(accountId)             // Delete account
  fetchAccounts()                      // Refresh accounts list
  refreshStats()                       // Recalculate statistics
}
```

## API Endpoints

### GET /api/accounts
Retrieve all accounts for the authenticated user
```json
Response: { data: TradingAccount[] }
```

### POST /api/accounts
Create a new trading account
```json
Request: {
  "name": "Personal Account",
  "account_size": 10000,
  "currency": "USD",
  "platform": "MT5",
  "broker": "XM"
}
Response: { data: TradingAccount }
```

### GET /api/accounts/[id]
Get a specific account
```json
Response: { data: TradingAccount }
```

### PATCH /api/accounts/[id]
Update account details
```json
Request: {
  "account_size": 15000,
  "is_active": true
}
Response: { data: TradingAccount }
```

### DELETE /api/accounts/[id]
Delete an account (only if no trades exist)
```json
Response: { message: "Account deleted" }
```

## Integration with Trade System

### Trade Model Enhancement
```typescript
interface Trade {
  id: string;
  user_id: string;
  account_id?: string;  // NEW: Link to trading_accounts
  symbol: string;
  // ... other trade fields
}
```

### Trade Filtering by Account
When a user selects an account:
1. Account ID is stored in context and localStorage
2. TradeHistoryTable can filter trades by selectedAccount.id
3. All trade operations (add, import, delete) are account-aware

## Usage Examples

### Creating an Account

```typescript
import { useAccount } from "@/context/AccountContext";

function CreateAccountExample() {
  const { createAccount } = useAccount();

  const handleCreate = async () => {
    const newAccount = await createAccount({
      name: "My Trading Account",
      account_size: 10000,
      currency: "USD",
      platform: "MT5",
      broker: "XM",
    });
  };

  return <button onClick={handleCreate}>Create Account</button>;
}
```

### Selecting an Account

```typescript
function SelectAccountExample() {
  const { selectedAccount, selectAccount, accounts } = useAccount();

  return (
    <select onChange={(e) => selectAccount(e.target.value)}>
      {accounts.map((acc) => (
        <option key={acc.id} value={acc.id}>
          {acc.name} - ${acc.account_size}
        </option>
      ))}
    </select>
  );
}
```

### Adding a Trade to Specific Account

```typescript
function AddTradeExample() {
  const { selectedAccount } = useAccount();
  const { addTrade } = useTrade();

  const handleAddTrade = () => {
    addTrade({
      symbol: "EURUSD",
      direction: "Buy",
      entryPrice: 1.0850,
      account_id: selectedAccount?.id,  // Link to account
      // ... other trade fields
    });
  };

  return <button onClick={handleAddTrade}>Add Trade</button>;
}
```

## Constants

- **MAX_ACCOUNTS**: 10 accounts per user (configurable in AccountContext.tsx line ~46)

## State Management

### localStorage Keys
- `selectedAccountId`: Stores the currently selected account ID for persistence across page reloads

### Auto-selection Logic
1. On app load, AccountContext fetches all accounts
2. If a previously selected account ID exists in localStorage, it's restored
3. Otherwise, the first active account is selected
4. If no accounts exist, null is selected

## Future Enhancements

1. **Account Performance Analytics**
   - Per-account dashboard with dedicated metrics
   - Account-specific performance charts
   - Comparative analysis between accounts

2. **Broker Integration**
   - Auto-sync trades from MT5/cTrader brokers
   - Real-time balance updates
   - Automated trade import

3. **Account Transfers**
   - Transfer trades between accounts
   - Account merging functionality

4. **Advanced Filtering**
   - Filter analytics by account
   - Multi-account comparison reports

5. **Account Limits**
   - Implement plan-based account limits (different for each subscription tier)
   - Account upgrade paths

## Error Handling

All API calls include proper error handling with user-friendly notifications:
- 401: Unauthorized (user not logged in)
- 400: Bad request (validation error)
- 403: Forbidden (account limit reached)
- 404: Not found (account doesn't exist)
- 500: Server error

## Testing Recommendations

1. **Account Creation**
   - Test creating accounts with various currencies and platforms
   - Test account limit enforcement (max 10)
   - Test unique account name constraint

2. **Account Switching**
   - Verify trades are filtered by selected account
   - Verify stats recalculate for selected account
   - Verify localStorage persistence

3. **Trade Management**
   - Verify new trades are linked to selected account
   - Verify imported trades respect account_id
   - Verify deletion respects account ownership

4. **Data Integrity**
   - Test cascading deletes when account is deleted
   - Verify orphaned trades are handled properly
   - Test unique constraint on (user_id, name)

## Migration Steps

To deploy this feature:

1. Run the database migration: `enhance_trading_accounts.sql`
2. Deploy code changes (context, components, API routes)
3. Update main Providers.tsx to include AccountProvider
4. Add navigation link to accounts page in dashboard sidebar
5. Test account creation and trade management

## Notes

- All account operations require authentication
- Accounts are scoped to user (user_id FK)
- Account deletion prevents if trades exist (data preservation)
- Account size can be updated to track balance changes
- All timestamps (created_at, updated_at) are managed by database

---

**Version**: 1.0
**Last Updated**: December 2024
**Author**: Tradia Development Team
