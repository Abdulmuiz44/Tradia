// src/components/chat/TradePickerPanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, X, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Trade } from '@/types/trade';

interface TradePickerPanelProps {
  trades?: Trade[];
  selectedTradeIds?: string[];
  onTradeSelect?: (tradeIds: string[]) => void;
  onAttachTrades?: (tradeIds: string[]) => void;
  summary?: {
    totalTrades: number;
    winRate: number;
    netPnL: number;
    avgRR: number;
    maxDrawdown: number;
  };
}

export const TradePickerPanel: React.FC<TradePickerPanelProps> = ({
  trades = [],
  selectedTradeIds = [],
  onTradeSelect,
  onAttachTrades,
  summary,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [symbolFilter, setSymbolFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedTradeIds);

  useEffect(() => {
    setLocalSelectedIds(selectedTradeIds);
  }, [selectedTradeIds]);

  // Get unique symbols for filter
  const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol)));

  // Filter and sort trades
  const filteredTrades = trades
    .filter(trade => {
      const matchesSearch = searchQuery === '' ||
        trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.strategy_tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSymbol = symbolFilter === 'all' || trade.symbol === symbolFilter;
      const matchesOutcome = outcomeFilter === 'all' || trade.outcome === outcomeFilter;

      return matchesSearch && matchesSymbol && matchesOutcome;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime();
        case 'date-asc':
          return new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime();
        case 'pnl-desc':
          return b.pnl - a.pnl;
        case 'pnl-asc':
          return a.pnl - b.pnl;
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        default:
          return 0;
      }
    });

  const handleTradeToggle = (tradeId: string) => {
    const newSelected = localSelectedIds.includes(tradeId)
      ? localSelectedIds.filter(id => id !== tradeId)
      : [...localSelectedIds, tradeId];
    setLocalSelectedIds(newSelected);
    onTradeSelect?.(newSelected);
  };

  const handleAttachSelected = () => {
    if (localSelectedIds.length > 0) {
      onAttachTrades?.(localSelectedIds);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSymbolFilter('all');
    setOutcomeFilter('all');
    setSortBy('date-desc');
  };

  return (
    <div className="w-96 border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Trade Picker</h2>
          {localSelectedIds.length > 0 && (
            <Badge variant="secondary">
              {localSelectedIds.length} selected
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search trades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-700"
          />
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Select value={symbolFilter} onValueChange={setSymbolFilter}>
              <SelectTrigger className="flex-1 bg-gray-900 border-gray-700">
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Symbols</SelectItem>
                {uniqueSymbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="flex-1 bg-gray-900 border-gray-700">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="win">Wins</SelectItem>
                <SelectItem value="loss">Losses</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-gray-900 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="pnl-desc">Highest P&L</SelectItem>
                <SelectItem value="pnl-asc">Lowest P&L</SelectItem>
                <SelectItem value="symbol">Symbol A-Z</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Attach Button */}
        {localSelectedIds.length > 0 && (
          <Button
            onClick={handleAttachSelected}
            className="w-full mt-4"
          >
            Attach {localSelectedIds.length} Trade{localSelectedIds.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Content */}
      <Tabs defaultValue="trades" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {filteredTrades.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Filter className="h-8 w-8 mx-auto mb-2" />
                  <p>No trades match your filters</p>
                </div>
              ) : (
                filteredTrades.map((trade) => (
                  <TradeItem
                    key={trade.id}
                    trade={trade}
                    isSelected={localSelectedIds.includes(trade.id)}
                    onToggle={() => handleTradeToggle(trade.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="summary" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {summary ? (
                <SummaryCard summary={summary} />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>No summary data available</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface TradeItemProps {
  trade: Trade;
  isSelected: boolean;
  onToggle: () => void;
}

const TradeItem: React.FC<TradeItemProps> = ({ trade, isSelected, onToggle }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(trade));
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-600 border-blue-500'
          : 'bg-gray-900 border-gray-700 hover:bg-gray-800'
      }`}
      onClick={onToggle}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={isSelected}
            onChange={onToggle}
            className="pointer-events-none"
          />
          <div>
            <div className="font-medium">{trade.symbol}</div>
            <div className="text-sm text-gray-400">
              {new Date(trade.entry_time).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`font-medium ${
            trade.outcome === 'win' ? 'text-green-400' : trade.outcome === 'loss' ? 'text-red-400' : 'text-gray-400'
          }`}>
            ${trade.pnl.toFixed(2)}
          </div>
          <div className={`text-xs ${
            trade.outcome === 'win' ? 'text-green-300' : trade.outcome === 'loss' ? 'text-red-300' : 'text-gray-300'
          }`}>
            {trade.outcome.toUpperCase()}
          </div>
        </div>
      </div>
      {trade.notes && (
        <div className="text-sm text-gray-400 mt-2 truncate">
          {trade.notes}
        </div>
      )}
      {trade.strategy_tags && trade.strategy_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {trade.strategy_tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

interface SummaryCardProps {
  summary: {
    totalTrades: number;
    winRate: number;
    netPnL: number;
    avgRR: number;
    maxDrawdown: number;
  };
}

const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Trading Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{summary.totalTrades}</div>
            <div className="text-sm text-gray-400">Total Trades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{summary.winRate}%</div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${summary.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${summary.netPnL.toFixed(2)}
            </div>
            <div className="text-sm text-gray-400">Net P&L</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{summary.avgRR.toFixed(2)}</div>
            <div className="text-sm text-gray-400">Avg R:R</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-red-400">${summary.maxDrawdown.toFixed(2)}</div>
          <div className="text-sm text-gray-400">Max Drawdown</div>
        </div>

        <div className="flex items-center justify-center space-x-4 mt-6">
          <div className="flex items-center text-green-400">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span className="text-sm">Profitable</span>
          </div>
          <div className="flex items-center text-red-400">
            <TrendingDown className="h-4 w-4 mr-1" />
            <span className="text-sm">Drawdown</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
