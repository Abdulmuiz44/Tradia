# Trade System Integration - Test Plan

## Overview
This document outlines the test plan for verifying the successful implementation of the trade management system integration across all pages and flows.

## Test Environment
- **Base URL**: http://localhost:3000 (development) or https://tradia.vercel.app (production)
- **Test User**: Create a test account for verification
- **Trades**: Use test data with known values for easy verification

---

## Test Cases

### 1. Trade History Page
**URL**: `/dashboard/trade-history`
**Status**: ✅ Updated to use new routes

#### 1.1 Display Stats and Metrics
- [ ] Total Trades card displays correct count
- [ ] Win Rate % displays correct percentage
- [ ] Total P&L shows correct amount with proper color (green for positive, red for negative)
- [ ] Avg RR displays correct ratio

#### 1.2 Action Buttons
- [ ] "Add Trade" button visible and clickable
- [ ] "Import Trades" button visible and clickable
- [ ] Both buttons navigate to correct pages

#### 1.3 Trade Table Display
- [ ] Table displays all trades
- [ ] Columns are sortable (by symbol, outcome, PnL, etc.)
- [ ] Pagination works correctly
- [ ] Mobile card view works on smaller screens

---

### 2. Add Trade Flow
**URL**: `/dashboard/trades/add`
**Route**: router.push("/dashboard/trades/add")

#### 2.1 Form Rendering
- [ ] Form loads successfully
- [ ] All required fields are present (Symbol, Direction, Entry Price, etc.)
- [ ] Form is mobile-responsive

#### 2.2 Form Validation
- [ ] Symbol field is required
- [ ] Entry Price must be a valid number
- [ ] Stop Loss and Take Profit are optional but must be numbers if provided
- [ ] Outcome is required
- [ ] Error messages display clearly

#### 2.3 Trade Creation
- [ ] Successfully create a new trade
- [ ] Trade appears in history immediately
- [ ] Supabase database is updated
- [ ] Success notification displays
- [ ] Page redirects to trade-history after save
- [ ] Created trade has correct timestamp

#### 2.4 Navigation
- [ ] Can access from Trade History "Add Trade" button
- [ ] Back button works (returns to previous page)
- [ ] Browser back button works

---

### 3. Edit Trade Flow
**URL**: `/dashboard/trades/edit/[id]`
**Route**: router.push(`/dashboard/trades/edit/${trade.id}`)

#### 3.1 Form Pre-fill
- [ ] Form loads with existing trade data
- [ ] All fields are populated correctly
- [ ] Symbol is correctly displayed
- [ ] Entry price, SL, TP are shown
- [ ] Outcome is pre-selected

#### 3.2 Form Updates
- [ ] Can modify any field
- [ ] Can change outcome (Win/Loss/Breakeven)
- [ ] resultRR updates based on new prices
- [ ] Duration field recalculates if times change

#### 3.3 Trade Update
- [ ] Successfully update trade
- [ ] Changes persist in database
- [ ] Metrics update immediately (win rate, total PnL)
- [ ] Success notification displays
- [ ] Page redirects to trade-history after save

#### 3.4 Error Handling
- [ ] Invalid trade ID shows error
- [ ] Validation errors prevent save
- [ ] Network errors handled gracefully

---

### 4. Import Trades Flow
**URL**: `/dashboard/trades/import`
**Route**: router.push("/dashboard/trades/import")

#### 4.1 CSV Import
- [ ] CSV upload component displays
- [ ] File selection works
- [ ] CSV file can be selected
- [ ] Preview of data shows before import

#### 4.2 Data Validation
- [ ] Required columns are identified
- [ ] Invalid rows are highlighted
- [ ] Preview shows 5-10 rows
- [ ] Column mapping works correctly

#### 4.3 Batch Import
- [ ] Multiple trades import successfully
- [ ] Each trade is created with correct data
- [ ] Timestamps are preserved
- [ ] PnL and outcome are correctly assigned

#### 4.4 Success Feedback
- [ ] Import completion message shows count
- [ ] Trades appear in history immediately
- [ ] Can view imported trades with all data

---

### 5. Delete Trade Flow
**Through Trade History Table**

#### 5.1 Delete Action
- [ ] Delete button visible in table actions
- [ ] Clicking delete shows confirmation modal
- [ ] Modal displays trade details (Symbol, Direction, PnL)
- [ ] Cancel button closes modal without deleting

