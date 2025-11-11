"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/utils/supabase/client";
import {
  PLAN_LIMITS,
  type PlanType,
} from "@/lib/planAccess";
import { useNotification } from "@/context/NotificationContext";
import { useUser } from "@/context/UserContext";
import {
  generateSampleTrades,
  markSampleDataAsSeen,
  shouldLoadSampleData,
} from "@/lib/sampleTrades";
import type { Trade } from "@/types/trade";

const PLAN_KEYS: readonly PlanType[] = ["free", "pro", "plus", "elite"] as const;

const isPlanType = (value: string | undefined | null): value is PlanType =>
  PLAN_KEYS.includes(value as PlanType);

const coalesce = <T,>(...values: Array<T | null | undefined>): T | undefined => {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return undefined;
};

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : undefined;
};

const CANONICAL_OUTCOMES = new Set(["win", "loss", "breakeven"]);

const normalizeOutcomeForStorage = (value: Trade["outcome"]): string | undefined => {
  if (!value) {
    return undefined;
  }
  const lower = String(value).toLowerCase();
  return CANONICAL_OUTCOMES.has(lower) ? lower : String(value);
};

const transformTradeForBackend = (trade: Trade): Record<string, unknown> => {
  const raw = (trade.raw ?? {}) as Record<string, unknown>;

  const symbol = coalesce(trade.symbol, raw.symbol as string) ?? "";
  const openTime = coalesce(
    trade.openTime,
    trade.entry_time,
    raw.openTime as string,
    raw.entry_time as string,
    raw.opentime as string,
  );
  const closeTime = coalesce(
    trade.closeTime,
    trade.exit_time,
    raw.closeTime as string,
    raw.exit_time as string,
    raw.closetime as string,
  );

  const lotSize = toNumberOrUndefined(
    coalesce(
      trade.lotSize,
      trade.lot_size,
      raw.lotSize as number,
      raw.lot_size as number,
      raw.volume as number,
    ),
  );
  const entryPrice = toNumberOrUndefined(
    coalesce(
      trade.entryPrice,
      trade.entry_price,
      raw.entryPrice as number,
      raw.entry_price as number,
    ),
  );
  const exitPrice = toNumberOrUndefined(
    coalesce(
      trade.exitPrice,
      trade.exit_price,
      raw.exitPrice as number,
      raw.exit_price as number,
    ),
  );
  const stopLossPrice = toNumberOrUndefined(
    coalesce(
      trade.stopLossPrice,
      trade.stop_loss_price,
      raw.stopLossPrice as number,
      raw.stop_loss_price as number,
    ),
  );
  const takeProfitPrice = toNumberOrUndefined(
    coalesce(
      trade.takeProfitPrice,
      trade.take_profit_price,
      raw.takeProfitPrice as number,
      raw.take_profit_price as number,
    ),
  );
  const pnl = toNumberOrUndefined(coalesce(trade.pnl, raw.pnl as number, raw.profit as number));
  const commission = toNumberOrUndefined(coalesce(trade.commission, raw.commission as number));
  const swap = toNumberOrUndefined(coalesce(trade.swap, raw.swap as number));

  const outcomeSource = coalesce(trade.outcome, raw.outcome as Trade["outcome"]);
  const normalizedOutcome = normalizeOutcomeForStorage(outcomeSource);

  const backendTrade: Record<string, unknown> = {
    user_id: coalesce(trade.user_id, raw.user_id as string),
    symbol: String(symbol).toUpperCase(),
    direction: coalesce(trade.direction, raw.direction as string),
    ordertype: coalesce(trade.orderType, raw.orderType as string) ?? "Market Execution",
    opentime: openTime ?? null,
    closetime: closeTime ?? null,
    session: coalesce(trade.session, raw.session as string),
    lotsize: lotSize ?? null,
    entryprice: entryPrice ?? null,
    exitprice: exitPrice ?? null,
    stoplossprice: stopLossPrice ?? null,
    takeprofitprice: takeProfitPrice ?? null,
    pnl: pnl ?? null,
    profitloss: coalesce(
      String(trade.profitLoss),
      String(trade.profit_loss),
      raw.profitLoss as string,
      raw.profit_loss as string,
    ),
    resultrr: coalesce(trade.resultRR, trade.result_rr, raw.resultRR as number, raw.result_rr as number),
    rr: coalesce(trade.rr, raw.rr as number),
    outcome: normalizedOutcome ?? outcomeSource,
    duration: coalesce(trade.duration, raw.duration as string),
    reasonfortrade: coalesce(
      trade.reasonForTrade,
      trade.reason_for_trade,
      raw.reasonForTrade as string,
      raw.reason_for_trade as string,
    ),
    emotion: coalesce(trade.emotion, trade.emotion_label, raw.emotion as string, raw.emotion_label as string),
    journalnotes: coalesce(
      trade.journalNotes,
      trade.journal_notes,
      raw.journalNotes as string,
      raw.journal_notes as string,
      raw.comment as string,
    ),
    notes: coalesce(trade.notes, raw.notes as string, raw.comment as string),
    strategy: coalesce(trade.strategy, raw.strategy as string),
    beforescreenshoturl: coalesce(
      trade.beforeScreenshotUrl,
      trade.before_screenshot_url,
      raw.beforeScreenshotUrl as string,
      raw.before_screenshot_url as string,
    ),
    afterscreenshoturl: coalesce(
      trade.afterScreenshotUrl,
      trade.after_screenshot_url,
      raw.afterScreenshotUrl as string,
      raw.after_screenshot_url as string,
    ),
    commission: commission ?? null,
    swap: swap ?? null,
    pinned: coalesce(trade.pinned, raw.pinned as boolean) ?? false,
    tags: coalesce(trade.tags, raw.tags as string[]) ?? [],
    reviewed: coalesce(trade.reviewed, raw.reviewed as boolean) ?? false,
    raw: trade,
  };

  if (
    trade.id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trade.id)
  ) {
    backendTrade.id = trade.id;
  }

  return backendTrade;
};

