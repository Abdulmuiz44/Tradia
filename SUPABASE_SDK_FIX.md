# Supabase SDK Fix - Trades API Schema Issue

## Problem
Error when adding trades: `"column trades.timestamp does not exist"`

This happens because:
1. The API code was using `timestamp` column which doesn't exist in the database
2. The database uses `opentime` instead

## Solution

### Step 1: Run Database Migration (REQUIRED)

Go to your Supabase dashboard → SQL Editor and run this migration:

**File**: `migrations/003_fix_trades_schema.sql`

Copy the entire contents and paste into Supabase SQL Editor, then execute.

This migration:
- Removes the `timestamp` column if it exists (not used)
- Adds all required columns: `opentime`, `closetime`, `entryprice`, `exitprice`, `stoplossprice`, `takeprofitprice`, `direction`, `ordertype`, `session`, `outcome`, `resultrr`, `duration`, `reasonfortrade`, `strategy`, `emotion`, `journalnotes`, `notes`, `beforescreenshoturl`, `afterscreenshoturl`, `commission`, `swap`, `pinned`, `tags`, `reviewed`, `profitloss`, `rr`, `lotsize`

### Step 2: Verify Environment Variables

Ensure `.env.local` has these variables (should already be there):

```
NEXT_PUBLIC_SUPABASE_URL=https://yikfqgjsrynlglmqhxnk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Step 3: Restart Your Application

```bash
npm run dev
# or
pnpm dev
```

## Changes Made

### API Routes Fixed
- **`app/api/trades/route.ts`** - Fixed GET, POST, PATCH, DELETE handlers
  - Changed from `timestamp` column to `opentime`
  - Added proper field mappings for all trade columns
  - Added PATCH and DELETE handlers to main route

### Frontend Context Updated
- **`src/context/TradeContext.tsx`** - Updated API calls
  - ensured `id` and `user_id` are always sent in PATCH requests
  - Fixed bulk update operations

## What's Using the Supabase SDK Correctly

✓ All API routes use the Supabase SDK (`createClient()`)
✓ All frontend queries use the SDK (`createClientComponentClient()`)
✓ No direct REST API calls are made (prevents API key issues)

## Testing

1. Try adding a new trade
2. Try updating an existing trade
3. Try deleting a trade
4. All operations should work without "No API key found" errors

## If You Still Get Errors

1. **Check Supabase connection**: Go to Supabase dashboard → check project status
2. **Verify migration ran**: Check the trades table columns in Supabase
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R) to clear cached code
4. **Check console for errors**: Browser DevTools → Console tab for detailed errors

## Technical Details

- The application exclusively uses Supabase JS SDK
- No direct REST API calls to `/rest/v1/` endpoints
- All database operations go through the server-side API routes (`/api/trades`)
- Authentication is handled by NextAuth with Supabase backend
