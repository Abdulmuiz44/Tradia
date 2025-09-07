# 🚀 Tradia MT5 Android Integration Setup Guide

## Prerequisites Checklist

Before connecting your MT5 account to Tradia, ensure all these requirements are met:

### ✅ 1. MetaTrader 5 Android App
- [ ] **Download & Install**: Get MT5 Android app from [Google Play Store](https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5)
- [ ] **Launch MT5**: Open the app on your Android device
- [ ] **Login to Account**: Log in to your trading account in MT5 Android

### ✅ 2. Server Address
- [ ] **Find Server**: Check your broker's website or MT5 login screen
- [ ] **Format**: Usually `BrokerName-MT5` (e.g., `ICMarketsSC-MT5`, `Pepperstone-Live`)
- [ ] **Verify**: Ask your broker if unsure

### ✅ 3. Account Credentials
- [ ] **Account Number**: Your MT5 account login (5-10 digits)
- [ ] **Password**: Use investor password (not broker login password)
- [ ] **Never use**: Master password unless automated trading is enabled

### ✅ 4. Network & Security
- [ ] **Stable Internet**: Ensure reliable connection
- [ ] **Firewall**: Allow MT5 connections (ports 443, 1950)
- [ ] **VPN**: If using VPN, ensure it allows MT5 traffic

### ✅ 5. MT5 Android API Settings
**Critical - Must be enabled for sync to work:**

1. Open MT5 Android App
2. Tap the **Menu** (three lines) → **Settings**
3. Go to **Expert Advisors** section
4. ✅ Check **"Allow automated trading"**
5. ✅ Check **"Allow DLL imports"**
6. ❌ Uncheck **"Disable automated trading when..."** options
7. Save the settings

### ✅ 6. Tradia Account
- [ ] **Sign up**: Create account at [tradia.app](https://tradia.app)
- [ ] **Verify Email**: Confirm your email address
- [ ] **Choose Plan**: Select plan based on account limits needed

## Account Limits by Plan

| Plan | MT5 Accounts | Monthly Price |
|------|-------------|---------------|
| **Starter** (Free) | 1 account | $0 |
| **Pro** | 3 accounts | $9 |
| **Plus** | 5 accounts | $19 |
| **Elite** | Unlimited | $39 |

## Step-by-Step Connection Process

### Step 1: Access MT5 Integration
1. Log in to Tradia dashboard
2. Navigate to **"MT5 Integration"** tab
3. Click **"Requirements"** to verify prerequisites
4. Click **"Add MT5 Account"**

### Step 2: Enter Account Details
```
Server: ICMarketsSC-MT5
Login: 12345678
Password: your_investor_password
Name: Live Account (optional)
```

### Step 3: Test Connection
1. Click **"Test Connection"** first
2. Wait for success message
3. If failed, check error message and fix issues
4. Common issues:
   - Wrong server address
   - Wrong password type
   - MT5 Android app not running
   - Network/firewall issues

### Step 4: Connect Account
1. After successful test, click **"Connect Account"**
2. Account will be saved securely
3. Status will show as "Connected"

### Step 5: Sync Trade History
1. Click **"Sync Now"** on connected account
2. Watch real-time progress
3. Trades will appear in your dashboard
4. Analytics will update automatically

## Troubleshooting Common Issues

### ❌ "Failed to fetch" Error
**Causes:**
- MT5 backend service not running
- Wrong API endpoint configuration
- Network connectivity issues

**Solutions:**
1. Check if MT5 backend is running on port 5000
2. Verify API endpoints in environment variables
3. Check network/firewall settings

### ❌ "Invalid server" Error
**Causes:**
- Wrong server address format
- Server not accessible
- Broker server issues

**Solutions:**
1. Verify server address with broker
2. Try different server variations
3. Contact broker support

### ❌ "Login failed" Error
**Causes:**
- Wrong account number
- Wrong password type (using broker password instead of investor)
- Account restrictions

**Solutions:**
1. Use account number, not email
2. Use investor password, not broker password
3. Check account status with broker

### ❌ "API disabled" Error
**Causes:**
- Automated trading not enabled in MT5 Android
- DLL imports not allowed

**Solutions:**
1. Enable automated trading in MT5 Android settings
2. Allow DLL imports
3. Restart MT5 Android app

### ❌ "Network error" Error
**Causes:**
- Unstable internet connection
- Firewall blocking connections
- VPN issues

**Solutions:**
1. Check internet connection stability
2. Configure firewall to allow MT5
3. Try without VPN or configure VPN properly

## Advanced Configuration

### Multiple MT5 Accounts
- Connect up to your plan limit
- Each account syncs independently
- Analytics combine all accounts
- Can filter by account in dashboard

### Sync Frequency
- Manual sync: Click "Sync Now" anytime
- Automatic sync: Runs in background (Pro+ plans)
- Real-time sync: Live trade updates (Elite plan)

### Data Security
- Credentials encrypted at rest
- Secure API communication
- No data stored on external servers
- GDPR compliant

## Getting Help

### Quick Support
1. Check this guide first
2. Use "Requirements" button in dashboard
3. Test connection before connecting

### Contact Support
- **Email**: support@tradia.app
- **Documentation**: [docs.tradia.app](https://docs.tradia.app)
- **Community**: [Discord/Forum link]

### Broker-Specific Help
Most brokers provide MT5 setup guides:
- **IC Markets**: Search "IC Markets MT5 setup"
- **Pepperstone**: Check their MT5 documentation
- **Other brokers**: Search "[Broker Name] MT5 API access"

## Success Indicators

✅ **Connection Test**: Shows "Connection successful!"
✅ **Account Status**: Shows "Connected" with green indicator
✅ **Sync Progress**: Shows real-time progress bars
✅ **Trade Data**: Trades appear in dashboard
✅ **Analytics**: Charts and metrics update

## Next Steps After Setup

1. **Explore Dashboard**: Check your analytics
2. **Customize Views**: Set up filters and date ranges
3. **Export Data**: Generate reports and exports
4. **Set Goals**: Configure monthly targets
5. **Share Insights**: Export for reviews

---

**🎯 Pro Tip**: Always test connection before connecting your account. This saves time and helps identify issues early!

**🔒 Security Note**: Your MT5 credentials are encrypted and never shared. We only use them to sync your trade data securely.