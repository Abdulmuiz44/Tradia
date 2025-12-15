# Bulk Import Feature - Quick Reference

## TL;DR - What Changed

### Before
- Import button on trade history page opened a modal
- Modal showed CSV upload component inline

### After
- Import button redirects to dedicated `/dashboard/trades/import` page
- Full-page import experience with preview and info cards
- Success confirmation with auto-redirect
- Improved UX flow following the "add trade" pattern

## Key Changes at a Glance

| Component | Change | Impact |
|-----------|--------|--------|
| `TradeHistoryTable` | Button redirects instead of opening modal | Cleaner UX |
| `batch/route.ts` | Added proper field mapping | Data maps correctly to DB |
| `import/page.tsx` | Already complete | No changes needed |
| `CsvUpload.tsx` | Already complete | No changes needed |

## Testing Checklist

- [ ] Click import button → redirects to import page
- [ ] Upload CSV file → parses and shows preview
- [ ] Upload Excel file → parses and shows preview
- [ ] Auto-mapping detects column names correctly
- [ ] Click Import → shows success toast
- [ ] Auto-redirects to trade history after 1.5s
- [ ] New trades visible in trade history table
- [ ] Can edit imported trades individually
- [ ] Trades appear in analytics/statistics

## Supported CSV Format

**Minimal (Required)**:
```
symbol,direction,entryPrice
EURUSD,Buy,1.0850
GBPUSD,Sell,1.2650
```

**Full Example**:
```
symbol,direction,entryPrice,stopLossPrice,takeProfitPrice,openTime,outcome,pnl
EURUSD,Buy,1.0850,1.0800,1.0900,2024-01-15T10:30:00Z,win,50
```

## API Endpoint

```
POST /api/trades/batch
Content-Type: application/json

Request:
{
  "trades": [ { trade objects } ]
}

Response (201):
{
  "message": "Trades imported successfully",
  "count": 1,
  "trades": [ { imported trade objects } ]
}
```

## Column Auto-Mapping Examples

| CSV Column | Detected As |
|-----------|---|
| symbol, ticker, instrument, pair | symbol |
| direction, side | direction |
| entry_price, openPrice, price_open | entryPrice |
| stop_loss, SL | stopLossPrice |
| take_profit, TP | takeProfitPrice |
| openTime, entry_time, open_time | openTime |
| closeTime, exit_time, close_time | closeTime |
| pnl, profit, netpl | pnl |
| outcome, result | outcome |

## Files Modified

```
src/components/dashboard/TradeHistoryTable.tsx
├── Changed import button from setCsvOpen(true) to router.push()
├── Removed csvOpen state
├── Removed CsvUpload component import
└── Removed CSV modal JSX

app/api/trades/batch/route.ts
├── Added mapToSnakeCase() function
├── Added coalesce() helper
├── Added normalizeOutcomeValue()
├── Added normalizeTags()
└── Updated trade insertion logic
```

## Success Flow

```
User on /dashboard/trade-history
         ↓
    Click Import Button
         ↓
Redirect to /dashboard/trades/import
         ↓
     Upload File
         ↓
    Parse File (Client)
         ↓
   Show Preview
         ↓
   Click Import
         ↓
  POST /api/trades/batch
         ↓
 Validate & Insert (Server)
         ↓
  Success Toast (1.5s)
         ↓
Auto-redirect to /dashboard/trade-history
         ↓
  New trades visible
```

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Import button does nothing | Clear cache, ensure router is available |
| File not parsing | Check file format (CSV/XLSX), verify encoding |
| Headers not detected | Use common column names, check for extra spaces |
| Trades not appearing | Check browser console for API errors, verify auth |
| Wrong field mapping | Review auto-mapping preview before importing |

## Performance Notes

- File parsing: Client-side (fast)
- API: Batch operation (single DB insert)
- Redirect: 1.5 second delay (allows toast display)
- Max file size: Limited by browser file API

## Security Points

- ✅ Authenticated requests only
- ✅ User ID validated in API
- ✅ Type checking with TypeScript
- ✅ Input validation on server
- ✅ No sensitive data in logs

## Deployment

- No database migrations needed
- No new dependencies added
- Backward compatible with existing code
- Can be deployed immediately

## Monitoring

Check for:
1. API response times (POST /api/trades/batch)
2. Import success rate
3. Field mapping accuracy
4. User feedback on import feature

## Documentation Files Created

1. `BULK_IMPORT_IMPLEMENTATION.md` - Technical details
2. `IMPORT_FEATURE_GUIDE.md` - User guide
3. `IMPORT_TECHNICAL_ARCHITECTURE.md` - Architecture & design
4. `IMPLEMENTATION_SUMMARY.md` - Complete summary
5. `BULK_IMPORT_QUICK_REFERENCE.md` - This file

## Next Phase (When Ready)

- [ ] A/B test import page vs modal
- [ ] Collect user feedback
- [ ] Consider manual column mapping
- [ ] Consider duplicate detection
- [ ] Plan broker integrations
