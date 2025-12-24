# Login Friction & Redirect Fix - Implementation Plan

## Issues Identified

1. **Login redirect confusion**: Login page uses custom credential flow but NextAuth also has signIn via credentials - mixed authentication approaches
2. **Middleware blocking dashboard**: Middleware allows all dashboard access (TEMP disabled) - needs proper auth enforcement
3. **Upgrade page redirect loop**: Users get redirected to /login even when logged in
4. **Trade data not syncing**: Data needs to load after successful login
5. **UI inconsistency**: Dashboard styling doesn't match the rest of the application
6. **Multiple auth systems**: Mix of NextAuth and custom JWT tokens

## Solutions

### 1. **Simplify Login Flow**
- Remove custom login API route
- Use NextAuth's credentials provider directly
- Add proper session validation before redirecting

### 2. **Fix Middleware**
- Enable proper session checking
- Allow authenticated users to access /dashboard/*
- Redirect unauthenticated users to /login

### 3. **Fix Upgrade Button & Page Access**
- Ensure upgrade page validates session properly
- Fix redirect loop by checking session before redirecting

### 4. **Trade Data Sync**
- Ensure TradeProvider loads data immediately after login
- Move trade fetching to happen on first dashboard load

### 5. **Unify UI Styling**
- Use consistent color scheme across all dashboard pages
- Apply matching components and spacing
- Ensure dark/light mode works consistently

## Files to Modify

1. `middleware.ts` - Enable proper auth checking
2. `app/login/page.tsx` - Use NextAuth properly
3. `app/dashboard/page.tsx` - Fix trade data sync
4. `app/dashboard/upgrade/page.tsx` - Fix auth check
5. `app/dashboard/overview/page.tsx` - Align styling
6. CSS/styling - Unify across dashboard pages
