# Bulk Import Feature - Technical Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TRADE HISTORY PAGE                        │
│              (/dashboard/trade-history)                      │
│                                                               │
│   [Search] [Filter] [Export] [Import] [Migrate] [Clear]    │
│                                └──────┬──────────────┘       │
│                                       │                      │
│                    onClick: push("/dashboard/trades/import") │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    IMPORT PAGE                               │
│              (/dashboard/trades/import)                      │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  CsvUpload Component                                 │  │
│   │  ─────────────────────────────────────────────      │  │
│   │  • File Selection (CSV/XLSX/TSV)                   │  │
│   │  • File Parsing (Papa Parse / XLSX.js)             │  │
│   │  • Header Detection                                 │  │
│   │  • Auto-Mapping (Regex Patterns)                    │  │
│   │  • Data Preview                                     │  │
│   │  • Validation                                       │  │
│   │  • Plan Enforcement                                │  │
│   └──────────────────────┬──────────────────────────────┘  │
│                          │                                   │
│              onImport(trades: Trade[])                      │
│                          │                                   │
│            handleImportTrades() in ImportTradesContent      │
│                          │                                   │
└──────────────────────────┼──────────────────────────────────┘
                          │
                          ▼
            POST /api/trades/batch
            { trades: [...] }
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    BATCH API ENDPOINT                        │
│                  (/api/trades/batch)                         │
│                                                               │
│  1. Authentication Check (getServerSession)                 │
│  2. Request Validation (trades array check)                 │
│  3. Field Mapping (mapToSnakeCase)                          │
│  4. Trade Normalization                                     │
│  5. ID Generation                                           │
│  6. Database Insert (Supabase)                              │
│  7. Response with Count                                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Supabase DB
                   (trades table)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    IMPORT PAGE RESPONSE                      │
│                                                               │
│  ✅ Success Toast: "{count} trades imported"                │
│  🔄 Auto-redirect after 1.5s                                │
│  → /dashboard/trade-history                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              New trades appear in history table
```

## File Parsing Flow

```
┌──────────────┐
│ File Upload  │
└──────┬───────┘
       │
       ▼
  ┌────────────────┐
  │ Detect Format  │──> .xlsx/.xls ──> XLSX.read()
  │  by extension  │
  │                ├──> .csv/.tsv  ──> Papa Parse
  └────────────────┘
       │
       ▼
┌──────────────────────┐
│ Parse File Content   │
│                      │
│ XLSX: sheet_to_json()│
│ CSV: Papa.parse()    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Extract Headers      │
│ Object.keys(data)    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Auto-Mapping Headers         │
│ Regex patterns for columns:  │
│ • symbol/ticker/instrument   │
│ • open/openTime/entry_time   │
│ • pnl/profit/netpl           │
│ etc.                         │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Show Preview         │
│ • Detected headers   │
│ • Auto-mapping       │
│ • Data rows          │
└──────┬───────────────┘
       │
   [User Reviews]
       │
       ▼
┌──────────────────────┐
│ Type Coercion        │
│ Strings → Numbers    │
│ Dates → ISO format   │
└──────┬───────────────┘
       │
       ▼
   Ready for Import
```

## Field Mapping Logic

```javascript
mapToSnakeCase(data) {
  const raw = data.raw ?? {};
  
  return {
    // Primary field mapping with fallbacks
    symbol: coalesce(data.symbol, raw.symbol),
    direction: coalesce(data.direction, raw.direction),
    ordertype: coalesce(
      data.orderType, 
      data.ordertype, 
      data.order_type,
      raw.orderType, 
      raw.ordertype
    ),
    // ... more field mappings
    
    // Special normalizations
    outcome: normalizeOutcomeValue(
      coalesce(data.outcome, raw.outcome)
    ),
    tags: normalizeTags(
      coalesce(data.tags, raw.tags)
    ),
  };
}
```

### Coalesce Pattern
Returns first non-null/non-undefined value:
```javascript
coalesce(data.symbol, raw.symbol, "")
// Returns: data.symbol if exists, else raw.symbol, else ""
```

### Outcome Normalization
Converts all variations to canonical form:
- "WIN" → "win"
- "loss" → "loss"
- "breakeven" → "breakeven"
- Invalid values preserved as-is

### Tags Parsing
Converts various formats to array:
```javascript
// Input: "trading,scalp,eu-open"
// Output: ["trading", "scalp", "eu-open"]

// Input: ["trading", "scalp"]
// Output: ["trading", "scalp"]
```

## API Endpoint Details

### POST /api/trades/batch

**Headers:**
```
Content-Type: application/json
Authorization: (via session)
```

**Request Body:**
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
      "closeTime": "2024-01-15T11:45:00Z",
      "outcome": "win",
      "pnl": 50,
      "lotSize": 1.0,
      "orderType": "Market",
      "session": "EU",
      "strategy": "Breakout",
      "emotion": "confident",
      "journalNotes": "Good setup"
    }
  ]
}
```

