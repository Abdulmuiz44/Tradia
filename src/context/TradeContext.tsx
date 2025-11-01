// src/context/TradeContext.tsx
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
} from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trade } from "@/types/trade";
import { useNotification } from "@/context/NotificationContext";
import { useUser } from "@/context/UserContext"; // Assuming UserContext is available
import { PLAN_LIMITS } from "@/lib/planAccess";
import { generateSampleTrades, shouldLoadSampleData, markSampleDataAsSeen } from "@/lib/sampleTrades";

const coalesce = <T>(...values: (T | null | undefined)[]): T | undefined => {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return undefined;
};

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : undefined;
};

const CANONICAL_OUTCOMES = new Set(["win", "loss", "breakeven"]);

const normalizeOutcomeForStorage = (value: Trade["outcome"]): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (CANONICAL_OUTCOMES.has(lower)) {
      return lower;
    }
    return value;
  }
  return undefined;
};

// Helper to transform frontend trade to backend format
const transformTradeForBackend = (trade: Trade) => {
  const raw = (trade.raw ?? {}) as any;
  const symbol = coalesce(trade.symbol, raw.symbol) ?? "";
  const openTime = coalesce(trade.openTime, trade.entry_time, raw.openTime, raw.entry_time, raw.opentime);
  const closeTime = coalesce(trade.closeTime, trade.exit_time, raw.closeTime, raw.exit_time, raw.closetime);
  const lotSize = toNumberOrUndefined(coalesce(trade.lotSize, trade.lot_size, raw.lotSize, raw.lot_size, raw.volume));
  const entryPrice = toNumberOrUndefined(coalesce(trade.entryPrice, trade.entry_price, raw.entryPrice, raw.entry_price));
  const exitPrice = toNumberOrUndefined(coalesce(trade.exitPrice, trade.exit_price, raw.exitPrice, raw.exit_price));
  const stopLossPrice = toNumberOrUndefined(
    coalesce(trade.stopLossPrice, trade.stop_loss_price, raw.stopLossPrice, raw.stop_loss_price)
  );
  const takeProfitPrice = toNumberOrUndefined(
    coalesce(trade.takeProfitPrice, trade.take_profit_price, raw.takeProfitPrice, raw.take_profit_price)
  );
  const pnl = toNumberOrUndefined(coalesce(trade.pnl, raw.pnl, raw.profit));
  const commission = toNumberOrUndefined(coalesce(trade.commission, raw.commission));
  const swap = toNumberOrUndefined(coalesce(trade.swap, raw.swap));
  const outcomeSource = coalesce(trade.outcome, raw.outcome);
  const normalizedOutcome = normalizeOutcomeForStorage(outcomeSource);

  const result: Record<string, unknown> = {
    user_id: coalesce(trade.user_id, raw.user_id),
    symbol: String(symbol).toUpperCase(),
    direction: coalesce(trade.direction, raw.direction),
    ordertype: coalesce(trade.orderType, raw.orderType) || "Market Execution",
    opentime: openTime ?? null,
    closetime: closeTime ?? null,
    session: coalesce(trade.session, raw.session),
    lotsize: lotSize ?? null,
    entryprice: entryPrice ?? null,
    exitprice: exitPrice ?? null,
    stoplossprice: stopLossPrice ?? null,
    takeprofitprice: takeProfitPrice ?? null,
    pnl: pnl ?? null,
    profitloss: coalesce(trade.profitLoss, trade.profit_loss, raw.profitLoss, raw.profit_loss),
    resultrr: coalesce(trade.resultRR, trade.result_rr, raw.resultRR, raw.result_rr),
    rr: coalesce(trade.rr, raw.rr),
    outcome: normalizedOutcome ?? outcomeSource,
    duration: coalesce(trade.duration, raw.duration),
    reasonfortrade: coalesce(
      trade.reasonForTrade,
      trade.reason_for_trade,
      raw.reasonForTrade,
      raw.reason_for_trade
    ),
    emotion: coalesce(trade.emotion, trade.emotion_label, raw.emotion, raw.emotion_label),
    journalnotes: coalesce(
      trade.journalNotes,
      trade.journal_notes,
      raw.journalNotes,
      raw.journal_notes,
      raw.comment
    ),
    notes: coalesce(trade.notes, raw.notes, raw.comment),
    strategy: coalesce(trade.strategy, raw.strategy),
    beforescreenshoturl: coalesce(
      trade.beforeScreenshotUrl,
      trade.before_screenshot_url,
      raw.beforeScreenshotUrl,
      raw.before_screenshot_url
    ),
    afterscreenshoturl: coalesce(
      trade.afterScreenshotUrl,
      trade.after_screenshot_url,
      raw.afterScreenshotUrl,
      raw.after_screenshot_url
    ),
    commission: commission ?? null,
    swap: swap ?? null,
    pinned: coalesce(trade.pinned, raw.pinned) ?? false,
    tags: coalesce(trade.tags, raw.tags) ?? [],
    reviewed: coalesce(trade.reviewed, raw.reviewed) ?? false,
    raw: trade,
  };

  if (trade.id && trade.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    result.id = trade.id;
  }

  return result;
};

