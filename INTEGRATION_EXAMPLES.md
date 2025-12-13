# Trade Management Integration Examples

Quick copy-paste examples for integrating the new trade system into existing pages.

## 1. Basic Trade History Integration

```tsx
// /app/dashboard/trade-history/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTradeData } from "@/hooks/useTradeData";
import { Plus, Upload } from "lucide-react";

export function TradeHistoryContent() {
  const router = useRouter();
  const { trades, metrics, loading } = useTradeData();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg">
          <p className="text-sm text-gray-600">Total Trades</p>
          <p className="text-2xl font-bold">{metrics.totalTrades}</p>
        </div>
        <div className="p-4 bg-white rounded-lg">
          <p className="text-sm text-gray-600">Win Rate</p>
          <p className="text-2xl font-bold">{metrics.winRate}%</p>
        </div>
        <div className="p-4 bg-white rounded-lg">
          <p className="text-sm text-gray-600">Total PnL</p>
          <p className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${metrics.totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg">
          <p className="text-sm text-gray-600">Avg RR</p>
          <p className="text-2xl font-bold">{metrics.avgRR.toFixed(2)}R</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push("/dashboard/trades/add")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Trade
        </button>
        <button
          onClick={() => router.push("/dashboard/trades/import")}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Upload size={18} />
          Import Trades
        </button>
      </div>

      {/* Trade Table */}
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Symbol</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Direction</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Entry Price</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">PnL</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Outcome</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr key={trade.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">{trade.symbol}</td>
                <td className="px-6 py-4 text-sm">{trade.direction}</td>
                <td className="px-6 py-4 text-sm">{trade.entryPrice.toFixed(5)}</td>
                <td className={`px-6 py-4 text-sm font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${trade.pnl.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm">{trade.outcome}</td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => router.push(`/dashboard/trades/edit/${trade.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## 2. Trade Journal with useTradeData

```tsx
// /app/dashboard/trade-journal/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTradeData } from "@/hooks/useTradeData";

export function TradeJournalContent() {
  const router = useRouter();
  const { trades } = useTradeData();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Trade Journal</h2>
      
      <div className="grid grid-cols-1 gap-6">
        {trades.map(trade => (
          <div key={trade.id} className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {trade.symbol} • {trade.direction}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(trade.openTime).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                trade.outcome === 'Win' ? 'bg-green-100 text-green-800' :
                trade.outcome === 'Loss' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {trade.outcome}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-gray-700">{trade.journalNotes}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Entry Price:</span> {trade.entryPrice.toFixed(5)}
              </div>
              <div>
                <span className="font-medium">PnL:</span> ${trade.pnl.toFixed(2)}
              </div>
            </div>

            <button
              onClick={() => router.push(`/dashboard/trades/edit/${trade.id}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit Entry
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 3. Trade Analytics with Filtering

```tsx
// /app/dashboard/trade-analytics/page.tsx
"use client";

import { useState } from "react";
import { useTradeData } from "@/hooks/useTradeData";

export function TradeAnalyticsContent() {
  const { 
    trades, 
    metrics, 
    performanceBySymbol, 
    filterByOutcome, 
    filterBySymbol 
  } = useTradeData();
  
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const symbolPerf = selectedSymbol 
    ? performanceBySymbol[selectedSymbol]
    : null;

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg">
          <p className="text-gray-600">Win Rate</p>
          <p className="text-3xl font-bold">{metrics.winRate}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg">
          <p className="text-gray-600">Avg Win/Loss Ratio</p>
          <p className="text-3xl font-bold">{metrics.avgRR.toFixed(2)}R</p>
        </div>
        <div className="bg-white p-6 rounded-lg">
          <p className="text-gray-600">Total PnL</p>
          <p className={`text-3xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${metrics.totalPnL.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Symbol Performance */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Performance by Symbol</h3>
        <div className="space-y-2">
          {Object.entries(performanceBySymbol).map(([symbol, perf]) => (
            <div
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              className={`p-4 rounded cursor-pointer transition-colors ${
                selectedSymbol === symbol
                  ? 'bg-blue-50 border-l-4 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{symbol}</p>
                  <p className="text-sm text-gray-600">
                    {perf.trades.length} trades • {perf.winRate}% win rate
                  </p>
                </div>
                <p className={`text-lg font-bold ${perf.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${perf.pnl.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Symbol Details */}
      {symbolPerf && (
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">{selectedSymbol} Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Total Trades</p>
              <p className="text-2xl font-bold">{symbolPerf.trades.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold">{symbolPerf.winRate}%</p>
            </div>
            <div>
              <p className="text-gray-600">Wins</p>
              <p className="text-2xl font-bold text-green-600">{symbolPerf.wins}</p>
            </div>
            <div>
              <p className="text-gray-600">Losses</p>
              <p className="text-2xl font-bold text-red-600">{symbolPerf.losses}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 4. Risk Management Dashboard

```tsx
// /app/dashboard/risk-management/page.tsx
"use client";

import { useTradeData } from "@/hooks/useTradeData";

export function RiskManagementContent() {
  const { 
    trades, 
    metrics, 
    performanceBySymbol, 
    tradesByDirection,
    filterBySession 
  } = useTradeData();

  // Calculate risk metrics
  const maxDrawdown = trades.reduce((max, trade, i) => {
    const cumulativePnL = trades.slice(0, i + 1).reduce((sum, t) => sum + t.pnl, 0);
    return Math.min(max, cumulativePnL);
  }, 0);

  const largestWinningTrade = Math.max(...trades.map(t => t.pnl), 0);
  const largestLosingTrade = Math.min(...trades.map(t => t.pnl), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Risk Management</h2>

      {/* Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg">
          <p className="text-sm text-gray-600">Max Drawdown</p>
          <p className="text-2xl font-bold text-red-600">${Math.abs(maxDrawdown).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg">
          <p className="text-sm text-gray-600">Largest Win</p>
          <p className="text-2xl font-bold text-green-600">${largestWinningTrade.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg">
          <p className="text-sm text-gray-600">Largest Loss</p>
          <p className="text-2xl font-bold text-red-600">${largestLosingTrade.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg">
          <p className="text-sm text-gray-600">Risk-Reward Ratio</p>
          <p className="text-2xl font-bold">{metrics.avgRR.toFixed(2)}:1</p>
        </div>
      </div>

      {/* Symbol Risk Analysis */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Risk by Symbol</h3>
        <div className="space-y-3">
          {Object.entries(performanceBySymbol).map(([symbol, perf]) => {
            const riskLevel = 
              perf.winRate > 60 ? 'low' : 
              perf.winRate > 40 ? 'medium' : 
              'high';
            
            return (
              <div key={symbol} className="flex items-center justify-between p-4 border rounded">
                <div>
                  <p className="font-semibold">{symbol}</p>
                  <p className="text-sm text-gray-600">{perf.trades.length} trades</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                    riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                  </span>
                  <p className="font-semibold w-20 text-right">{perf.winRate}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direction Analysis */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Buy Performance</h3>
          {tradesByDirection.buys.length > 0 ? (
            <>
              <p className="text-sm text-gray-600">Trades: {tradesByDirection.buys.length}</p>
              <p className="text-sm text-gray-600 mt-2">
                PnL: ${tradesByDirection.buys.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}
              </p>
            </>
          ) : (
            <p className="text-gray-400">No buy trades</p>
          )}
        </div>
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Sell Performance</h3>
          {tradesByDirection.sells.length > 0 ? (
            <>
              <p className="text-sm text-gray-600">Trades: {tradesByDirection.sells.length}</p>
              <p className="text-sm text-gray-600 mt-2">
                PnL: ${tradesByDirection.sells.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}
              </p>
            </>
          ) : (
            <p className="text-gray-400">No sell trades</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

## 5. Reporting with Best/Worst Trades

```tsx
// /app/dashboard/reporting/page.tsx
"use client";

import { useTradeData } from "@/hooks/useTradeData";

export function ReportingContent() {
  const { metrics, trades } = useTradeData();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Trading Report</h2>

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Executive Summary</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100">Total Trades</p>
            <p className="text-3xl font-bold">{metrics.totalTrades}</p>
          </div>
          <div>
            <p className="text-blue-100">Win Rate</p>
            <p className="text-3xl font-bold">{metrics.winRate}%</p>
          </div>
          <div>
            <p className="text-blue-100">Profit Factor</p>
            <p className="text-3xl font-bold">
              {metrics.totalLosses > 0 
                ? (Math.abs(metrics.totalPnL) / Math.abs(metrics.totalPnL - metrics.avgPnL * metrics.totalLosses)).toFixed(2)
                : '∞'}
            </p>
          </div>
          <div>
            <p className="text-blue-100">Total PnL</p>
            <p className="text-3xl font-bold">${metrics.totalPnL.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Best and Worst Trades */}
      {metrics.bestTrade && metrics.worstTrade && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-bold mb-4 text-green-900">Best Trade</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Symbol:</span> {metrics.bestTrade.symbol}</p>
              <p><span className="font-medium">Direction:</span> {metrics.bestTrade.direction}</p>
              <p><span className="font-medium">PnL:</span> <span className="text-green-600 font-bold">${metrics.bestTrade.pnl.toFixed(2)}</span></p>
              <p><span className="font-medium">RR:</span> {metrics.bestTrade.resultRR.toFixed(2)}R</p>
              <p><span className="font-medium">Entry:</span> {metrics.bestTrade.entryPrice.toFixed(5)}</p>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-6 border-l-4 border-red-500">
            <h3 className="text-lg font-bold mb-4 text-red-900">Worst Trade</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Symbol:</span> {metrics.worstTrade.symbol}</p>
              <p><span className="font-medium">Direction:</span> {metrics.worstTrade.direction}</p>
              <p><span className="font-medium">PnL:</span> <span className="text-red-600 font-bold">${metrics.worstTrade.pnl.toFixed(2)}</span></p>
              <p><span className="font-medium">RR:</span> {metrics.worstTrade.resultRR.toFixed(2)}R</p>
              <p><span className="font-medium">Entry:</span> {metrics.worstTrade.entryPrice.toFixed(5)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Trade Breakdown */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Trade Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Winning Trades</p>
            <p className="text-2xl font-bold text-green-600">{metrics.profitTrades}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Losing Trades</p>
            <p className="text-2xl font-bold text-red-600">{metrics.lossTrades}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Breakeven Trades</p>
            <p className="text-2xl font-bold text-gray-600">{metrics.breakevenTrades}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 6. Quick Button Component

```tsx
// Reusable button component for adding/editing trades
import { useRouter } from "next/navigation";
import { Plus, Edit2 } from "lucide-react";

export function TradeActionButtons({ tradeId }: { tradeId?: string }) {
  const router = useRouter();

  if (tradeId) {
    return (
      <button
        onClick={() => router.push(`/dashboard/trades/edit/${tradeId}`)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <Edit2 size={16} />
        Edit
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push("/dashboard/trades/add")}
      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      <Plus size={16} />
      Add Trade
    </button>
  );
}
```

## 7. Loading State Component

```tsx
import { useTradeData } from "@/hooks/useTradeData";
import Spinner from "@/components/ui/spinner";

export function TradeDataLoader({ children }: { children: (data: any) => React.ReactNode }) {
  const tradeData = useTradeData();

  if (tradeData.loading) {
    return <Spinner />;
  }

  if (tradeData.error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg text-red-800">
        <p className="font-bold">Error loading trades</p>
        <p className="text-sm">{tradeData.error.message}</p>
      </div>
    );
  }

  return <>{children(tradeData)}</>;
}

// Usage:
<TradeDataLoader>
  {({ trades, metrics }) => (
    <div>
      <h2>Total: {metrics.totalTrades}</h2>
    </div>
  )}
</TradeDataLoader>
```

---

All these examples use the centralized `useTradeData()` hook and the new page-based navigation system. Copy and adapt as needed!
