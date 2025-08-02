import { create } from 'zustand';

interface Trade {
  id: number;
  symbol: string;
  lotSize: number;
  pnl: number;
  timestamp: string;
}

type Store = {
  trades: Trade[];
  addTrade: (trade: Trade) => void;
};

export const useTradeStore = create<Store>((set) => ({
  trades: [],
  addTrade: (trade) =>
    set((state) => ({ trades: [...state.trades, trade].slice(-20) })),
}));