const transformTradeForFrontend = (trade: Record<string, unknown>): Trade => {
  const raw = (trade.raw ?? {}) as Record<string, unknown>;

  const openTime = coalesce(
    trade.opentime as string,
    trade.open_time as string,
    trade.entry_time as string,
    raw.openTime as string,
    raw.entry_time as string,
  );
  const closeTime = coalesce(
    trade.closetime as string,
    trade.close_time as string,
    trade.exit_time as string,
    raw.closeTime as string,
    raw.exit_time as string,
  );
  const lotSize = toNumberOrUndefined(
    coalesce(
      trade.lotsize as number,
      trade.lot_size as number,
      raw.lotSize as number,
      raw.lot_size as number,
      raw.volume as number,
    ),
  );
  const entryPrice = toNumberOrUndefined(
    coalesce(
      trade.entryprice as number,
      trade.entry_price as number,
      raw.entryPrice as number,
      raw.entry_price as number,
    ),
  );
  const exitPrice = toNumberOrUndefined(
    coalesce(
      trade.exitprice as number,
      trade.exit_price as number,
      raw.exitPrice as number,
      raw.exit_price as number,
    ),
  );
  const stopLossPrice = toNumberOrUndefined(
    coalesce(
      trade.stoplossprice as number,
      trade.stop_loss_price as number,
      raw.stopLossPrice as number,
      raw.stop_loss_price as number,
    ),
  );
  const takeProfitPrice = toNumberOrUndefined(
    coalesce(
      trade.takeprofitprice as number,
      trade.take_profit_price as number,
      raw.takeProfitPrice as number,
      raw.take_profit_price as number,
    ),
  );
  const pnl = toNumberOrUndefined(coalesce(trade.pnl as number, raw.pnl as number, trade.profit as number));
  const commission = toNumberOrUndefined(coalesce(trade.commission as number, raw.commission as number));
  const swap = toNumberOrUndefined(coalesce(trade.swap as number, raw.swap as number));
  const profitLoss = coalesce(
    trade.profitloss as string,
    trade.profit_loss as string,
    raw.profitLoss as string,
    raw.profit_loss as string,
  );
  const resultRR = toNumberOrUndefined(
    coalesce(
      trade.resultrr as number,
      trade.result_rr as number,
      raw.resultRR as number,
      raw.result_rr as number,
    ),
  );
  const outcomeSource = coalesce(
    trade.outcome as Trade["outcome"],
    raw.outcome as Trade["outcome"],
  );
  const normalizedOutcome = normalizeOutcomeForStorage(outcomeSource);
  const tagsSource = coalesce(trade.tags as string[] | string, raw.tags as string[] | string);
  const tags = Array.isArray(tagsSource)
    ? tagsSource
    : typeof tagsSource === "string"
    ? tagsSource.split(",").map((tag) => tag.trim()).filter(Boolean)
    : undefined;

  return {
    id: String(trade.id ?? raw.id ?? ""),
    user_id: coalesce(trade.user_id as string, raw.user_id as string),
    symbol: String(coalesce(trade.symbol as string, raw.symbol as string, "")).toUpperCase(),
    direction: (coalesce(trade.direction as "Buy" | "Sell", raw.direction as "Buy" | "Sell") ??
    ((trade.type as string) === "BUY"
      ? "Buy"
        : (trade.type as string) === "SELL"
        ? "Sell"
        : undefined)) as "Buy" | "Sell" | undefined,
    orderType: coalesce(
      trade.ordertype as string,
      trade.order_type as string,
      raw.orderType as string,
      "Market Execution",
    ),
    openTime,
    closeTime,
    session: coalesce(trade.session as string, raw.session as string),
    lotSize,
    entryPrice,
    exitPrice,
    stopLossPrice,
    takeProfitPrice,
    pnl,
    profitLoss,
    resultRR,
    rr: coalesce(trade.rr as number, raw.rr as number),
    outcome: (normalizedOutcome ?? outcomeSource) as Trade["outcome"],
    duration: coalesce(trade.duration as string, raw.duration as string),
    reasonForTrade: coalesce(
      trade.reasonfortrade as string,
      trade.reason_for_trade as string,
      raw.reasonForTrade as string,
      raw.reason_for_trade as string,
    ),
    emotion: coalesce(
      trade.emotion as string,
      trade.emotion_label as string,
      raw.emotion as string,
      raw.emotion_label as string,
    ),
    journalNotes: coalesce(
      trade.journalnotes as string,
      trade.journal_notes as string,
      trade.comment as string,
      raw.journalNotes as string,
      raw.journal_notes as string,
    ),
    notes: coalesce(trade.notes as string, raw.notes as string, trade.comment as string, raw.comment as string),
    strategy: coalesce(trade.strategy as string, raw.strategy as string),
    beforeScreenshotUrl: coalesce(
      trade.beforescreenshoturl as string,
      trade.before_screenshot_url as string,
      raw.beforeScreenshotUrl as string,
      raw.before_screenshot_url as string,
    ),
    afterScreenshotUrl: coalesce(
      trade.afterscreenshoturl as string,
      trade.after_screenshot_url as string,
      raw.afterScreenshotUrl as string,
      raw.after_screenshot_url as string,
    ),
    commission,
    swap,
    pinned: coalesce(trade.pinned as boolean, raw.pinned as boolean),
    tags,
    reviewed: coalesce(trade.reviewed as boolean, raw.reviewed as boolean),
    created_at: (trade.created_at as string) ?? (raw.created_at as string),
    updated_at: (trade.updated_at as string) ?? (raw.updated_at as string),
    raw: (trade.raw as Record<string, unknown>) ?? trade,
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
      trade.beforescreenshoturl as string,
      trade.before_screenshot_url as string,
      raw.beforeScreenshotUrl as string,
      raw.before_screenshot_url as string,
    ),
    after_screenshot_url: coalesce(
      trade.afterscreenshoturl as string,
      trade.after_screenshot_url as string,
      raw.afterScreenshotUrl as string,
      raw.after_screenshot_url as string,
    ),
    emotion_label: coalesce(trade.emotion_label as string, raw.emotion_label as string),
    reason_for_trade: coalesce(trade.reason_for_trade as string, raw.reason_for_trade as string),
    journal_notes: coalesce(trade.journal_notes as string, raw.journal_notes as string),
    strategy_tags: coalesce(trade.strategy_tags as string[], raw.strategy_tags as string[]),
  };
};

