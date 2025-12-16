# Trade Management System Restructure

## Overview

This document outlines the comprehensive restructuring of the Tradia trading management system. Instead of modal-based interactions, users are now redirected to dedicated pages for adding, editing, and importing trades. All trade data flows through Supabase and is properly structured for use across the entire application.

## New Structure

### Pages

#### 1. **Add Trade Page** (`/dashboard/trades/add`)
- **Purpose**: Dedicated page for creating new trades
- **Route**: `/dashboard/trades/add`
- **Component**: `AddTradeContent` with `AddTradeForm`
- **Features**:
  - Full form validation
  - Real-time error handling
  - All trade fields supported
  - Immediate Supabase persistence
  - Redirect to trade history after save

**Usage**:
```tsx
router.push("/dashboard/trades/add");
```

#### 2. **Edit Trade Page** (`/dashboard/trades/edit/[id]`)
- **Purpose**: Edit existing trades
- **Route**: `/dashboard/trades/edit/[tradeId]`
- **Component**: `EditTradeContent` with `EditTradeForm`
- **Features**:
  - Load trade by ID from Supabase
  - Full edit capability
  - Delete button with confirmation
  - Real-time updates
  - Error handling with fallback

**Usage**:
```tsx
router.push(`/dashboard/trades/edit/${tradeId}`);
```

#### 3. **Import Trades Page** (`/dashboard/trades/import`)
- **Purpose**: Bulk import trades from CSV/Excel
- **Route**: `/dashboard/trades/import`
- **Component**: `ImportTradesContent` with `CsvUpload`
- **Features**:
  - CSV, Excel, TSV file support
  - Visual success state
  - Import count tracking
  - Batch processing via API
  - Automatic redirect to trade history

**Usage**:
```tsx
router.push("/dashboard/trades/import");
```

#### 4. **Overview Page** (`/dashboard/overview`)
- **Purpose**: Centralized dashboard with trade metrics
- **Route**: `/dashboard/overview`
- **Component**: `OverviewContent` with `OverviewCards`
- **Features**:
  - Displays summary cards with trade statistics
  - Filterable by date range
  - Real-time sync capability
  - Admin-only analytics

### API Routes

#### GET `/api/trades`
Fetch all trades for authenticated user.

**Response**:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "symbol": "EURUSD",
    "side": "buy",
    "quantity": 1.0,
    "price": 1.0950,
    "pnl": 150.00,
    "timestamp": "2025-01-15T10:30:00Z",
    "status": "closed",
    "metadata": { ... }
  }
]
```

#### POST `/api/trades`
Create a new trade.

**Request Body**:
```json
{
  "symbol": "EURUSD",
  "direction": "Buy",
  "entryPrice": 1.0950,
  "stopLossPrice": 1.0900,
  "takeProfitPrice": 1.1000,
  "lotSize": 1.0,
  "pnl": 150.00,
  "outcome": "Win",
  "openTime": "2025-01-15T10:30:00Z",
  "closeTime": "2025-01-15T12:30:00Z"
}
```

#### GET `/api/trades/[id]`
Fetch a specific trade by ID.

#### PATCH `/api/trades/[id]`
Update a specific trade.

**Request Body**: Same structure as POST (all fields optional)

#### DELETE `/api/trades/[id]`
Delete a trade by ID.

#### POST `/api/trades/batch`
Import multiple trades at once.

**Request Body**:
```json
{
  "trades": [
    { "symbol": "EURUSD", ... },
    { "symbol": "GBPUSD", ... }
  ]
}
```

**Response**:
```json
{
  "message": "Trades imported successfully",
  "count": 2,
  "trades": [ ... ]
}
```

### Components

#### `AddTradeForm` (`src/components/forms/AddTradeForm.tsx`)
- Reusable form for adding trades
- Props:
  - `onSubmit: (trade: Partial<Trade>) => void`
  - `isLoading?: boolean`

#### `EditTradeForm` (`src/components/forms/EditTradeForm.tsx`)
- Reusable form for editing trades
- Props:
  - `trade: Trade` (initial values)
  - `onSubmit: (trade: Partial<Trade>) => void`
  - `isLoading?: boolean`

### Hooks

#### `useTradeData()` (`src/hooks/useTradeData.ts`)
Centralized hook for trade data access and processing. Use this in all pages that need trade data.

**Usage**:
```tsx
const {
  trades,
  loading,
  metrics,
  filterByOutcome,
  filterBySymbol,
  performanceBySymbol,
} = useTradeData();
```

**Available Methods**:
- `filterByOutcome(outcome: "Win" | "Loss" | "Breakeven")`
- `filterBySymbol(symbol: string)`
- `filterByDateRange(startDate: Date, endDate: Date)`
- `filterBySession(session: string)`
- `filterByStrategy(strategy: string)`

**Metrics Object**:
```tsx
{
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
  avgRR: number;
  symbols: string[];
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}
```

## Data Flow

### Adding a Trade

```
User clicks "Add Trade" button
  ↓
Router redirects to `/dashboard/trades/add`
  ↓
AddTradeForm renders with empty form
  ↓
User fills form and submits
  ↓
POST /api/trades
  ↓
API creates record in Supabase trades table
  ↓
Success notification shown
  ↓
Redirect to `/dashboard/trade-history`
  ↓
Trade appears in history table with live data
```

### Editing a Trade

```
User clicks edit icon on trade row
  ↓
Router redirects to `/dashboard/trades/edit/[id]`
  ↓
API fetches trade by ID
  ↓
EditTradeForm loads with pre-filled data
  ↓
User modifies and submits
  ↓
PATCH /api/trades/[id]
  ↓
