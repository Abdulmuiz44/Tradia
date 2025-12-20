# Account Selector - User Guide

## Quick Navigation

### Accessing the Account Selector
1. Navigate to the **Trade History** page
2. Look for the **Account Selector** dropdown in the toolbar
3. The dropdown shows:
   - Selected account name
   - Account size and currency
   - Chevron indicator

### Switching Between Accounts
1. Click the account selector dropdown
2. View all your trading accounts
3. Click on an account to select it
4. The trade history table updates automatically
5. Only trades for that account are displayed

## Managing Accounts

### Creating a New Account
**Option 1: From Trade History Page**
- Click the **"Add Account"** button (blue button before other icons)
- You'll be taken to the account creation page
- Fill in account details:
  - Account name
  - Initial balance / Account size
  - Currency
  - Platform (MT5, etc.)
  - Broker name
- Click Save

**Option 2: From Account Selector**
- Click the account selector dropdown
- Click **"New Account"** at the bottom
- Same form as above

### Editing an Account
1. Click the account selector dropdown
2. Hover over the account you want to edit
3. Click the **pencil icon** (Edit button)
4. Update the account details
5. Click Save

### Deleting an Account
1. Click the account selector dropdown
2. Hover over the account you want to delete
3. Click the **trash icon** (Delete button)
4. Confirm the deletion in the modal
5. Account is removed (cannot be undone)

**Note:** You must have at least one account. Delete button only appears if you have multiple accounts.

## Trade Management with Accounts

### Adding Trades to an Account
1. Select your desired account from the account selector
2. Click **"Add Trade"** or navigate to the Add Trade page
3. The trade is automatically associated with the selected account
4. Fill in all trade details as usual

### Viewing Account-Specific Trades
1. Select the account from the account selector
2. The trade history table shows **only** trades from that account
3. All filters and sorting work on the account-filtered results
4. Statistics update based on selected account trades

### Backward Compatibility
- Old trades without an account assignment are still visible in all accounts
- New trades are automatically assigned to the selected account
- You can continue working as before

## Tradia AI Integration

### How Account Size Helps AI
When you chat with Tradia AI:
- Your account size is included in the analysis
- AI provides **better-adapted recommendations**
- Examples:
  - "Based on your $50k account, risking 2% means $1,000 per trade"
  - "For your account size, consider position sizing of..."
  - "Your current drawdown of $2,500 represents X% of your $50k account"

### Account Size Benefits
✅ Better risk management suggestions
✅ More personalized position sizing advice
✅ Improved performance analysis
✅ Context-aware growth recommendations

## Tips & Best Practices

### Account Organization
- **Create separate accounts for:**
  - Different trading strategies
  - Different brokers
  - Paper trading vs. live trading
  - Different account sizes

### Account Naming
- Use clear, descriptive names
- Examples:
  - "Main Live - EURUSD"
  - "Demo Account - Learning"
  - "Scalping - Small"
  - "Swing Trading - Large"

### Account Size Tracking
- Keep account size updated as your balance changes
- The AI uses this for all recommendations
- Update after major deposits/withdrawals
- Affects historical analysis accuracy

### Managing Multiple Accounts
- Switch accounts to view different trade histories
- Compare performance across accounts
- Each account has its own trade statistics
- Use AI to analyze specific account performance

## Troubleshooting

### Account Not Appearing in Selector
- Refresh the page
- Log out and log back in
- Check if account is marked as active

### Can't Delete Account
- You need at least one account
- Create a new account first, then delete the old one
- Or switch to a different account before deletion

### Trades Not Filtering by Account
- Refresh the page
- Verify account is selected (not grayed out)
- Check trade data includes account_id field

### AI Not Using Account Size
- Ensure your account has account_size set
- Update account size in account edit page
- Wait a moment for context to update
- Refresh page if needed

## Keyboard Shortcuts (If Available)
- None currently, but may be added in future updates

## Frequently Asked Questions

**Q: Can I have unlimited accounts?**
A: Account limits depend on your plan. Check your plan details.

**Q: What happens to trades if I delete an account?**
A: Trades are not deleted, just unassociated. You can view them in "all trades" mode.

**Q: Can I merge two accounts?**
A: Not automatically. You can manually reassign trades by editing each trade's account.

**Q: Does account size affect my trading?**
A: No, it's only for AI analysis and context. It doesn't limit your trades.

**Q: Can I export trades by account?**
A: Yes, select the account and use the export function.

## Support

For issues or questions:
- Contact support team
- Check the help documentation
- Review the account context settings
