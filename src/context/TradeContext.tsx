// src/context/TradeContext.tsx

import {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { Trade } from "@/types/trade";

interface TradeContextProps {
  trades: Trade[];
  updateTrade: (updatedTrade: Trade) => void;
  addTrade: (newTrade: Trade) => void;
  deleteTrade: (id: string) => void;
  clearAllTrades: () => void;
}

export const TradeContext = createContext<TradeContextProps>({
  trades: [],
  updateTrade: () => {},
  addTrade: () => {},
  deleteTrade: () => {},
  clearAllTrades: () => {},
});

export const TradeProvider = ({ children }: { children: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("tradia_trades");
    if (stored) {
      try {
        setTrades(JSON.parse(stored));
      } catch {
        console.error("Could not parse trades from storage");
      }
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem("tradia_trades", JSON.stringify(trades));
  }, [trades]);

  const updateTrade = useCallback((updated: Trade) => {
    setTrades((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
    );
  }, []);

  const addTrade = useCallback((newTrade: Trade) => {
    setTrades((prev) => [
      ...prev,
      { ...newTrade, id: Date.now().toString() },
    ]);
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllTrades = useCallback(() => {
    setTrades([]);
    localStorage.removeItem("tradia_trades");
  }, []);

  return (
    <TradeContext.Provider
      value={{ trades, updateTrade, addTrade, deleteTrade, clearAllTrades }}
    >
      {children}
    </TradeContext.Provider>
  );
};
