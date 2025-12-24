#!/bin/bash

# Commit all changes for login and auth fixes
git add -A

git commit -m "Fix: Login redirect, auto-sync trades, upgrade page auth, and UI consistency

- Fix middleware: Enable proper NextAuth authentication (fixes redirect loops)
- Fix login page: Redirect to /dashboard/overview instead of /dashboard
- Add auto-sync: Trade data syncs automatically on first authenticated load
- Fix upgrade page: Proper session status checking (no more infinite redirects)
- Update overview UI: Add plan badge, upgrade button, consistent styling

Changes:
- middleware.ts: Enable JWT validation, protect /dashboard routes
- app/login/page.tsx: Fix redirect paths for credentials and Google auth
- app/dashboard/page.tsx: Add useEffect for automatic trade synchronization
- app/dashboard/upgrade/page.tsx: Proper auth checks with loading state
- app/dashboard/overview/page.tsx: Update user menu with plan badge and upgrade button

Result:
- Users now redirected to correct page after login
- Trade data loads automatically
- Upgrade page works without redirect loops
- Consistent UI styling across all dashboard pages
- Plan visibility improved with badge display

No breaking changes. Backward compatible. Production ready."

git log --oneline -1
