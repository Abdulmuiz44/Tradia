# Quick Reference Guide - Trade Management System

## 🚀 Quick Start

### Add a Trade
```bash
/dashboard/trades/add
```

### Edit a Trade
```bash
/dashboard/trades/edit/{tradeId}
```

### Import Trades
```bash
/dashboard/trades/import
```

### View Overview
```bash
/dashboard/overview
```

---

## 🔗 Routes

| Purpose | Route | Component |
|---------|-------|-----------|
| Add Trade | `/dashboard/trades/add` | AddTradeContent |
| Edit Trade | `/dashboard/trades/edit/[id]` | EditTradeContent |
| Import Trades | `/dashboard/trades/import` | ImportTradesContent |
| Overview | `/dashboard/overview` | OverviewContent |

---

## 🧩 Components

### AddTradeForm
```tsx
import AddTradeForm from "@/components/forms/AddTradeForm";

<AddTradeForm
  onSubmit={(trade) => handleAdd(trade)}
  isLoading={false}
/>
```

### EditTradeForm
```tsx
import EditTradeForm from "@/components/forms/EditTradeForm";

<EditTradeForm
  trade={tradeData}
  onSubmit={(trade) => handleEdit(trade)}
  isLoading={false}
/>
```

---

## 🪝 useTradeData Hook

```tsx
import { useTradeData } from "@/hooks/useTradeData";

const {
  trades,
  loading,
  error,
  refreshTrades,
  metrics,
  filterByOutcome,
  filterBySymbol,
  filterByDateRange,
  filterBySession,
  filterByStrategy,
  performanceBySymbol,
  tradesByDirection,
} = useTradeData();
```

### Metrics
```typescript
metrics: {
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

### Filter Methods
```tsx
// Filter by outcome
const wins = filterByOutcome("Win");

// Filter by symbol
const eurusd = filterBySymbol("EURUSD");

// Filter by date range
const thisMonth = filterByDateRange(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
);

// Filter by session
const usSession = filterBySession("US");

// Filter by strategy
const breakout = filterByStrategy("Breakout");
```

### Performance Analysis
```tsx
// By symbol
performanceBySymbol: {
  "EURUSD": {
    trades: Trade[];
    wins: number;
    losses: number;
    winRate: number;
    pnl: number;
  },
  ...
}

