// src/context/TradeContext.tsx

"use client";

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useContext,
} from "react";
import { Trade } from "@/types/trade";

interface TradeContextProps {
  trades: Trade[];
  filteredTrades: Trade[];
  addTrade: (newTrade: Trade) => void;
  updateTrade: (updatedTrade: Trade) => void;
  deleteTrade: (id: string) => void;
  setTradesFromCsv: (csvTrades: Trade[]) => void;
  filterTrades: (fromDate: Date, toDate: Date) => void;
}

export const TradeContext = createContext<TradeContextProps>({
  trades: [],
  filteredTrades: [],
  addTrade: () => {},
  updateTrade: () => {},
  deleteTrade: () => {},
  setTradesFromCsv: () => {},
  filterTrades: () => {},
});

export const TradeProvider = ({ children }: { children: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);

  // Load trades from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("trade-history");
    if (stored) {
      setTrades(JSON.parse(stored));
    }
  }, []);

  // Save trades to localStorage when updated
  useEffect(() => {
    localStorage.setItem("trade-history", JSON.stringify(trades));
  }, [trades]);

  const isDuplicateId = useCallback(
    (id: string) => trades.some((trade) => trade.id === id),
    [trades]
  );

  const generateUniqueId = () => {
    let newId = crypto.randomUUID();
    while (isDuplicateId(newId)) {
      newId = crypto.randomUUID();
    }
    return newId;
  };

  const addTrade = useCallback(
    (newTrade: Trade) => {
      const id =
        newTrade.id && !isDuplicateId(newTrade.id)
          ? newTrade.id
          : generateUniqueId();
      setTrades((prev) => [...prev, { ...newTrade, id }]);
    },
    [isDuplicateId]
  );

  const updateTrade = useCallback((updatedTrade: Trade) => {
    setTrades((prevTrades) =>
      prevTrades.map((trade) =>
        trade.id === updatedTrade.id ? { ...trade, ...updatedTrade } : trade
      )
    );
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setTrades((prevTrades) => prevTrades.filter((trade) => trade.id !== id));
  }, []);

  const setTradesFromCsv = useCallback(
    (csvTrades: Trade[]) => {
      const tradesWithIds = csvTrades.map((trade) => {
        let id = trade.id;
        if (!id || isDuplicateId(id)) {
          id = generateUniqueId();
        }
        return { ...trade, id };
      });
      setTrades((prev) => [...prev, ...tradesWithIds]);
    },
    [isDuplicateId]
  );

  const filterTrades = useCallback(
    (fromDate: Date, toDate: Date) => {
      const filtered = trades.filter((trade) => {
        const tradeDate = new Date(trade.openTime);
        return tradeDate >= fromDate && tradeDate <= toDate;
      });
      setFilteredTrades(filtered);
    },
    [trades]
  );

  return (
    <TradeContext.Provider
      value={{
        trades,
        filteredTrades,
        addTrade,
        updateTrade,
        deleteTrade,
        setTradesFromCsv,
        filterTrades,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
};

export const useTrade = () => useContext(TradeContext);