export interface TradeContextValue {
  trades: Trade[];
  addTrade: (trade: Trade) => Promise<void>;
  updateTrade: (trade: Trade) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;
  refreshTrades: () => Promise<void>;
  clearTrades: () => Promise<void>;
  migrationLoading: boolean;
  needsMigration: boolean;
  migrateLocalTrades: () => Promise<{ migratedCount: number }>;
  legacyLocalTrades: Trade[];
  importTrades: (trades: Trade[]) => Promise<void>;
  importLoading: boolean;
}

const TradeContext = createContext<TradeContextValue | undefined>(undefined);

export const TradeProvider = ({ children }: { children: ReactNode }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [legacyLocalTrades, setLegacyLocalTrades] = useState<Trade[]>([]);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const { notify } = useNotification();
  const { user } = useUser();
  const supabase = createClient();

  const fetchTrades = useCallback(async (): Promise<Trade[]> => {
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
    }

    const transformedTrades = (data ?? []).map((item: any) => transformTradeForFrontend(item as Record<string, unknown>));
    setTrades(transformedTrades);
    return transformedTrades;
  }, [notify, supabase, user?.id]);

  const refreshTrades = useCallback(async () => {
    await fetchTrades();
  }, [fetchTrades]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) {
      return;
    }

    const localTrades = localStorage.getItem("trade-history");
    if (!localTrades) {
      return;
    }

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
    } catch (error: unknown) {
      console.error("Failed to parse local trade history:", error);
      localStorage.removeItem("trade-history");
    }
  }, [notify, user?.id]);

  const addTrade = useCallback(
    async (trade: Trade) => {
      if (!user?.id) {
        notify({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to add trades.",
        });
        return;
      }

      const planKey = isPlanType(user.plan) ? user.plan : "free";
      const planLimits = PLAN_LIMITS[planKey];
      const maxTrades = planLimits.maxTrades;

      if (maxTrades !== -1 && trades.length >= maxTrades) {
        notify({
          variant: "destructive",
          title: "Trade Limit Reached",
          description: `Your ${planKey} plan allows up to ${maxTrades} trades. Please upgrade to add more trades.`,
        });
        return;
      }

      try {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trade),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(errorData.error ?? "Failed to add trade");
        }

        const data = (await response.json()) as { trade: Record<string, unknown> };
        const transformedTrade = transformTradeForFrontend(data.trade);
        setTrades((prev: Trade[]) => [transformedTrade, ...prev]);
        notify({
          variant: "success",
          title: "Trade added",
          description: "Your trade has been successfully recorded.",
        });
        // Refresh to ensure consistency with database
        await refreshTrades();
      } catch (error: unknown) {
        console.error("Error adding trade:", error);
        notify({
          variant: "destructive",
          title: "Error adding trade",
          description: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [notify, trades.length, user?.id, user?.plan],
  );

  const updateTrade = useCallback(
    async (trade: Trade) => {
      if (!user?.id) {
        notify({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to update trades.",
        });
        return;
      }

      try {
        const response = await fetch("/api/trades", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trade),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(errorData.error ?? "Failed to update trade");
        }

        const data = (await response.json()) as { trade: Record<string, unknown> };
        const transformedTrade = transformTradeForFrontend(data.trade);
        setTrades((prev: Trade[]) =>
          prev.map((existing) => (existing.id === trade.id ? transformedTrade : existing)),
        );
        // Refresh to ensure consistency with database
        await refreshTrades();
        notify({
          variant: "success",
          title: "Trade updated",
          description: "Your trade has been successfully updated.",
        });
      } catch (error: unknown) {
        console.error("Error updating trade:", error);
        notify({
          variant: "destructive",
          title: "Error updating trade",
          description: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [notify, user?.id],
  );

  const deleteTrade = useCallback(
    async (tradeId: string) => {
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
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(errorData.error ?? "Failed to delete trade");
        }

        setTrades((prev: Trade[]) => prev.filter((existing) => existing.id !== tradeId));
        // Refresh to ensure consistency with database
        await refreshTrades();
        notify({
          variant: "success",
          title: "Trade deleted",
          description: "Your trade has been successfully deleted.",
        });
      } catch (error: unknown) {
        console.error("Error deleting trade:", error);
        notify({
          variant: "destructive",
          title: "Error deleting trade",
          description: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [notify, user?.id],
  );

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
  }, [notify, supabase, user?.id]);

  const importTrades = useCallback(
    async (tradesToImport: Trade[]) => {
      if (tradesToImport.length === 0) {
        return;
      }

      setImportLoading(true);
      try {
        const transformedTrades = tradesToImport.map(transformTradeForBackend);

        const response = await fetch("/api/trades/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            trades: transformedTrades,
            source: "csv-import",
          }),
        });

        if (!response.ok) {
          let errorMessage = "Import failed";
          try {
            const payload = await response.json();
            if (payload?.error) {
              if (Array.isArray(payload.error)) {
                errorMessage = payload.error
                  .map((err: unknown) =>
                    typeof err === "string"
                      ? err
                      : ((err as { message?: string }).message ?? JSON.stringify(err)),
                  )
                  .join(", ");
              } else {
                errorMessage =
                  typeof payload.error === "string"
                    ? payload.error
                    : ((payload.error as { message?: string }).message ?? JSON.stringify(payload.error));
              }
            }
          } catch {
            errorMessage = `Import failed with status ${response.status}`;
          }

          if (response.status === 401) {
            errorMessage = "Authentication required. Please refresh the page and sign in again.";
          } else if (response.status === 403) {
            errorMessage = "You don't have permission to perform this action.";
          } else if (response.status === 500) {
            errorMessage = "Server error during import. Please try again.";
          }

          throw new Error(errorMessage);
        }

        const responseData = (await response.json().catch(() => ({}))) as { newTrades?: number };
        const importedCount = responseData?.newTrades ?? 0;

        await refreshTrades();

        notify({
          variant: "success",
          title: "Trades imported successfully",
          description: `${importedCount} trade${importedCount === 1 ? "" : "s"} added to your account.`,
        });
      } catch (error: unknown) {
        console.error("importTrades error:", error);
        const description = error instanceof Error ? error.message : "Import failed. Please try again later.";
        notify({
          variant: "destructive",
          title: "Import failed",
          description,
        });
      } finally {
        setImportLoading(false);
      }
    },
    [notify, refreshTrades],
  );

  useEffect(() => {
    const loadTrades = async () => {
      const existingTrades = await fetchTrades();

      if ((!existingTrades || existingTrades.length === 0) && shouldLoadSampleData() && user?.id) {
        const sampleTrades = generateSampleTrades();
        const tradesWithUserId = sampleTrades.map((trade) => ({
          ...trade,
          user_id: user.id,
        }));

        try {
          await importTrades(tradesWithUserId);
          markSampleDataAsSeen();
          notify({
            variant: "info",
            title: "Sample Data Loaded",
            description: "We've loaded sample trades to help you explore Tradia's features. Add your real trades to get personalized insights!",
          });
        } catch (error: unknown) {
          console.error("Failed to load sample data:", error);
        }
      }
    };

    void loadTrades();
  }, [fetchTrades, importTrades, notify, user?.id]);

  const migrateLocalTrades = useCallback(
    async (): Promise<{ migratedCount: number }> => {
      if (legacyLocalTrades.length === 0) {
        setNeedsMigration(false);
        return { migratedCount: 0 };
      }

      setMigrationLoading(true);
      try {
        const response = await fetch("/api/trades/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            trades: legacyLocalTrades,
            source: "local-migration",
          }),
        });

        if (!response.ok) {
          let errorMessage = "Migration failed";
          try {
            const payload = await response.json();
            if (payload?.error) {
              if (Array.isArray(payload.error)) {
                errorMessage = payload.error
                  .map((err: unknown) =>
                    typeof err === "string"
                      ? err
                      : ((err as { message?: string }).message ?? JSON.stringify(err)),
                  )
                  .join(", ");
              } else {
                errorMessage =
                  typeof payload.error === "string"
                    ? payload.error
                    : ((payload.error as { message?: string }).message ?? JSON.stringify(payload.error));
              }
            }
          } catch {
            errorMessage = `Migration failed with status ${response.status}`;
          }

          if (response.status === 401) {
            errorMessage =
              "Authentication required. Please refresh the page and sign in again to migrate your trades.";
          } else if (response.status === 403) {
            errorMessage = "You don't have permission to perform this action. Please contact support.";
          } else if (response.status === 500) {
            errorMessage = "Server error during migration. Please try again in a few moments.";
          }

          throw new Error(errorMessage);
        }

        const responseData = (await response.json().catch(() => ({}))) as {
          newTrades?: number;
          updatedTrades?: number;
        };
        const migratedCount = (responseData?.newTrades ?? 0) + (responseData?.updatedTrades ?? 0);

        setLegacyLocalTrades([]);
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem("trade-history");
          }
        } catch (storageError: unknown) {
          console.warn("Failed to clear localStorage:", storageError);
        }

        await refreshTrades();
        setNeedsMigration(false);

        notify({
          variant: "success",
          title: "Trades migrated successfully",
          description: `${migratedCount} trade${migratedCount === 1 ? "" : "s"} securely moved to the cloud.`,
        });

        return { migratedCount };
      } catch (error: unknown) {
        console.error("migrateLocalTrades error:", error);
        const description = error instanceof Error ? error.message : "Migration failed. Please try again later.";
        notify({
          variant: "destructive",
          title: "Migration failed",
          description,
        });
        throw error;
      } finally {
        setMigrationLoading(false);
      }
    },
    [legacyLocalTrades, notify, refreshTrades],
  );

  const contextValue: TradeContextValue = {
    trades,
    addTrade,
    updateTrade,
    deleteTrade,
    refreshTrades,
    clearTrades,
    migrationLoading,
    needsMigration,
    migrateLocalTrades,
    legacyLocalTrades,
    importTrades,
    importLoading,
  };

  return <TradeContext.Provider value={contextValue}>{children}</TradeContext.Provider>;
};

export const useTrade = (): TradeContextValue => {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error("useTrade must be used within a TradeProvider");
  }
  return context;
};
