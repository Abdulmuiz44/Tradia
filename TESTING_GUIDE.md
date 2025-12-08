# Tradia Platform - Testing Guide

## Quick Start Testing

### Prerequisites
- Node.js 18+ installed
- .env.local configured with:
  - `MISTRAL_API_KEY` for Tradia AI
  - `NEXTAUTH_SECRET` for authentication
  - `SUPABASE_URL` and `SUPABASE_ANON_KEY` for database
  - Database migrations run on Supabase

### Running the Development Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

## Test Scenarios

### 1. Trade History Page Testing
**URL**: `https://tradiaai.app/dashboard/trade-history`

**Steps**:
1. ✅ Page loads successfully
2. ✅ Click "Add Trade" button
3. ✅ Fill in trade form:
   - Symbol: EURUSD
   - Direction: Buy
   - Entry Price: 1.0850
   - Exit Price: 1.0900
   - Stop Loss: 1.0800
   - Take Profit: 1.0950
   - Outcome: Win
   - P&L: 50
4. ✅ Click "Save Trade"
5. ✅ Trade appears in table
6. ✅ Click edit icon to modify trade
7. ✅ Update a field and save
8. ✅ Click delete icon and confirm
9. ✅ Trade is removed from table
10. ✅ Click "Refresh Data" button
11. ✅ Data persists across refresh

**Expected Outcomes**:
- Trades display in reverse chronological order
- All form validations work
- Trades save to Supabase `trades` table
- Edit and delete operations work instantly

---

### 2. Trade Journal Testing
**URL**: `https://tradiaai.app/dashboard/trade-journal`

**Steps**:
1. ✅ Page loads with trade list
2. ✅ Select a trade
3. ✅ Click "Add Journal Entry"
4. ✅ Fill journal form:
   - Emotion: Confident
   - Notes: "Good trade setup, followed plan"
   - Strategy: "Breakout strategy"
5. ✅ Click "Save Entry"
6. ✅ Entry appears in journal
7. ✅ Search for trades by symbol
8. ✅ Filter by emotion level
9. ✅ Export journal to PDF

**Expected Outcomes**:
- Journal entries linked to trades
- Emotional tracking captured
- Notes searchable and filterable
- Historical journal accessible

---

### 3. Trade Analytics Testing
**URL**: `https://tradiaai.app/dashboard/trade-analytics`

**Steps**:
1. ✅ Page loads with analytics dashboard
2. ✅ View metric cards:
   - Total Trades count
   - Win Rate percentage
   - Profit/Loss amount
   - Avg Risk/Reward ratio
3. ✅ Check profit/loss chart
4. ✅ View drawdown analysis
5. ✅ Check performance timeline
6. ✅ View trade pattern analysis
7. ✅ Hover over charts for details
8. ✅ Click "Export Data" if available

**Expected Outcomes**:
- All metrics calculate correctly
- Charts render without errors
- Data updates when trades change
- Mobile-responsive layout maintained

---

### 4. Trade Planner Testing
**URL**: `https://tradiaai.app/dashboard/trade-planner`

**Steps**:
1. ✅ Page loads with plan table
2. ✅ Click "Create New Plan"
3. ✅ Fill plan form:
   - Symbol: GBPUSD
   - Entry Target: 1.2700
   - Stop Loss: 1.2650
   - Take Profit: 1.2800
   - Risk Amount: 50
   - Expected Reward: 150
4. ✅ Click "Save Plan"
5. ✅ Plan appears in table
6. ✅ Mark plan as "Executed"
7. ✅ View plan history
8. ✅ Delete old plans

**Expected Outcomes**:
- Plans save successfully
- RR calculation accurate
- Plan status updates work
- Plans persist in database

---

### 5. Position Sizing Testing
**URL**: `https://tradiaai.app/dashboard/position-sizing`

**Steps**:
1. ✅ Page loads with calculator
2. ✅ Enter account balance: 10000
3. ✅ Enter risk percentage: 2%
4. ✅ Enter entry price: 1.0850
5. ✅ Enter stop loss: 1.0800
6. ✅ Click "Calculate Position Size"
7. ✅ Review calculated size
8. ✅ Change parameters and recalculate
9. ✅ Copy calculation to trades

**Expected Outcomes**:
- Calculations accurate
- Position size reasonable
- Results copy to clipboard
- Mobile input responsive

---

### 6. Trade Education Testing
**URL**: `https://tradiaai.app/dashboard/trade-education`

**Steps**:
1. ✅ Page loads with education content
2. ✅ View strategy guides
3. ✅ Read risk management tips
4. ✅ Browse best practices
5. ✅ Check resource links
6. ✅ Print educational material

**Expected Outcomes**:
- All content displays correctly
- Links functional
- Responsive on mobile
- Content readable

---

### 7. User Analytics Testing (Admin Only)
**URL**: `https://tradiaai.app/dashboard/user-analytics`

**Prerequisites**: Must be logged in as admin user

**Steps**:
1. ✅ Page loads (admin only)
2. ✅ View user statistics
3. ✅ Check system health metrics
4. ✅ View user engagement data
5. ✅ Check backend performance
6. ✅ Export analytics report

**Expected Outcomes**:
- Admin-only access enforced
- Metrics load correctly
- Charts display properly
- Data accurate

---

### 8. Tradia AI Chat Testing
**URL**: `https://tradiaai.app/chat`

