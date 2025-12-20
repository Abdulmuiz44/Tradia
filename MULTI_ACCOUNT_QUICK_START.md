# Multi-Account Trading System - Quick Start Guide

## What's New?

Tradia now supports multiple trading accounts! Users can:
- Create up to 10 different trading accounts
- Track trades separately for each account
- Switch between accounts seamlessly
- Monitor account-specific statistics

## For Users

### Creating Your First Account

1. **Navigate** to `/dashboard/accounts`
2. Click **"New Account"** button
3. Fill in the form:
   - **Account Name**: e.g., "Personal Account", "Prop Firm Account"
   - **Account Size**: Your starting/current account balance
   - **Currency**: Select your account currency (USD, EUR, etc.)
   - **Platform**: Choose your trading platform (MT5, MT4, cTrader, Manual)
   - **Broker** (optional): Your broker name
   - **Mode**: Manual (enter trades manually) or Broker-linked (auto-sync coming soon)
4. Click **"Create Account"**

### Switching Between Accounts

1. Go to **Trade History** page
2. Use the **Account Selector** dropdown at the top
3. Select the account you want to work with
4. All trades shown will be for that account

### Adding Trades to an Account

1. Select the account from the dropdown in Trade History
2. Add or import trades as usual
3. Trades are automatically linked to the selected account
4. Switch accounts and add more trades

### Managing Accounts

1. Go to `/dashboard/accounts`
2. View all your accounts with:
   - Current account size
   - Platform information
   - Account status (Active/Inactive)
3. **Edit**: Update account details (coming soon)
4. **Delete**: Remove account (keeps associated trades)

## For Developers

### Key Files to Know

| File | Purpose |
|------|---------|
| `src/context/AccountContext.tsx` | State management for accounts |
| `src/types/account.ts` | TypeScript types for accounts |
| `app/api/accounts/route.ts` | GET/POST endpoints |
| `app/api/accounts/[id]/route.ts` | GET/PATCH/DELETE endpoints |
| `src/components/accounts/AccountManager.tsx` | Main UI component |
| `src/components/accounts/AccountSelector.tsx` | Account dropdown selector |
| `database/migrations/enhance_trading_accounts.sql` | Database schema changes |

### Integration Points

#### 1. Using AccountContext in Components

```typescript
import { useAccount } from "@/context/AccountContext";

export default function MyComponent() {
  const { 
    accounts,           // Array of all accounts
    selectedAccount,    // Currently selected account
    createAccount,      // Function to create new account
    selectAccount,      // Function to switch account
  } = useAccount();

  return (
    // Your component JSX
  );
}
```

#### 2. Accessing Selected Account in TradeContext

```typescript
import { useAccount } from "@/context/AccountContext";
import { useTrade } from "@/context/TradeContext";

export default function TradeManager() {
  const { selectedAccount } = useAccount();
  const { trades } = useTrade();

  // Filter trades for selected account if needed
  const accountTrades = trades.filter(
    t => t.account_id === selectedAccount?.id
  );

  return (
    // Show account-specific trades
  );
}
```

### Database Schema

New columns added to existing tables:

```sql
-- trading_accounts table
- account_size NUMERIC(14,2)    -- Current account balance

-- trades table
- account_id UUID               -- Foreign key to trading_accounts
```

View created:
```sql
account_statistics             -- Pre-calculated stats per account
```

### API Routes

All endpoints require authentication. Base path: `/api/accounts`

**GET /api/accounts**
```bash
curl -H "Authorization: Bearer token" \
  https://tradiaai.app/api/accounts
```

**POST /api/accounts**
```bash
curl -X POST \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trading Account",
    "account_size": 10000,
    "currency": "USD"
  }' \
  https://tradiaai.app/api/accounts
```

**PATCH /api/accounts/[id]**
```bash
curl -X PATCH \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{ "account_size": 15000 }' \
  https://tradiaai.app/api/accounts/[account-id]
```

**DELETE /api/accounts/[id]**
```bash
curl -X DELETE \
  -H "Authorization: Bearer token" \
  https://tradiaai.app/api/accounts/[account-id]
```

### Constants

- **MAX_ACCOUNTS**: 10 per user
- **Supported Currencies**: USD, EUR, GBP, JPY, AUD, CAD
- **Supported Platforms**: MT5, MetaTrader4, cTrader, Manual

Change MAX_ACCOUNTS in `src/context/AccountContext.tsx`:
```typescript
const MAX_ACCOUNTS = 10; // Line 46
```

### Testing Checklist

- [ ] Create account with all required fields
- [ ] Try to create 11th account (should fail)
- [ ] Switch between accounts
- [ ] Add trade to Account A, switch to Account B, add different trade
- [ ] Verify trades are separate per account
- [ ] Edit account details
- [ ] Delete account with no trades
- [ ] Try to delete account with trades
- [ ] Verify localStorage persists selected account
- [ ] Verify responsive design on mobile

## Common Issues & Solutions

### Issue: Accounts not loading
**Solution**: Ensure user is authenticated and AccountProvider is wrapping your app
```typescript
// In src/components/Providers.tsx
<AccountProvider>
  <TradeProvider>
    {children}
  </TradeProvider>
</AccountProvider>
```

### Issue: Trades not linked to account
**Solution**: Ensure selected account is available before adding trades
```typescript
const { selectedAccount } = useAccount();
if (!selectedAccount) {
  return <div>Select an account first</div>;
}
```

### Issue: AccountSelector not appearing
**Solution**: Verify accounts exist and AccountProvider is in the component tree
```typescript
const { accounts } = useAccount();
if (accounts.length === 0) {
  return <div>No accounts. Create one first.</div>;
}
```

## Next Steps

1. **Run Database Migration**
   ```bash
   # Apply enhance_trading_accounts.sql to your Supabase database
   ```

2. **Deploy Code**
   ```bash
   git add .
   git commit -m "feat: add multi-account trading system"
   git push
   ```

3. **Test in Development**
   - Create test accounts
   - Add trades to different accounts
   - Verify account switching works

4. **Monitor in Production**
   - Track account creation rates
   - Monitor API error rates
   - Gather user feedback

## Support

For issues or questions:
1. Check MULTI_ACCOUNT_IMPLEMENTATION.md for detailed docs
2. Review component source code
3. Check API route implementations
4. Test with curl commands above

---

**Created**: December 2024
**Status**: Production Ready
**Maintainer**: Tradia Dev Team