#### 5.2 Confirmation
- [ ] Confirmation modal appears
- [ ] Trade information is clearly displayed
- [ ] "Delete Trade" button removes trade
- [ ] Success notification displays

#### 5.3 Post-Delete
- [ ] Trade is removed from table
- [ ] Metrics update (Total Trades, Win Rate decrease)
- [ ] Trade is removed from database
- [ ] Deleted trade no longer accessible

---

### 6. Integration with useTradeData Hook
**Files Updated**: trade-journal.tsx, trade-analytics page, risk-management page

#### 6.1 Trade Journal Page
- [ ] Page loads without errors
- [ ] Trades display correctly
- [ ] useTradeData hook provides correct metrics
- [ ] Can navigate to edit from journal

#### 6.2 Trade Analytics Page
- [ ] Performance by symbol displays
- [ ] Metrics calculations are correct
- [ ] Charts render properly
- [ ] Filtering works correctly

#### 6.3 Risk Management Page
- [ ] Risk metrics display correctly
- [ ] Drawdown calculations are accurate
- [ ] Symbol risk analysis shows correct data
- [ ] Direction analysis splits trades correctly

---

### 7. Navigation Integration
**Sidebar and Route Links**

#### 7.1 Sidebar Links
- [ ] Trade History link navigates to correct page
- [ ] Trade Journal link works
- [ ] Trade Analytics link works
- [ ] Risk Management link works
- [ ] All links have active state styling

#### 7.2 Internal Links
- [ ] "Add Trade" button from history works
- [ ] "Edit" buttons in tables navigate correctly
- [ ] "Import" button works
- [ ] Back buttons work correctly

---

### 8. API Endpoint Testing

#### 8.1 GET /api/trades
- [ ] Returns all user's trades
- [ ] Respects authentication
- [ ] Returns 401 if not authenticated
- [ ] Filters by user_id correctly

#### 8.2 POST /api/trades
- [ ] Creates new trade
- [ ] Returns created trade with ID
- [ ] Saves to Supabase
- [ ] Validates required fields
- [ ] Calculates resultRR correctly

#### 8.3 PATCH /api/trades/[id]
- [ ] Updates existing trade
- [ ] Only user's own trades can be updated
- [ ] Returns updated trade
- [ ] Recalculates derived fields

#### 8.4 DELETE /api/trades/[id]
- [ ] Deletes trade from database
- [ ] Returns success response
- [ ] Only owner can delete
- [ ] Trade is no longer accessible

#### 8.5 POST /api/trades/batch
- [ ] Imports multiple trades
- [ ] All trades created successfully
- [ ] Returns list of created trades
- [ ] Preserves order

---

## Cross-Browser Testing

- [ ] Chrome/Edge - Latest version
- [ ] Firefox - Latest version
- [ ] Safari - Latest version
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance Testing

- [ ] Page load time < 2 seconds
- [ ] Trade history loads < 1 second with 100+ trades
- [ ] Form submission < 1 second
- [ ] Bulk import handles 1000+ trades

---

## Security Testing

- [ ] RLS policies enforced
- [ ] Users can only see own trades
- [ ] Session validation on all endpoints
- [ ] CSRF protection working

---

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Form labels properly associated
- [ ] Color contrast sufficient
- [ ] Screen reader compatible

---

## Regression Testing

- [ ] Existing trade context still works
- [ ] LocalStorage fallback works for old trades
- [ ] Modal components still functional if needed
- [ ] Notifications display correctly

---

## Test Summary

**Total Test Cases**: 57
**Test Status**: In Progress

### Completion Checklist
- [x] Task 1: Update /dashboard/trade-history to use new routes
- [x] Task 2: Integrate useTradeData in trade-journal, analytics, risk-management
- [x] Task 3: Update navigation/sidebar to link to new pages
- [x] Task 4: Remove modal components from trade-related pages
- [ ] Task 5: Test all flows (In Progress)

---

## Notes

- All tests should be performed in a clean database state
- Use realistic test data (valid symbols, reasonable prices)
- Test both success and error paths
- Verify mobile responsiveness on all pages
- Check console for any errors or warnings

## Sign-Off

- [ ] Development Team
- [ ] QA Team
- [ ] Product Owner
