# Quick Test Guide - Login & Auth Fixes

## What Was Fixed

1. **Login Redirect** - Users now go to `/dashboard/overview` instead of `/dashboard`
2. **Trade Data Sync** - Automatically syncs after login
3. **Upgrade Page** - No more redirect loops, properly validates auth
4. **UI Consistency** - All dashboard pages now match styling

## Testing Steps

### Test 1: Email/Password Login
1. Go to `/login`
2. Enter valid email and password
3. **Expected**: Redirected to `/dashboard/overview`
4. **Expected**: Trade data loads automatically
5. **Check**: Metrics display correct numbers

### Test 2: Google Sign-In
1. Go to `/login`
2. Click "Continue with Google"
3. Complete Google auth flow
4. **Expected**: Redirected to `/dashboard/overview`
5. **Expected**: Trade data loads automatically

### Test 3: Upgrade Page Access
1. Login to account with non-elite plan
2. Click "Upgrade" in sidebar (or visit `/dashboard/upgrade`)
3. **Expected**: Page loads without redirect loop
4. **Expected**: Can see current plan and upgrade options
5. **Expected**: Can click upgrade buttons without issues

### Test 4: Already Logged In Users
1. Login to account
2. Try visiting `/login` directly (paste in URL bar)
3. **Expected**: Redirected to `/dashboard`
4. **Expected**: No infinite redirects

### Test 5: Unauthenticated Access
1. Logout or open incognito window
2. Try visiting `/dashboard` directly
3. **Expected**: Redirected to `/login`
4. **Expected**: Cannot access dashboard without login

### Test 6: Trade Data Sync
1. Login fresh account
2. Check dashboard overview
3. **Expected**: Trade history appears automatically
4. **Expected**: Metrics (Win Rate, Profit/Loss, etc.) show correct values
5. **Expected**: Manual "Refresh" button still works

### Test 7: UI Consistency
1. Visit `/dashboard` (main page)
2. Visit `/dashboard/overview`
3. Visit `/dashboard/upgrade`
4. **Expected**: Styling matches across all pages
5. **Expected**: Sidebar looks identical
6. **Expected**: User menu format matches

### Test 8: Plan Badge in User Menu
1. Login to account
2. Click user avatar in sidebar
3. **Expected**: See current plan badge (Free/Pro/Plus/Elite)
4. **Expected**: See "Upgrade Plan" button (if not Elite)
5. **Expected**: Colors match plan tiers

### Test 9: Dark/Light Mode
1. Login to account
2. Toggle theme button (sun icon)
3. **Expected**: All pages switch correctly
4. **Expected**: Text remains readable
5. **Expected**: All buttons visible and styled

### Test 10: Mobile Responsiveness
1. Open dev tools (F12)
2. Toggle device emulation (mobile view)
3. **Expected**: Sidebar collapses properly
4. **Expected**: Mobile menu button works
5. **Expected**: User menu accessible on mobile

## Common Issues & Fixes

### Issue: User gets redirected to login when already logged in
**Cause**: Session might be invalid
**Fix**: 
1. Clear browser cache/cookies
2. Try incognito window
3. Check NEXTAUTH_SECRET is set in .env.local

### Issue: Trade data doesn't load after login
**Cause**: Auto-sync might be skipped if trades already exist
**Fix**:
1. Click manual "Refresh" button
2. Check browser console for errors
3. Verify API routes are working

### Issue: Upgrade page shows loading spinner indefinitely
**Cause**: Session status not properly detected
**Fix**:
1. Hard refresh page (Ctrl+Shift+R)
2. Clear session cookies
3. Login again

### Issue: Styling looks broken
**Cause**: CSS variables might not be loaded
**Fix**:
1. Hard refresh (Ctrl+Shift+R)
2. Check dark mode toggle
3. Verify tailwind CSS is compiled

## Files Changed (For Reference)

- `middleware.ts` - Auth validation
- `app/login/page.tsx` - Login redirects
- `app/dashboard/page.tsx` - Auto-sync trades
- `app/dashboard/upgrade/page.tsx` - Auth checks
- `app/dashboard/overview/page.tsx` - UI styling

## Success Criteria

✅ User logs in → redirected to overview
✅ Trade data syncs automatically
✅ Upgrade page works without loops
✅ All dashboard pages have matching UI
✅ Dark/light mode works consistently
✅ Mobile view is responsive
✅ Logout works properly
✅ Session persists across page reloads

## Need Help?

1. Check browser console (F12) for errors
2. Look at Network tab for failed API calls
3. Verify NEXTAUTH_SECRET in .env.local
4. Clear cookies and try again
5. Check that `/api/auth/*` routes are accessible
