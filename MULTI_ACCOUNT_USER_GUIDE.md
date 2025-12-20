# Multi-Account Trading System - User Guide

## 📖 Introduction

The Multi-Account Trading System allows you to manage multiple trading accounts in one place. Whether you trade with a personal account, a prop firm account, or multiple brokers, Tradia can help you track all your accounts and trades in organized way.

### Key Benefits

✨ **Organize Your Trading** - Keep trades from different accounts separate and organized
📊 **Track Multiple Accounts** - Manage up to 10 trading accounts simultaneously
💰 **Account-Specific Analytics** - Get detailed stats for each account individually
🔄 **Easy Switching** - Switch between accounts with a single click
📈 **Performance Comparison** - Compare performance across different accounts

---

## 🚀 Getting Started

### Step 1: Create Your First Account

1. **Navigate to Accounts**
   - Go to Dashboard → Accounts
   - Or click the **Accounts** link in the sidebar

2. **Click "New Account"**
   - A form will appear with fields to fill

3. **Fill in Account Details**
   ```
   Account Name:      "Personal Account"
   Account Size:      10,000
   Currency:          USD
   Platform:          MT5
   Broker:            XM (optional)
   Mode:              Manual Entry
   ```

4. **Click "Create Account"**
   - Your account is now created and ready to use!

### Step 2: Add Trades to Your Account

1. **Go to Trade History**
   - Click Dashboard → Trade History

2. **Select Your Account**
   - Use the dropdown at the top
   - Choose the account you want to add trades to

3. **Add Trades**
   - Click "Add Trade" to manually enter a trade
   - Or click "Import" to upload a CSV file
   - All trades will be linked to your selected account

### Step 3: Switch Between Accounts

1. **Use the Account Selector**
   - Located in the Trade History toolbar
   - Click the dropdown to see all accounts

2. **Select Different Account**
   - Click the account you want to switch to
   - The view updates to show trades for that account

---

## 📱 Account Management Interface

### Accounts Page Overview

```
┌─────────────────────────────────────────────────────────┐
│ 🎯 Trading Accounts                 [+ New Account]     │
│ Manage your trading accounts and balances               │
│                                                         │
│ Total: 3 | Active: 3 | Balance: $45,000 | Trades: 152 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Personal Account │  │ Prop Firm Acc.   │            │
│  │ MT5              │  │ cTrader          │            │
│  │ $10,000 USD ✓    │  │ $20,000 USD ✓    │            │
│  │ [Edit] [Delete]  │  │ [Edit] [Delete]  │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  ┌──────────────────┐                                  │
│  │ Demo Account     │                                  │
│  │ Manual           │                                  │
│  │ $15,000 USD ✓    │                                  │
│  │ [Edit] [Delete]  │                                  │
│  └──────────────────┘                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Account Card Details

Each account shows:
- **Account Name** - Your account label
- **Platform** - MT5, MT4, cTrader, or Manual
- **Balance** - Current account size in selected currency
- **Status** - Active (green) or Inactive (gray)
- **Actions** - Edit or Delete buttons

---

## 🔧 Creating Different Account Types

### Type 1: Personal Trading Account

```
Account Name:        My Personal Account
Account Size:        $25,000
Currency:            USD
Platform:            MT5
Broker:              FxPro
Mode:                Manual Entry
```

**Use Case**: Personal trading with your broker
**Best For**: Individual traders managing their own money

### Type 2: Prop Firm Account

```
Account Name:        Prop Firm - ABC Trading
Account Size:        $50,000
Currency:            USD
Platform:            cTrader
Broker:              ABC Trading (Prop)
Mode:                Manual Entry
```

**Use Case**: Trading challenge or prop firm account
**Best For**: Prop traders managing multiple proprietary accounts

### Type 3: Demo/Practice Account

```
Account Name:        Demo Account
Account Size:        $10,000
Currency:            USD
Platform:            MT5
Broker:              Practice Demo
Mode:                Manual Entry
```

**Use Case**: Learning and practice trades
**Best For**: Traders testing strategies before live trading

### Type 4: Multi-Currency Account

```
Account Name:        International Trading
Account Size:        €8,500
Currency:            EUR
Platform:            MT4
Broker:              Interactive Brokers
Mode:                Manual Entry
```

**Use Case**: Trading in different currency pairs
**Best For**: Traders with international brokers

---

## 📊 Understanding Account Statistics

When you create or manage accounts, Tradia automatically tracks:

| Metric | Description |
|--------|-------------|
| **Total Accounts** | How many accounts you have created |
| **Active Accounts** | Accounts currently active (for trading) |
| **Total Balance** | Sum of all account sizes |
| **Total Trades** | Total trades across all accounts |
| **Account-Specific Trades** | Trades in currently selected account |
| **Account PnL** | Profit/Loss for selected account |
| **Win Rate** | Winning trades % for selected account |

---

## 🎯 Trading Workflow with Multiple Accounts

### Workflow Example: 3-Account Trader

**Day 1: Personal Account**
```
1. Go to Trade History
2. Click Account Selector → "Personal Account"
3. Take 3 EURUSD trades
4. All trades saved to Personal Account
```

**Day 2: Prop Firm Account**
```
1. Go to Trade History
2. Click Account Selector → "Prop Firm - ABC"
3. Take 2 GBPUSD trades
4. Import 5 historical trades via CSV
5. All trades saved to Prop Firm Account
```

**Day 3: Analysis**
```
1. Personal Account view: 3 trades, 67% win rate, +$450 PnL
2. Prop Firm Account view: 7 trades, 71% win rate, +$1,200 PnL
3. Compare performance between accounts
```

---

## 🔄 Managing Your Accounts

### Editing an Account

1. Go to Accounts page
2. Click **[Edit]** button on the account card
3. Update any fields:
   - Account name
   - Account size (update your current balance)
   - Status (Active/Inactive)
4. Click **Save**

### Updating Account Balance

1. Open the account you want to update
2. Click **[Edit]**
3. Change the "Account Size" field to your current balance
4. Click **Save**

**Example**: If you made $500 profit:
- Old Account Size: $10,000
- New Account Size: $10,500

### Deactivating an Account

1. Click **[Edit]** on the account
2. Uncheck "Active" status
3. The account is hidden from dropdowns but trades are preserved

### Deleting an Account

1. Click **[Delete]** on the account card
2. Confirm deletion
3. All associated trades are kept (only account deleted)
4. Cannot delete if it's your last account

---

## 💡 Best Practices

### 1. Naming Conventions

Use clear, descriptive account names:
```
✅ Good:
- Personal Account - XM
- Prop Firm Account (ABC Trading)
- Demo Account - Practice