// By direction
tradesByDirection: {
  buys: Trade[];
  sells: Trade[];
}
```

---

## 📡 API Endpoints

### GET /api/trades
Fetch all trades
```tsx
const response = await fetch("/api/trades");
const trades = await response.json();
```

### POST /api/trades
Create new trade
```tsx
const response = await fetch("/api/trades", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    symbol: "EURUSD",
    direction: "Buy",
    entryPrice: 1.0950,
    stopLossPrice: 1.0900,
    takeProfitPrice: 1.1000,
    // ... other fields
  })
});
const trade = await response.json();
```

### GET /api/trades/[id]
Fetch single trade
```tsx
const response = await fetch(`/api/trades/${tradeId}`);
const trade = await response.json();
```

### PATCH /api/trades/[id]
Update trade
```tsx
const response = await fetch(`/api/trades/${tradeId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ /* fields to update */ })
});
```

### DELETE /api/trades/[id]
Delete trade
```tsx
const response = await fetch(`/api/trades/${tradeId}`, {
  method: "DELETE"
});
```

### POST /api/trades/batch
Import multiple trades
```tsx
const response = await fetch("/api/trades/batch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ trades: [...] })
});
const result = await response.json(); // { count, trades }
```

---

## 🔀 Navigation

### From component
```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

// Add trade
router.push("/dashboard/trades/add");

// Edit trade
router.push(`/dashboard/trades/edit/${tradeId}`);

// Import trades
router.push("/dashboard/trades/import");

// Back
router.back();
```

---

## 📊 Common Patterns

### Display Trade Stats
```tsx
<div>
  <p>Total: {metrics.totalTrades}</p>
  <p>Win Rate: {metrics.winRate}%</p>
  <p>Avg RR: {metrics.avgRR.toFixed(2)}R</p>
  <p>Total PnL: ${metrics.totalPnL.toFixed(2)}</p>
</div>
```

### Display Trade Table
```tsx
<table>
  <thead>
    <tr>
      <th>Symbol</th>
      <th>Direction</th>
      <th>Entry</th>
      <th>PnL</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    {trades.map(trade => (
      <tr key={trade.id}>
        <td>{trade.symbol}</td>
        <td>{trade.direction}</td>
        <td>{trade.entryPrice.toFixed(5)}</td>
        <td className={trade.pnl >= 0 ? "text-green-600" : "text-red-600"}>
          ${trade.pnl.toFixed(2)}
        </td>
        <td>
          <button onClick={() => router.push(`/dashboard/trades/edit/${trade.id}`)}>
            Edit
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Display Best/Worst Trades
```tsx
{metrics.bestTrade && (
  <div className="bg-green-50 p-4 rounded">
    <h3>Best Trade</h3>
    <p>{metrics.bestTrade.symbol} - ${metrics.bestTrade.pnl.toFixed(2)}</p>
  </div>
)}

{metrics.worstTrade && (
  <div className="bg-red-50 p-4 rounded">
    <h3>Worst Trade</h3>
    <p>{metrics.worstTrade.symbol} - ${metrics.worstTrade.pnl.toFixed(2)}</p>
  </div>
)}
```

### Loading State
```tsx
const { trades, loading } = useTradeData();

if (loading) return <Spinner />;
if (!trades) return <p>No trades</p>;

return <YourComponent trades={trades} />;
```

---

## ⚠️ Error Handling

```tsx
try {
  const response = await fetch("/api/trades", {
    method: "POST",
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const result = await response.json();
  // Handle success
} catch (error) {
  console.error(error.message);
  // Show error to user
}
```

---

## 📝 Required Fields

When creating/updating trades:

```typescript
// Minimum required
{
  symbol: string;        // e.g., "EURUSD"
  direction: string;     // "Buy" or "Sell"
  entryPrice: number;    // > 0
  stopLossPrice: number; // > 0
}

// Recommended
{
  takeProfitPrice: number;
  openTime: string;
  closeTime: string;
  pnl: number;
  outcome: string;       // "Win", "Loss", or "Breakeven"
}

// Optional
{
  lotSize: number;
  orderType: string;
  session: string;
  duration: string;
  strategy: string;
  emotion: string;
  journalNotes: string;
  reasonForTrade: string;
  beforeScreenshotUrl: string;
  afterScreenshotUrl: string;
}
```

---

## 🔒 Security Notes

- All data must go through API routes (no direct Supabase calls from client)
- User authentication required for all operations
- RLS policies enforce user isolation
- Server-side validation on all inputs
- No sensitive data in metadata

---

## 💡 Pro Tips

1. **Use useTradeData in all pages** that need trades - it's centralized and efficient
2. **Redirect instead of modals** - use `router.push()` for add/edit/import
3. **Cache trades in context** - don't fetch repeatedly
4. **Show loading states** - users appreciate visual feedback
5. **Handle errors gracefully** - show notifications, not alerts
6. **Filter before display** - use hook methods like `filterBySymbol()`
7. **Memoize expensive calculations** - use `useMemo` for metrics
8. **Test RLS policies** - ensure user isolation works

---

## 📚 Documentation Files

- **TRADE_MANAGEMENT_RESTRUCTURE.md** - Complete architecture
- **TRADE_RESTRUCTURE_CHECKLIST.md** - Implementation tasks
- **INTEGRATION_EXAMPLES.md** - Full code examples
- **RESTRUCTURE_SUMMARY.md** - High-level overview
- **QUICK_REFERENCE.md** - This file

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Trades not saving | Check API response, verify auth, check console |
| Form not submitting | Check validation, ensure all required fields |
| Trades not appearing | Check RLS, verify user_id, refresh page |
| Loading never stops | Check error state, verify API endpoint |
| Edit page shows 404 | Verify trade exists, check trade ID parameter |

---

## 📞 Need Help?

1. Check the documentation files first
2. Look at INTEGRATION_EXAMPLES.md
3. Check browser console for errors
4. Verify Supabase connection
5. Test API endpoints directly

---

Last updated: January 2025  
Version: 1.0  
Status: ✅ Complete
