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
          return new Date(b.entry_time || 0).getTime() - new Date(a.entry_time || 0).getTime();
        case 'date-asc':
          return new Date(a.entry_time || 0).getTime() - new Date(b.entry_time || 0).getTime();
        case 'pnl-desc':
          return (b.pnl || 0) - (a.pnl || 0);
        case 'pnl-asc':
          return (a.pnl || 0) - (b.pnl || 0);
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
    <div className="w-96 border-l border-indigo-500/40 bg-[#050b18] text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-indigo-500/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Trade Picker</h2>
          {localSelectedIds.length > 0 && (
            <Badge className="border border-indigo-500/40 bg-indigo-500/10 text-white">
              {localSelectedIds.length} selected
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
          <Input
            placeholder="Search trades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-indigo-500/40 bg-[#050b18] pl-10 text-sm font-medium text-white placeholder:text-white/50 focus:border-indigo-300 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Select value={symbolFilter} onValueChange={setSymbolFilter}>
              <SelectTrigger className="flex-1 border border-indigo-500/40 bg-[#050b18] text-sm font-medium text-white focus:border-indigo-300 focus:outline-none">
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent className="border border-indigo-500/40 bg-[#050b18] text-white">
                <SelectItem value="all" className="text-white data-[highlighted]:bg-indigo-500/10">All Symbols</SelectItem>
                {uniqueSymbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol} className="text-white data-[highlighted]:bg-indigo-500/10">{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="flex-1 border border-indigo-500/40 bg-[#050b18] text-sm font-medium text-white focus:border-indigo-300 focus:outline-none">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent className="border border-indigo-500/40 bg-[#050b18] text-white">
                <SelectItem value="all" className="text-white data-[highlighted]:bg-indigo-500/10">All Outcomes</SelectItem>
                <SelectItem value="win" className="text-white data-[highlighted]:bg-indigo-500/10">Wins</SelectItem>
                <SelectItem value="loss" className="text-white data-[highlighted]:bg-indigo-500/10">Losses</SelectItem>
                <SelectItem value="breakeven" className="text-white data-[highlighted]:bg-indigo-500/10">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="border border-indigo-500/40 bg-[#050b18] text-sm font-medium text-white focus:border-indigo-300 focus:outline-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border border-indigo-500/40 bg-[#050b18] text-white">
                <SelectItem value="date-desc" className="text-white data-[highlighted]:bg-indigo-500/10">Newest First</SelectItem>
                <SelectItem value="date-asc" className="text-white data-[highlighted]:bg-indigo-500/10">Oldest First</SelectItem>
                <SelectItem value="pnl-desc" className="text-white data-[highlighted]:bg-indigo-500/10">Highest P&L</SelectItem>
                <SelectItem value="pnl-asc" className="text-white data-[highlighted]:bg-indigo-500/10">Lowest P&L</SelectItem>
                <SelectItem value="symbol" className="text-white data-[highlighted]:bg-indigo-500/10">Symbol A-Z</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="rounded-full border border-indigo-500/40 bg-[#050b18] px-3 text-white/70 transition hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Attach Button */}
        {localSelectedIds.length > 0 && (
          <Button
            onClick={handleAttachSelected}
            className="w-full mt-4 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-white transition hover:border-indigo-300 hover:bg-indigo-500/20"
          >
            Attach {localSelectedIds.length} Trade{localSelectedIds.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Content */}
      <Tabs defaultValue="trades" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 rounded-full border border-indigo-500/40 bg-[#050b18] text-white">
          <TabsTrigger value="trades" className="rounded-full text-white/70 data-[state=active]:border data-[state=active]:border-indigo-400 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-white">Trades</TabsTrigger>
          <TabsTrigger value="summary" className="rounded-full text-white/70 data-[state=active]:border data-[state=active]:border-indigo-400 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-white">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {filteredTrades.length === 0 ? (
                <div className="py-8 text-center text-white/60">
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
                <div className="py-8 text-center text-white/60">
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
      className={`p-3 rounded-xl border cursor-pointer transition-colors ${
        isSelected
          ? 'border-indigo-400/70 bg-indigo-500/15 shadow-[0_12px_32px_rgba(5,11,24,0.45)]'
          : 'border-indigo-500/40 bg-[#050b18] hover:border-indigo-300 hover:bg-indigo-500/10'
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
            <div className="font-medium text-white">{trade.symbol}</div>
            <div className="text-sm text-white/60">
              {trade.entry_time ? new Date(trade.entry_time).toLocaleDateString() : 'Date unavailable'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-white">
            ${(trade.pnl ?? 0).toFixed(2)}
          </div>
          <div className="text-xs text-white/60">
            {trade.outcome?.toUpperCase() ?? 'N/A'}
          </div>
        </div>
      </div>
      {trade.notes && (
        <div className="mt-2 truncate text-sm text-white/70">
          {trade.notes}
        </div>
      )}
      {trade.strategy_tags && trade.strategy_tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {trade.strategy_tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="border border-indigo-500/40 bg-[#050b18] text-xs text-white/80">
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
    <Card className="border border-indigo-500/40 bg-[#050b18] text-white">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Trading Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{summary.totalTrades}</div>
            <div className="text-sm text-white/60">Total Trades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{summary.winRate}%</div>
            <div className="text-sm text-white/60">Win Rate</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">${summary.netPnL.toFixed(2)}</div>
            <div className="text-sm text-white/60">Net P&L</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{summary.avgRR.toFixed(2)}</div>
            <div className="text-sm text-white/60">Avg R:R</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-white">${summary.maxDrawdown.toFixed(2)}</div>
          <div className="text-sm text-white/60">Max Drawdown</div>
        </div>

        <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-white/60">
          <div className="flex items-center">
            <TrendingUp className="mr-1 h-4 w-4" />
            <span>Profitable</span>
          </div>
          <div className="flex items-center">
            <TrendingDown className="mr-1 h-4 w-4" />
            <span>Drawdown</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
