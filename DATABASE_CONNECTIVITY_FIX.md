# Database Connectivity Fix

## Problem
Getting error: `jwt callback DB lookup failed: getaddrinfo ENOTFOUND db.yikfqgjsrynlglmqhxnk.supabase.co`

This happens when the Supabase database is unreachable during authentication.

## Solutions

### Option 1: Quick Fix (Recommended)
Add this to your `.env.local` file:
```bash
FORCE_SKIP_DB_LOOKUPS=1
```

This will skip all database lookups during authentication, allowing the app to work even when the database is unreachable.

### Option 2: Alternative Environment Variables
You can also use these in your `.env.local`:
```bash
DISABLE_AUTH_DB_QUERIES=1

# OR
AUTH_DB_LOOKUPS=1
```

### Option 3: Check Database Connectivity
If you want to keep database lookups enabled:
1. Verify your Supabase project is active
2. Check your internet connection
3. Ensure Supabase credentials are correct in `.env.local`
4. Try restarting your development server

## What This Does
- Authentication will work without database lookups
- User data will be limited to what's provided by the OAuth provider
- Plan information won't be loaded from the database
- The app remains functional for basic operations

## Re-enabling Database Lookups
Once database connectivity is restored, set the environment variables back to `0` or remove them to re-enable full functionality.