**Steps**:
1. ✅ Page loads with chat interface
2. ✅ Read welcome message from Mistral
3. ✅ Type message: "What's my win rate?"
4. ✅ Submit and wait for response
5. ✅ Verify response is from pixtral-12b-2409
6. ✅ Try different modes (Coach, Mentor, Analyst)
7. ✅ Ask trading strategy questions
8. ✅ Request performance analysis
9. ✅ Test stop/reload buttons

**Expected Outcomes**:
- Chat connects to `/api/tradia/ai`
- Responses stream in real-time
- Model: pixtral-12b-2409 identified
- Responses are trading-relevant
- No errors in console

**Test Prompts**:
```
- "Analyze my recent trades"
- "What's my win rate trend?"
- "Give me trading tips"
- "What's my biggest loss?"
- "Help me improve my strategy"
```

---

### 9. Navigation Testing

**Test All Sidebar Links**:
- [ ] Overview (dashboard)
- [ ] Trade History (/dashboard/trade-history)
- [ ] Trade Journal (/dashboard/trade-journal)
- [ ] Trade Analytics (/dashboard/trade-analytics)
- [ ] Tradia AI (/chat)
- [ ] Tradia Predict (/tradia-predict)
- [ ] Risk Management (/dashboard/risk-management)
- [ ] Reporting (/dashboard/reporting)
- [ ] Trade Planner (/dashboard/trade-planner)
- [ ] Position Sizing (/dashboard/position-sizing)
- [ ] Trade Education (/dashboard/trade-education)
- [ ] Upgrade plan

**Expected Outcomes**:
- All links functional
- Pages load correctly
- Navigation responsive on mobile
- Back button works

---

### 10. CRUD Operations Complete Test

**Full Cycle**:
1. ✅ Login to dashboard
2. ✅ Go to Trade History
3. ✅ **Create**: Add new trade with all details
4. ✅ Verify in Supabase `trades` table
5. ✅ **Read**: View trade in list
6. ✅ **Update**: Click edit, change P&L, save
7. ✅ Verify update in database
8. ✅ **Delete**: Click delete, confirm
9. ✅ Verify removal from database
10. ✅ Refresh page, trade is gone

---

### 11. Data Persistence Test

**Steps**:
1. ✅ Add trade with specific details
2. ✅ Note the trade ID
3. ✅ Close browser tab
4. ✅ Clear browser cache
5. ✅ Go back to trade history
6. ✅ Verify trade still exists
7. ✅ Check all fields match

**Expected Outcomes**:
- Data persists across sessions
- Supabase sync working
- No data loss

---

## API Testing

### Test Trade Endpoints

**Create Trade**:
```bash
curl -X POST https://tradiaai.app/api/trades \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "EURUSD",
    "direction": "Buy",
    "entryPrice": 1.0850,
    "exitPrice": 1.0900,
    "outcome": "win",
    "pnl": 50
  }'
```

**Get Trades**:
```bash
curl https://tradiaai.app/api/trades
```

**Update Trade**:
```bash
curl -X PATCH https://tradiaai.app/api/trades \
  -H "Content-Type: application/json" \
  -d '{"id": "trade-id", "pnl": 75}'
```

**Delete Trade**:
```bash
curl -X DELETE "https://tradiaai.app/api/trades?id=trade-id"
```

---

## Performance Testing

### Page Load Times
- ✅ Trade History: < 2 seconds
- ✅ Analytics: < 3 seconds (more data)
- ✅ Chat: < 1 second
- ✅ Education: < 1 second

### Mobile Testing
- ✅ iPhone 12 (390px)
- ✅ iPad (768px)
- ✅ Desktop (1920px)
- ✅ Touch interactions work
- ✅ Responsive layout correct

---

## Error Handling Tests

**Test Error Scenarios**:
1. ✅ Invalid form submission
2. ✅ Network error (disable internet)
3. ✅ Server timeout (kill API)
4. ✅ Missing authentication
5. ✅ Database connection failure

---

## Browser Compatibility

Test on:
- ✅ Chrome 120+
- ✅ Firefox 121+
- ✅ Safari 17+
- ✅ Edge 120+

---

## Final Checklist

Before declaring ready for production:

- [ ] All 7 pages load without errors
- [ ] CRUD operations work end-to-end
- [ ] Tradia AI responds with pixtral-12b-2409
- [ ] Data persists to Supabase
- [ ] Navigation fully functional
- [ ] Mobile responsive on all pages
- [ ] No console errors or warnings
- [ ] Performance metrics acceptable
- [ ] All API endpoints respond correctly
- [ ] Error handling graceful
- [ ] Type checking passes
- [ ] Build completes without errors

---

## Debugging Tips

### Check Console
```javascript
// See all trades in memory
localStorage.getItem('trades')

// Clear cache if needed
localStorage.clear()
```

### Database Verification
1. Go to Supabase dashboard
2. Navigate to `trades` table
3. Verify your added trades appear
4. Check timestamp accuracy
5. Verify user_id matches

### API Testing
```bash
# Watch API logs
tail -f .next/server.log

# Test endpoint directly
curl https://tradiaai.app/api/trades -v
```

### Chat Testing
```javascript
// Check if API is responding
fetch('/api/tradia/ai', {
  method: 'POST',
  body: JSON.stringify({messages: [{role: 'user', content: 'test'}]})
}).then(r => r.json()).then(console.log)
```

---

**Last Updated**: December 8, 2025
**Test Status**: Ready for execution
**Estimated Time**: 2-3 hours for full test suite