// Helper to transform backend trade to frontend format
const transformTradeForFrontend = (trade: any): Trade => {
  const raw = (trade.raw ?? {}) as any;
  const openTime = coalesce(trade.opentime, trade.open_time, trade.entry_time, raw.openTime, raw.entry_time);
  const closeTime = coalesce(trade.closetime, trade.close_time, trade.exit_time, raw.closeTime, raw.exit_time);
  const lotSize = toNumberOrUndefined(coalesce(trade.lotsize, trade.lot_size, raw.lotSize, raw.lot_size, raw.volume));
  const entryPrice = toNumberOrUndefined(coalesce(trade.entryprice, trade.entry_price, raw.entryPrice, raw.entry_price));
  const exitPrice = toNumberOrUndefined(coalesce(trade.exitprice, trade.exit_price, raw.exitPrice, raw.exit_price));
  const stopLossPrice = toNumberOrUndefined(
    coalesce(trade.stoplossprice, trade.stop_loss_price, raw.stopLossPrice, raw.stop_loss_price)
  );
  const takeProfitPrice = toNumberOrUndefined(
    coalesce(trade.takeprofitprice, trade.take_profit_price, raw.takeProfitPrice, raw.take_profit_price)
  );
  const pnl = toNumberOrUndefined(coalesce(trade.pnl, raw.pnl, trade.profit));
  const commission = toNumberOrUndefined(coalesce(trade.commission, raw.commission));
  const swap = toNumberOrUndefined(coalesce(trade.swap, raw.swap));
  const profitLoss = coalesce(trade.profitloss, trade.profit_loss, raw.profitLoss, raw.profit_loss);
  const resultRR = toNumberOrUndefined(
    coalesce(trade.resultrr, trade.result_rr, raw.resultRR, raw.result_rr)
  );
  const outcomeSource = coalesce(trade.outcome, raw.outcome) as Trade["outcome"];
  const normalizedOutcome = normalizeOutcomeForStorage(outcomeSource);
  const tagsSource = coalesce(trade.tags, raw.tags);
  const tags = Array.isArray(tagsSource)
    ? tagsSource
    : typeof tagsSource === "string"
    ? tagsSource.split(",").map((tag) => tag.trim()).filter(Boolean)
    : undefined;

  return {
    id: String(trade.id),
    user_id: coalesce(trade.user_id, raw.user_id),
    symbol: String(coalesce(trade.symbol, raw.symbol, "")).toUpperCase(),
    direction:
      coalesce(trade.direction, raw.direction) ||
      (trade.type === "BUY" ? "Buy" : trade.type === "SELL" ? "Sell" : undefined),
    orderType: coalesce(trade.ordertype, trade.order_type, raw.orderType, "Market Execution"),
    openTime,
    closeTime,
    session: coalesce(trade.session, raw.session),
    lotSize,
    entryPrice,
    exitPrice,
    stopLossPrice,
    takeProfitPrice,
    pnl,
    profitLoss,
    resultRR,
    rr: coalesce(trade.rr, raw.rr),
    outcome: (normalizedOutcome ?? outcomeSource) as Trade["outcome"],
    duration: coalesce(trade.duration, raw.duration),
    reasonForTrade: coalesce(
      trade.reasonfortrade,
      trade.reason_for_trade,
      raw.reasonForTrade,
      raw.reason_for_trade
    ),
    emotion: coalesce(trade.emotion, trade.emotion_label, raw.emotion, raw.emotion_label),
    journalNotes: coalesce(
      trade.journalnotes,
      trade.journal_notes,
      trade.comment,
      raw.journalNotes,
      raw.journal_notes
    ),
    notes: coalesce(trade.notes, raw.notes, trade.comment, raw.comment),
    strategy: coalesce(trade.strategy, raw.strategy),
    beforeScreenshotUrl: coalesce(
      trade.beforescreenshoturl,
      trade.before_screenshot_url,
      raw.beforeScreenshotUrl,
      raw.before_screenshot_url
    ),
    afterScreenshotUrl: coalesce(
      trade.afterscreenshoturl,
      trade.after_screenshot_url,
      raw.afterScreenshotUrl,
      raw.after_screenshot_url
    ),
    commission,
    swap,
    pinned: coalesce(trade.pinned, raw.pinned),
    tags,
    reviewed: coalesce(trade.reviewed, raw.reviewed),
    created_at: trade.created_at ?? raw.created_at,
    updated_at: trade.updated_at ?? raw.updated_at,
    raw: (trade.raw as Record<string, unknown> | undefined) ?? trade,
    entry_time: openTime,
    exit_time: closeTime,
    entry_price: entryPrice,
    exit_price: exitPrice,
    lot_size: lotSize,
    stop_loss_price: stopLossPrice,
    take_profit_price: takeProfitPrice,
    profit_loss: profitLoss,
    result_rr: resultRR,
    before_screenshot_url: coalesce(
      trade.beforescreenshoturl,
      trade.before_screenshot_url,
      raw.beforeScreenshotUrl,
      raw.before_screenshot_url
    ),
    after_screenshot_url: coalesce(
      trade.afterscreenshoturl,
      trade.after_screenshot_url,
      raw.afterScreenshotUrl,
      raw.after_screenshot_url
    ),
    emotion_label: coalesce(trade.emotion_label, raw.emotion_label),
    reason_for_trade: coalesce(trade.reason_for_trade, raw.reason_for_trade),
    journal_notes: coalesce(trade.journal_notes, raw.journal_notes),
    strategy_tags: coalesce(trade.strategy_tags, raw.strategy_tags),
  };
};

