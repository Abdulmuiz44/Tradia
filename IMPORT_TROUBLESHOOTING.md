# Import Trades Feature - Troubleshooting Guide

## Issue: Import Button Not Redirecting

### Quick Checklist

- [ ] Are you on `/dashboard/trade-history` page?
- [ ] Do you see the green "Import Trades" button?
- [ ] Is it positioned right next to the blue "Add Trade" button?
- [ ] Have you cleared your browser cache?
- [ ] Are you logged in?

## Solution Steps

### Step 1: Verify the Button Exists

Check if you can see these two buttons at the top of the trade history page:

```
[+ Add Trade]  [↑ Import Trades]
(Blue)         (Green)
```

**If you see both buttons**, proceed to Step 2.

**If you DON'T see the Import Trades button**, follow this:
1. Hard refresh the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache completely
3. Close and reopen the browser
4. Try again

### Step 2: Check Browser Console for Errors

1. Open Developer Tools: Press `F12`
2. Click "Console" tab
3. Reload the page
4. Look for any red error messages
5. Take a screenshot or note the error
6. Share the error with support

### Step 3: Direct URL Navigation

If the button still doesn't work, try navigating directly:

1. In the address bar, type: `/dashboard/trades/import`
2. Press Enter
3. Does the import page load?

- **YES** → The button might have a JavaScript issue. Try refreshing.
- **NO** → There might be a routing issue. Continue to Step 4.

### Step 4: Check Route Configuration

The route should be: `/dashboard/trades/import`

Expected file structure:
```
app/
├── dashboard/
│   ├── trades/
│   │   ├── add/
│   │   │   └── page.tsx ✅
│   │   ├── import/
│   │   │   └── page.tsx ✅ (This should exist)
│   │   ├── edit/
│   │   │   └── [id]/
│   │   │       └── page.tsx ✅
│   │   └── ...
│   ├── trade-history/
│   │   └── page.tsx ✅
│   └── ...
└── ...
```

### Step 5: Verify API Endpoint

The import page calls `/api/trades/batch`. Verify it exists:

Expected file structure:
```
app/
├── api/
│   ├── trades/
│   │   ├── batch/
│   │   │   └── route.ts ✅ (This should exist)
│   │   ├── import/
│   │   │   └── route.ts ✅
│   │   └── ...
└── ...
```

## Common Issues & Fixes

### Issue: "Cannot GET /dashboard/trades/import"

**Cause**: Route doesn't exist or not built correctly

**Fix**:
1. Check file exists: `app/dashboard/trades/import/page.tsx`
2. Rebuild Next.js: Run `npm run build`
3. Restart development server

### Issue: Button is there but click does nothing

**Cause**: JavaScript not loaded or router issue

**Fix**:
1. Hard refresh: `Ctrl+Shift+R`
2. Check console for errors: `F12`
3. Clear browser cache and try again
4. Try in incognito/private mode

### Issue: Page loads but is blank

**Cause**: Component render error or auth issue

**Fix**:
1. Check you're logged in
2. Open console (`F12`) and look for errors
3. Check network tab to see if API calls work

### Issue: "Unauthorized" error

**Cause**: Session expired or auth issue

**Fix**:
1. Sign out and sign in again
2. Check session is valid
3. Try in incognito mode

## Advanced Debugging

### Check Next.js Routes

Run in terminal:
```bash
npm run build
```

Look for:
- `> Route (app) /dashboard/trades/import`
- `> Route (app) /api/trades/batch`

Both should be present.

### Check Browser Network

1. Open Dev Tools: `F12`
2. Go to "Network" tab
3. Click the Import Trades button
4. Watch for request to `/dashboard/trades/import`
5. Check status code (should be 200)

### Check Console Errors

1. Open Dev Tools: `F12`
2. Go to "Console" tab
3. Look for any red errors
4. Click on error to see stack trace

### Test Direct Navigation

Try these URLs directly in address bar:
- `http://localhost:3000/dashboard/trade-history` (should load)
- `http://localhost:3000/dashboard/trades/import` (should load)
- `http://localhost:3000/dashboard/trades/add` (should load for comparison)

If add/edit pages work but import doesn't, there's likely a file issue.

## File Verification Commands

### Check if import page exists:
```bash
cat app/dashboard/trades/import/page.tsx
```

Should output the React component.

### Check if batch API exists:
```bash
cat app/api/trades/batch/route.ts
```

Should output the API route handler.

## Reset & Rebuild

If nothing else works:

```bash
# Clear cache and rebuild
npm run clean
npm run build

# Or restart dev server
npm run dev
```

Then try again.

## Still Having Issues?

**Information to provide when reporting:**

1. Exact URL when issue occurs
2. Screenshot showing the page
3. Browser console errors (F12 → Console)
4. Network tab screenshot (F12 → Network)
5. Steps to reproduce
6. Expected vs actual behavior

## Working Configuration

✅ **This configuration is confirmed working:**

- Trade History Page: `/dashboard/trade-history`
- Import Trades Button: Green button next to "Add Trade"
- Import Page: `/dashboard/trades/import`
- Batch API: `/api/trades/batch` (POST)
- All components properly linked
- No TypeScript errors
- No build errors

## Confirmation Checklist

After troubleshooting, verify:

- [ ] Can see trade history page
- [ ] Can see "Add Trade" button (blue)
- [ ] Can see "Import Trades" button (green)
- [ ] Clicking "Import Trades" goes to `/dashboard/trades/import`
- [ ] Can upload CSV/Excel file
- [ ] Preview shows file data
- [ ] Import button works
- [ ] Success toast appears
- [ ] Redirects to trade history
- [ ] New trades appear in table

Once all checked, the feature is working correctly.

---

**Last Updated**: January 2024
**Status**: Tested and Working
**Support**: See troubleshooting steps above