API updates record in Supabase
  ↓
Redirect to `/dashboard/trade-history`
  ↓
Updated trade appears immediately
```

### Importing Trades

```
User clicks "Import" button
  ↓
Router redirects to `/dashboard/trades/import`
  ↓
ImportTradesContent shows upload UI
  ↓
User selects CSV/Excel file
  ↓
CsvUpload parses file
  ↓
POST /api/trades/batch
  ↓
API creates all records in Supabase
  ↓
Success state with count
  ↓
User clicks "View Trade History"
  ↓
Redirect to `/dashboard/trade-history`
  ↓
All imported trades visible in table
```

## Supabase Integration

### Tables Structure

All trades are stored in the `trades` table with RLS policies for user isolation:

```sql
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL,
  price DECIMAL,
  pnl DECIMAL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trades
CREATE POLICY "Users can view own trades" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON public.trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON public.trades
  FOR DELETE USING (auth.uid() = user_id);
```

### Metadata Field

Extended trade data is stored in the `metadata` JSONB field:

```json
{
  "direction": "Buy",
  "orderType": "Market Execution",
  "openTime": "2025-01-15T10:30:00Z",
  "closeTime": "2025-01-15T12:30:00Z",
  "session": "US",
  "stopLossPrice": 1.0900,
  "takeProfitPrice": 1.1000,
  "outcome": "Win",
  "resultRR": 2.5,
  "duration": "2h 0m",
  "reasonForTrade": "...",
  "strategy": "...",
  "emotion": "calm",
  "journalNotes": "...",
  "beforeScreenshotUrl": "...",
  "afterScreenshotUrl": "..."
}
```

## Usage Examples

### In Trade History Page

```tsx
import { useTradeData } from "@/hooks/useTradeData";

export function TradeHistoryPage() {
  const { trades, metrics, filterBySymbol } = useTradeData();
  
  return (
    <div>
      <h2>Total Trades: {metrics.totalTrades}</h2>
      <h2>Win Rate: {metrics.winRate}%</h2>
      <button onClick={() => router.push("/dashboard/trades/add")}>
        Add Trade
      </button>
      <button onClick={() => router.push("/dashboard/trades/import")}>
        Import Trades
      </button>
    </div>
  );
}
```

### In Trade Journal Page

```tsx
import { useTradeData } from "@/hooks/useTradeData";

export function TradeJournalPage() {
  const { trades, filterByOutcome } = useTradeData();
  const winTrades = filterByOutcome("Win");
  
  return (
    <div>
      {winTrades.map(trade => (
        <div key={trade.id}>
          <p>{trade.symbol}: {trade.journalNotes}</p>
          <button onClick={() => router.push(`/dashboard/trades/edit/${trade.id}`)}>
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}
```

### In Risk Management Page

```tsx
import { useTradeData } from "@/hooks/useTradeData";

export function RiskManagementPage() {
  const { trades, performanceBySymbol } = useTradeData();
  
  return (
    <div>
      {Object.entries(performanceBySymbol).map(([symbol, perf]) => (
        <div key={symbol}>
          <p>{symbol}: {perf.winRate}% win rate</p>
          <p>Total PnL: ${perf.pnl}</p>
        </div>
      ))}
    </div>
  );
}
```

## Navigation Updates

Update your navigation/sidebar components to link to the new pages:

```tsx
<NavLink href="/dashboard/overview">Overview</NavLink>
<NavLink href="/dashboard/trades/add">Add Trade</NavLink>
<NavLink href="/dashboard/trades/import">Import Trades</NavLink>
<NavLink href="/dashboard/trade-history">Trade History</NavLink>
<NavLink href="/dashboard/trade-journal">Trade Journal</NavLink>
<NavLink href="/dashboard/trade-analytics">Analytics</NavLink>
```

## Migration Guide

### For Existing Modal-Based Code

**Before**:
```tsx
<button onClick={() => setIsAddOpen(true)}>Add Trade</button>
<AddTradeModal isOpen={isAddOpen} onSave={handleAddTrade} />
```

**After**:
```tsx
<button onClick={() => router.push("/dashboard/trades/add")}>Add Trade</button>
```

### Error Handling

All API routes return proper error responses:

```tsx
try {
  const response = await fetch("/api/trades", { method: "POST", body });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
} catch (error) {
  notify({ variant: "destructive", title: "Error", description: error.message });
}
```

## Security

- ✅ Row Level Security (RLS) enforced in Supabase
- ✅ User authentication via NextAuth
- ✅ Server-side validation in API routes
- ✅ User ID verified server-side
- ✅ No client-side data manipulation possible

## Performance

- 🚀 Lazy-loaded pages (dynamic imports)
- 🚀 Cached trades via context
- 🚀 Optimized queries with indexes
- 🚀 Batch import for multiple trades
- 🚀 Pagination in table views

## Testing Checklist

- [ ] Add trade from `/dashboard/trades/add`
- [ ] Edit trade from `/dashboard/trades/edit/[id]`
- [ ] Delete trade from edit page
- [ ] Import CSV file from `/dashboard/trades/import`
- [ ] Verify all trades appear in `/dashboard/trade-history`
- [ ] Check metrics on `/dashboard/overview`
- [ ] Test filtering by date, symbol, outcome
- [ ] Verify RLS policies work correctly
- [ ] Test on mobile and desktop
- [ ] Check error handling with invalid data

## Future Enhancements

- [ ] Batch edit multiple trades
- [ ] Advanced filtering UI
- [ ] Trade templates
- [ ] Automatic trade import from brokers
- [ ] Real-time sync with multiple devices
- [ ] Webhooks for trade notifications
- [ ] Machine learning insights