**Response Success (201):**
```json
{
  "message": "Trades imported successfully",
  "count": 1,
  "trades": [
    {
      "id": "trade_1705315800000_a1b2c3d4e",
      "user_id": "user_123",
      "symbol": "EURUSD",
      "direction": "Buy",
      "entryprice": 1.0850,
      "stoplossprice": 1.0800,
      "takeprofitprice": 1.0900,
      "opentime": "2024-01-15T10:30:00.000Z",
      "closetime": "2024-01-15T11:45:00.000Z",
      "outcome": "win",
      "pnl": 50,
      "lotsize": 1,
      "ordertype": "Market",
      "session": "EU",
      "strategy": "Breakout",
      "emotion": "confident",
      "journalnotes": "Good setup",
      "created_at": "2024-01-15T12:00:00.000Z",
      "updated_at": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

401 Unauthorized:
```json
{ "error": "Unauthorized" }
```

400 Bad Request:
```json
{ "error": "No trades provided" }
```

500 Server Error:
```json
{ "error": "Database error message" }
```

## Database Schema

The trades table structure (snake_case):
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol VARCHAR NOT NULL,
  direction VARCHAR,
  ordertype VARCHAR,
  opentime TIMESTAMP,
  closetime TIMESTAMP,
  session VARCHAR,
  lotsize DECIMAL,
  entryprice DECIMAL,
  exitprice DECIMAL,
  stoplossprice DECIMAL,
  takeprofitprice DECIMAL,
  pnl DECIMAL,
  outcome VARCHAR,
  resultrr DECIMAL,
  duration VARCHAR,
  reasonfortrade TEXT,
  strategy VARCHAR,
  emotion VARCHAR,
  journalnotes TEXT,
  beforescreenshoturl VARCHAR,
  afterscreenshoturl VARCHAR,
  commission DECIMAL,
  swap DECIMAL,
  pinned BOOLEAN,
  tags TEXT[],
  reviewed BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Component Integration

### TradeHistoryTable Component
```typescript
// Import button onClick handler
onClick={() => router.push("/dashboard/trades/import")}

// No CSV modal - clean separation of concerns
// Import logic moved to dedicated import page
```

### ImportTradesContent Component
```typescript
// Main handler
const handleImportTrades = async (trades: Partial<Trade>[]) => {
  // 1. Call /api/trades/batch
  // 2. Wait for response
  // 3. Show success toast with count
  // 4. Redirect to trade history
}

// CsvUpload component handles file parsing
<CsvUpload
  isOpen={true}
  onClose={() => router.push("/dashboard/trade-history")}
  onImport={handleImportTrades}
/>
```

### CsvUpload Component
```typescript
// Main parsing functions
parseExcel(file: File)    // Uses XLSX library
parseCsvText(file: File)  // Uses PapaParser

// Auto-mapping with regex patterns
buildAutoMapping(headers: string[])

// Data validation
handleImport()  // Validates, enforces plan limits, calls onImport callback
```

## Error Handling

### Client-Side
```typescript
try {
  const response = await fetch("/api/trades/batch", { ... });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  // Success handling
} catch (error) {
  notify({
    variant: "destructive",
    title: "Error importing trades",
    description: error.message
  });
}
```

### Server-Side
```typescript
// Authentication check
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Validation
if (!Array.isArray(trades) || trades.length === 0) {
  return NextResponse.json({ error: "No trades provided" }, { status: 400 });
}

// Database error handling
if (error) {
  console.error("Supabase error:", error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

## Performance Considerations

1. **Batch Processing**: Inserts multiple trades in single database operation
2. **Client-Side Validation**: Checks data before sending to server
3. **Streaming**: Large files handled efficiently with FileReader API
4. **Progress Indication**: Visual feedback during parsing (5% → 100%)
5. **Plan Enforcement**: Done on client before API call to save bandwidth

## Security

1. **Authentication**: All requests require valid session
2. **User Isolation**: Trades tagged with user_id, no cross-user access
3. **Input Validation**: Trades array validated on server
4. **Rate Limiting**: Depends on Supabase rate limits
5. **Data Normalization**: Prevents injection attacks via field mapping

## Testing Scenarios

### Happy Path
1. ✅ User uploads valid CSV
2. ✅ Headers auto-mapped correctly
3. ✅ Data preview shows correct rows
4. ✅ Import succeeds
5. ✅ Success toast appears
6. ✅ Redirect to trade history
7. ✅ New trades visible in table

### Error Cases
1. ✅ Invalid file format
2. ✅ Missing required columns
3. ✅ Malformed data
4. ✅ Database errors
5. ✅ Plan limit exceeded
6. ✅ Unauthorized access

## Future Enhancements

1. **Column Reordering**: Let users manually map columns
2. **Data Preview Edit**: Edit data before import
3. **Partial Import**: Import with some failed rows
4. **Duplicate Detection**: Prevent importing same trades twice
5. **Template Export**: Export current trades as template
6. **Scheduled Imports**: Regular imports from external sources
7. **Broker Integrations**: Direct imports from broker APIs