export interface TradeContextType {
  trades: Trade[];
  addTrade: (trade: Trade) => void;
  updateTrade: (trade: Trade) => void;
  deleteTrade: (tradeId: string) => void;
  refreshTrades: () => Promise<void>;
  clearTrades: () => Promise<void>;
  migrationLoading: boolean;
  needsMigration: boolean;
  migrateLocalTrades: () => Promise<{ migratedCount: number }>;
  legacyLocalTrades: Trade[];
  importTrades: (trades: Trade[]) => Promise<void>;
  importLoading: boolean;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const TradeProvider = ({ children }: { children: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [legacyLocalTrades, setLegacyLocalTrades] = useState<Trade[]>([]);
  const [needsMigration, setNeedsMigration] = useState<boolean>(false);
  const [migrationLoading, setMigrationLoading] = useState<boolean>(false);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const { notify } = useNotification();
  const { user } = useUser(); // Get user from UserContext

  const supabase = createClientComponentClient();

  const fetchTrades = useCallback(async () => {
    if (!user?.id) {
      setTrades([]);
      return [];
    }
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .order("opentime", { ascending: false });

    if (error) {
      console.error("Error fetching trades:", error);
      notify({
        variant: "destructive",
        title: "Error fetching trades",
        description: error.message,
      });
      return [];
    } else {
      const transformedTrades = (data || []).map(transformTradeForFrontend);
      setTrades(transformedTrades);
      return transformedTrades;
    }
  }, [user?.id, supabase, notify]);

  const refreshTrades = useCallback(async () => {
    await fetchTrades();
  }, [fetchTrades]);

  useEffect(() => {
    const loadTrades = async () => {
      const existingTrades = await fetchTrades();

      // If no trades exist and user should see sample data, load it
      if ((!existingTrades || existingTrades.length === 0) && shouldLoadSampleData() && user?.id) {
        const sampleTrades = generateSampleTrades();
        // Update sample trades with actual user ID
        const tradesWithUserId = sampleTrades.map(trade => ({
          ...trade,
          user_id: user.id
        }));

        try {
          // Import sample trades
          await importTrades(tradesWithUserId);
          markSampleDataAsSeen();

          notify({
            variant: "info",
            title: "Sample Data Loaded",
            description: "We've loaded sample trades to help you explore Tradia's features. Add your real trades to get personalized insights!",
          });
        } catch (error) {
          console.error('Failed to load sample data:', error);
        }
      }
    };

    loadTrades();
  }, [fetchTrades, user?.id]);

  // Load legacy local trades and check for migration
  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      const localTrades = localStorage.getItem("trade-history");
      if (localTrades) {
        try {
          const parsedTrades: Trade[] = JSON.parse(localTrades);
          if (parsedTrades.length > 0) {
            setLegacyLocalTrades(parsedTrades);
            setNeedsMigration(true);
            notify({
              variant: "info",
              title: "Local Trades Found",
              description: "We found some trades saved locally. Please migrate them to your account.",
            });
          }
        } catch (e) {
          console.error("Failed to parse local trade history:", e);
          localStorage.removeItem("trade-history");
        }
      }
    }
  }, [user?.id, notify]);

  const addTrade = async (trade: Trade) => {
  if (!user?.id) {
  notify({
  variant: "destructive",
  title: "Authentication Required",
  description: "Please sign in to add trades.",
  });
  return;
  }

  // Check plan limits for max trades
  const planLimits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;
  const maxTrades = planLimits.maxTrades;

  if (maxTrades !== -1 && trades.length >= maxTrades) {
  notify({
  variant: "destructive",
  title: "Trade Limit Reached",
  description: `Your ${user.plan} plan allows up to ${maxTrades} trades. Please upgrade to add more trades.`,
  });
  return;
  }

  try {
      const response = await fetch('/api/trades', {
      method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
        body: JSON.stringify(trade),
    });

  if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || 'Failed to add trade');
  }

    const data = await response.json();
  const transformedTrade = transformTradeForFrontend(data.trade);
  setTrades((prev) => [transformedTrade, ...prev]);
  notify({
  variant: "success",
  title: "Trade added",
  description: "Your trade has been successfully recorded.",
  });
  } catch (error) {
      console.error("Error adding trade:", error);
      notify({
        variant: "destructive",
        title: "Error adding trade",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const updateTrade = async (trade: Trade) => {
  if (!user?.id) {
  notify({
  variant: "destructive",
  title: "Authentication Required",
  description: "Please sign in to update trades.",
  });
  return;
  }

  try {
    const response = await fetch('/api/trades', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(trade),
      });

  if (!response.ok) {
    const errorData = await response.json();
  throw new Error(errorData.error || 'Failed to update trade');
  }

  const data = await response.json();
    const transformedTrade = transformTradeForFrontend(data.trade);
  setTrades((prev) =>
    prev.map((t) => (t.id === trade.id ? transformedTrade : t))
  );
  notify({
    variant: "success",
  title: "Trade updated",
  description: "Your trade has been successfully updated.",
  });
  } catch (error) {
    console.error("Error updating trade:", error);
      notify({
        variant: "destructive",
        title: "Error updating trade",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const deleteTrade = async (tradeId: string) => {
  if (!user?.id) {
  notify({
  variant: "destructive",
  title: "Authentication Required",
  description: "Please sign in to delete trades.",
  });
  return;
  }

  try {
  const response = await fetch(`/api/trades?id=${encodeURIComponent(tradeId)}`, {
    method: 'DELETE',
  });

      if (!response.ok) {
      const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete trade');
  }

  setTrades((prev) => prev.filter((t) => t.id !== tradeId));
  notify({
    variant: "success",
      title: "Trade deleted",
    description: "Your trade has been successfully deleted.",
  });
  } catch (error) {
  console.error("Error deleting trade:", error);
  notify({
    variant: "destructive",
      title: "Error deleting trade",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const clearTrades = useCallback(async () => {
    if (!user?.id) {
      notify({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to clear trades.",
      });
      throw new Error("Authentication required");
    }

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error clearing trades:", error);
      notify({
        variant: "destructive",
        title: "Error clearing trades",
        description: error.message,
      });
      throw error;
    }

    setTrades([]);
  }, [supabase, user?.id, notify]);

  const importTrades = async (tradesToImport: Trade[]): Promise<void> => {
    if (tradesToImport.length === 0) return;

    setImportLoading(true);
    try {
      console.log("Starting import of", tradesToImport.length, "trades...");

      // Transform trades
      const transformedTrades = tradesToImport.map(trade => transformTradeForBackend(trade));

      const res = await fetch("/api/trades/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          trades: transformedTrades,
          source: "csv-import"
        }),
      });

      console.log("Import response status:", res.status);

      if (!res.ok) {
        let errorMessage = "Import failed";
        try {
          const payload = await res.json();
          if (payload?.error) {
            if (Array.isArray(payload.error)) {
              errorMessage = payload.error.map((err: any) =>
                typeof err === 'string' ? err : (err?.message || JSON.stringify(err))
              ).join(', ');
            } else {
              errorMessage = typeof payload.error === 'string' ? payload.error : (payload.error?.message || JSON.stringify(payload.error));
            }
          }
          console.error("Import API error payload:", payload);
        } catch {
          errorMessage = `Import failed with status ${res.status}`;
        }

        if (res.status === 401) {
          errorMessage = "Authentication required. Please refresh the page and sign in again.";
        } else if (res.status === 403) {
          errorMessage = "You don't have permission to perform this action.";
        } else if (res.status === 500) {
          errorMessage = "Server error during import. Please try again.";
        }

        throw new Error(errorMessage);
      }

      const responseData = await res.json().catch(() => ({}));
      console.log("Import response data:", responseData);
      const importedCount = responseData?.newTrades || 0;

      console.log(`Import successful: ${importedCount} trades imported`);

      await refreshTrades();

      try {
        notify({
          variant: "success",
          title: "Trades imported successfully",
          description: `${importedCount} trade${importedCount !== 1 ? 's' : ''} added to your account.`
        });
      } catch {}
    } catch (err) {
      console.error("importTrades error:", err);
      const errorMessage = err instanceof Error ? err.message : "Import failed. Please try again later.";

      try {
        notify({
          variant: "destructive",
          title: "Import failed",
          description: errorMessage
        });
      } catch {}
    } finally {
      setImportLoading(false);
    }
  };

  const migrateLocalTrades = async (): Promise<{ migratedCount: number }> => {
    if (legacyLocalTrades.length === 0) {
      setNeedsMigration(false);
      return { migratedCount: 0 };
    }

    setMigrationLoading(true);
    try {
      console.log("Starting migration of", legacyLocalTrades.length, "local trades...");

      // Authentication is handled by the API using NextAuth

      const res = await fetch("/api/trades/import", {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      },
      body: JSON.stringify({
        trades: legacyLocalTrades,
      source: "local-migration"
      }),
      });

      console.log("Migration response status:", res.status);

      if (!res.ok) {
        let errorMessage = "Migration failed";
        try {
          const payload = await res.json();
          if (payload?.error) {
            if (Array.isArray(payload.error)) {
              errorMessage = payload.error.map(err =>
                typeof err === 'string' ? err : (err?.message || JSON.stringify(err))
              ).join(', ');
            } else {
              errorMessage = typeof payload.error === 'string' ? payload.error : (payload.error?.message || JSON.stringify(payload.error));
            }
          }
          console.error("Migration API error payload:", payload);
        } catch {
          errorMessage = `Migration failed with status ${res.status}`;
        }
        
        if (res.status === 401) {
          errorMessage = "Authentication required. Please refresh the page and sign in again to migrate your trades.";
        } else if (res.status === 403) {
          errorMessage = "You don't have permission to perform this action. Please contact support.";
        } else if (res.status === 500) {
          errorMessage = "Server error during migration. Please try again in a few moments.";
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await res.json().catch(() => ({}));
      console.log("Migration response data:", responseData);
      const migratedCount = (responseData?.newTrades || 0) + (responseData?.updatedTrades || 0);
      
      console.log(`Migration successful: ${migratedCount} trades migrated (${responseData?.newTrades || 0} new, ${responseData?.updatedTrades || 0} updated)`);

      setLegacyLocalTrades([]);
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("trade-history");
          console.log("Local trade history cleared from localStorage");
        }
      } catch (storageErr) {
        console.warn("Failed to clear localStorage:", storageErr);
      }
      
      await refreshTrades();
      
      setNeedsMigration(false);
      
      try {
        notify({ 
          variant: "success", 
          title: "Trades migrated successfully", 
          description: `${migratedCount} trade${migratedCount !== 1 ? 's' : ''} securely moved to the cloud.` 
        });
      } catch {}

      return { migratedCount };
    } catch (err) {
      console.error("migrateLocalTrades error:", err);
      const errorMessage = err instanceof Error ? err.message : "Migration failed. Please try again later.";
      
      try {
        notify({ 
          variant: "destructive", 
          title: "Migration failed", 
          description: errorMessage 
        });
      } catch {}
      
      throw err;
    } finally {
      setMigrationLoading(false);
    }
  };

  return (
    <TradeContext.Provider
      value={{
        trades,
        addTrade,
        updateTrade,
        deleteTrade,
        refreshTrades,
        migrationLoading,
        needsMigration,
        migrateLocalTrades,
        legacyLocalTrades,
        importTrades,
          clearTrades,
        importLoading,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
};

export const useTrade = () => {
  const context = useContext(TradeContext);
  if (context === undefined) {
    throw new Error("useTrade must be used within a TradeProvider");
  }
  return context;
};