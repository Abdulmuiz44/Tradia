# Trade History Migration Testing Guide

## Overview
The trade history migration system moves trades from browser localStorage to Supabase cloud database with encryption.

## What Was Fixed

### 1. **Enhanced Error Handling** (`src/context/TradeContext.tsx`)
- Added detailed console logging for debugging
- Improved error messages with specific guidance
- Added explicit localStorage clearing after successful migration
- Better migration state management

### 2. **Improved API Authentication** (`src/app/api/trades/import/route.ts`)
- Enhanced authentication logging
- Better error responses with details
- Added auth method tracking (NextAuth vs Supabase)
- More informative success/error messages

### 3. **Better User Feedback** (`src/components/modals/TradeMigrationModal.tsx`)
- Improved error message handling
- Better success state display
- Enhanced user guidance for common issues

### 4. **Debug Panel** (`src/components/debug/MigrationDebugPanel.tsx`)
- NEW: Comprehensive testing interface
- Shows local vs cloud trade counts
- Session information display
- API endpoint testing
- Step-by-step testing guide

## How the Migration Works

### Flow:
1. **Detection**: On app load, TradeContext checks localStorage for `trade-history`
2. **Notification**: If local trades exist, `needsMigration` becomes true
3. **Modal Display**: Dashboard shows TradeMigrationModal
4. **Migration Process**:
   - User clicks "Migrate now"
   - Frontend calls `/api/trades/import` with local trades
   - Backend authenticates user (NextAuth → Supabase fallback)
   - Trades are normalized and deduplicated
   - Data is encrypted and stored in Supabase
   - localStorage is cleared on success
5. **Completion**: User sees success message, trades refresh from cloud

## Testing the Migration

### Method 1: Using the Debug Panel (Recommended)

1. **Add Debug Panel to Dashboard**:
   ```tsx
   // In src/app/dashboard/page.tsx, add a new tab:
   { value: "migration-debug", label: "Migration Debug", icon: "Bug" }
   
   // In the content area, add:
   {activeTab === "migration-debug" && <MigrationDebugPanel />}
   ```

2. **Navigate to Debug Panel**:
   - Go to dashboard
   - Click "Migration Debug" tab

3. **Follow the Testing Steps**:
   - Check local storage count
   - Verify session is active
   - Test API endpoint first
   - If API works, test migration
   - Verify trades appear in cloud

### Method 2: Manual Testing

1. **Check for Local Trades**:
   ```javascript
   // In browser console:
   const trades = JSON.parse(localStorage.getItem('trade-history') || '[]');
   console.log(`Found ${trades.length} local trades`);
   ```

2. **Trigger Migration**:
   - The modal should appear automatically if local trades exist
   - Click "Migrate now"
   - Watch browser console for logs

3. **Verify Success**:
   ```javascript
   // Check localStorage is cleared:
   console.log(localStorage.getItem('trade-history')); // Should be null
   
   // Check trades in dashboard
   // They should now load from Supabase
   ```

### Method 3: API Testing with curl

```bash
# Test the import endpoint directly
curl -X POST http://localhost:3000/api/trades/import \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "trades": [{
      "symbol": "EURUSD",
      "direction": "Buy",
      "openTime": "2024-01-15T10:00:00Z",
      "pnl": 50,
      "outcome": "Win"
    }],
    "source": "test"
  }'
```

## Common Issues & Solutions

### Issue 1: "Authentication required" Error
**Cause**: No valid session found
**Solution**: 
- Refresh the page
- Sign out and sign in again
- Check if session cookie exists in browser DevTools

### Issue 2: "Migration failed with status 500"
**Cause**: Server error during processing
**Solution**:
- Check server logs for detailed error
- Verify Supabase connection
- Check database schema matches expected structure

### Issue 3: Trades not appearing after migration
**Cause**: Frontend not refreshing from database
**Solution**:
- Click refresh button in dashboard
- Check browser console for errors
- Verify trades exist in Supabase dashboard

### Issue 4: Duplicate trades
**Cause**: Migration ran multiple times
**Solution**:
- The system should prevent duplicates automatically
- Check `findExistingTrade` function logic
- Manually deduplicate in Supabase if needed

## Monitoring Migration

### Console Logs to Watch:
```
Starting migration of X local trades...
Trade import: Authenticated via [nextauth|supabase]
Trade import started: X trades from local-migration
Migration successful: X trades migrated
Local trade history cleared from localStorage
```

### Database Verification:
```sql
-- Check trades in Supabase
SELECT COUNT(*), source 
FROM trades 
WHERE user_id = 'your-user-id' 
GROUP BY source;

-- Should show trades with source = 'local-migration'
```

## Files Modified

1. `src/context/TradeContext.tsx` - Enhanced migration logic
2. `src/app/api/trades/import/route.ts` - Improved API handling
3. `src/components/modals/TradeMigrationModal.tsx` - Better UX
4. `src/components/debug/MigrationDebugPanel.tsx` - NEW debug tool

## Next Steps

1. Test migration with the debug panel
2. Monitor console logs during migration
3. Verify trades appear in Supabase dashboard
4. Test with different user accounts
5. Remove debug panel before production (or hide behind admin flag)

## Support

If migration continues to fail:
1. Check browser console for detailed errors
2. Check server logs for API errors
3. Verify Supabase credentials and permissions
4. Test authentication separately
5. Use the debug panel to isolate the issue