❌ Avoid:
- Account 1
- Temp
- Test
```

### 2. Account Size Updates

Keep your account size current:
```
Update after:
- Deposit/Withdrawal
- Monthly profit/loss
- Account reset
```

### 3. Platform Selection

Choose the correct platform:
```
MT5:       Most common, good for most brokers
MT4:       Older version, some brokers only
cTrader:   Popular alternative, modern UI
Manual:    When you enter trades manually
```

### 4. Currency Management

```
Be consistent:
- One USD account = all USD trades
- One EUR account = all EUR trades
- Simplifies PnL calculation
```

### 5. Account Organization

```
For Multiple Accounts:
1. One personal account
2. One practice/demo account
3. One per broker (if you use multiple)
4. One for specific strategies
```

---

## ⚠️ Important Notes

### Account Limits

- **Maximum Accounts**: 10 per user
- **Minimum Account Size**: $1 (but realistic minimum is $100)
- **Account Name**: Must be unique per user
- **Supported Currencies**: USD, EUR, GBP, JPY, AUD, CAD

### Data & Privacy

- ✅ All accounts are private to your user account
- ✅ Accounts cannot be shared with other users
- ✅ Deleting an account keeps all associated trades
- ✅ Account data is encrypted in transit (HTTPS)

### Backing Up

- Regularly export your trades as CSV
- Save backups of important account data
- Account balance updates are saved automatically

---

## 🆘 Troubleshooting

### Problem: I don't see the Account Selector

**Solution**:
1. Create at least one account first
2. Go to Accounts page to create one
3. Then go to Trade History
4. The selector should now appear

### Problem: Trades aren't linking to my account

**Solution**:
1. Make sure you selected an account
2. Check the account status is "Active"
3. Verify account_id is included in the trade
4. Try creating a new trade to test

### Problem: I hit the account limit

**Solution**:
1. Delete or archive accounts you don't need
2. Merge trades from similar accounts
3. Contact support if you need more accounts

### Problem: Account balance seems wrong

**Solution**:
1. Recalculate: Current Balance = Initial + Trades PnL
2. Update account size with current balance
3. Check all trades are linked to correct account
4. Export data to verify manually

### Problem: Can't delete an account

**Solution**:
1. Delete all trades in that account first
2. Or keep the account and just deactivate it
3. Contact support if you need force deletion

---

## 📞 Getting Help

### Frequently Asked Questions

**Q: Can I transfer trades between accounts?**
A: Not yet, but it's coming soon. For now, you can export/reimport.

**Q: What happens if I delete an account?**
A: The account is deleted but all trades are preserved and can be reassigned.

**Q: Can I have the same account name?**
A: No, each account must have a unique name per user.

**Q: Can I merge two accounts?**
A: Not automatically, but you can manually reassign trades.

**Q: Will my account balance update automatically?**
A: No, you need to manually update it. Broker-linked sync is coming soon.

### Contact Support

- Email: support@tradiaai.app
- Chat: Available in the app
- Docs: See MULTI_ACCOUNT_QUICK_START.md

---

## 🎓 Learning Resources

### Video Tutorials (Coming Soon)
- Setting up your first account
- Switching between accounts
- Importing trades to specific accounts
- Analyzing account performance

### Related Topics
- Adding trades manually
- Importing trades via CSV
- Analyzing trade performance
- Setting up alerts

---

## 📋 Checklist: Your First Account

Use this checklist to set up your first multi-account trading environment:

- [ ] Go to Dashboard → Accounts
- [ ] Click "New Account"
- [ ] Enter account name (e.g., "Personal Account")
- [ ] Enter current account balance
- [ ] Select currency
- [ ] Select trading platform
- [ ] Enter broker name (optional)
- [ ] Select Manual or Broker-linked mode
- [ ] Click "Create Account"
- [ ] Go to Trade History
- [ ] Verify account appears in selector
- [ ] Add your first trade
- [ ] Verify trade linked to account
- [ ] Create second account
- [ ] Practice switching between accounts

---

**Version**: 1.0
**Last Updated**: December 2024
**For Support**: contact support@tradiaai.app
