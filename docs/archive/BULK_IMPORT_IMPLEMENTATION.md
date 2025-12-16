# Bulk Trade Import Implementation

## Overview
Implemented a full bulk trade import feature that allows users to import multiple trades at once via CSV/XLSX files from the trade history page.

## Key Changes

### 1. **Modified TradeHistoryTable Component**
- **File**: `src/components/dashboard/TradeHistoryTable.tsx`
- **Changes**:
  - Removed CSV modal from import button
  - Changed import button behavior from `onClick={() => setCsvOpen(true)}` to `onClick={() => router.push("/dashboard/trades/import")}`
  - Removed unused `csvOpen` state
  - Removed `CsvUpload` component import (now used only on import page)
  - Removed entire CSV modal UI section (lines 925-951)

### 2. **Enhanced Batch API Endpoint**
- **File**: `app/api/trades/batch/route.ts`
- **Improvements**:
  - Added proper field mapping from frontend camelCase to database snake_case
  - Implemented the same mapping logic as `/api/trades/import` route
  - Added support for multiple field name variations (e.g., `orderType`, `order_type`, `ordertype`)
  - Proper outcome normalization (win/loss/breakeven)
  - Support for tags parsing from comma-separated strings
  - Automatic trade ID generation
  - Consistent timestamp handling with ISO formatting
  - Proper error handling with detailed error messages

### 3. **Existing Import Flow (Already in Place)**
- **Import Page**: `app/dashboard/trades/import/page.tsx`
  - Displays full-page import interface
  - Shows success state after import with count
  - Redirects to trade history after 1.5 seconds
  - Displays helpful info cards about supported formats and required columns

- **CSV Upload Component**: `src/components/dashboard/CsvUpload.tsx`
  - Handles CSV and Excel file parsing
  - Auto-mapping of headers to trade fields using regex patterns
  - Header detection for common variations (symbol, ticker, instrument, etc.)
  - Preview of data before import
  - Plan-based time window enforcement for imports

## User Flow

### Step 1: User clicks Import Button
- User is on trade history page (`/dashboard/trade-history`)
- Clicks the import button (FilePlus icon) in the top-right toolbar
- Gets redirected to `/dashboard/trades/import`

### Step 2: Upload CSV/Excel File
- User sees import page with drag-and-drop or click-to-select file upload
- Selects CSV or Excel file with trade data
- System parses file and auto-detects column headers
- Shows preview of detected data with auto-mapped columns
- Displays supported format info and required/optional columns

### Step 3: Review and Confirm
- User reviews the data preview
- Sees mapping of file columns to trade fields
- Clicks "Import" button to submit

### Step 4: Process and Confirm
- API validates trades and inserts to database
- Success toast notification appears: "Trades imported successfully - X trades have been added"
- After 1.5 seconds, user is redirected to trade history page
- New trades appear in the table

## Supported File Formats

- **CSV** (.csv)
- **Excel** (.xlsx, .xls)
- **Tab-separated** (.tsv)

## Required Fields

- `symbol` - Trading pair/instrument (e.g., EURUSD, AAPL)
- `direction` - Buy/Sell
- `entryPrice` - Entry price

## Optional Fields

- stopLossPrice, takeProfitPrice
- openTime, closeTime
- pnl (profit/loss)
- outcome (win/loss/breakeven)
- lotSize/volume
- orderType
- session
- strategy
- emotion
- reasonForTrade
- journalNotes/notes
- tags
- commission, swap, reviewed, pinned

## Header Auto-Mapping

The system uses intelligent regex patterns to auto-detect and map columns:

```
symbol -> symbol, ticker, instrument
openTime -> open time, open, entry_time
closeTime -> close time, close
pnl -> profit loss, pnl, netpl
entryPrice -> entry price, openPrice, price_open
stopLossPrice -> stop loss price
takeProfitPrice -> take profit price
lotSize -> lots, volume, size
direction -> side
outcome -> result
```

## API Endpoint

**POST** `/api/trades/batch`

### Request
```json
{
  "trades": [
    {
      "symbol": "EURUSD",
      "direction": "Buy",
      "entryPrice": 1.0850,
      "stopLossPrice": 1.0800,
      "takeProfitPrice": 1.0900,
      "openTime": "2024-01-15T10:30:00Z",
      "outcome": "win",
      "pnl": 50
    }
  ]
}
```

### Response
```json
{
  "message": "Trades imported successfully",
  "count": 1,
  "trades": [...]
}
```

## Error Handling

- **Authentication**: Returns 401 if user not authenticated
- **Validation**: Returns 400 if no trades provided
- **Database**: Returns 500 with error message if insertion fails
- **File Issues**: Toast error notifications for parsing failures

## Field Normalization

The batch API applies the following normalizations:

1. **Symbol**: Converted to uppercase
2. **Outcome**: Normalized to lowercase (win/loss/breakeven)
3. **Timestamps**: Converted to ISO format
4. **Prices**: Converted to numbers
5. **Tags**: Parsed from comma-separated strings to array

## Plan-Based Limitations

Enforced on the CsvUpload component:
- **Free Plan**: Can import up to 30 days of history
- **Pro Plan**: Can import up to 6 months of history
- Older trades prompt upgrade notification

## Testing Checklist

- [x] Import button redirects to import page
- [x] CSV file upload and parsing works
- [x] Excel file upload and parsing works
- [x] Header auto-mapping correctly identifies columns
- [x] Field normalization works correctly
- [x] Success toast appears with correct count
- [x] Redirect to trade history after import
- [x] New trades appear in trade history table
- [x] Error handling for invalid files
- [x] Error handling for API failures

## Files Modified

1. `src/components/dashboard/TradeHistoryTable.tsx` - Import button redirection
2. `app/api/trades/batch/route.ts` - Enhanced field mapping
3. `app/dashboard/trades/import/page.tsx` - Already existed
4. `src/components/dashboard/CsvUpload.tsx` - Already existed

## Notes

- The import page is now a full-page experience instead of a modal
- Users see clear success feedback with a dedicated success state
- Automatic redirect after successful import improves UX
- Field mapping is robust with support for multiple naming conventions
- Plan-based limitations prevent data integrity issues
