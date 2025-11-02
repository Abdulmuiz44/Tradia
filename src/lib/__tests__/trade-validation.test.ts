// src/lib/__tests__/trade-validation.test.ts

import {
  validateTrade,
  validateTrades,
  filterValidTrades,
  formatValidationErrors,
  formatImportSummary,
} from "../trade-validation";
import type { Trade } from "@/types/trade";

describe("trade-validation", () => {
  describe("validateTrade", () => {
    it("should validate a complete valid trade", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
        entryPrice: 1.1234,
        exitPrice: 1.1250,
        lotSize: 1,
        pnl: 160,
        outcome: "Win",
        direction: "Buy",
        openTime: "2024-01-01T10:00:00Z",
        closeTime: "2024-01-01T11:00:00Z",
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should require id field", () => {
      const trade: Partial<Trade> = {
        symbol: "EURUSD",
        entryPrice: 1.1234,
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "id",
        message: "id is required",
        value: undefined,
      });
    });

    it("should require symbol field", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        entryPrice: 1.1234,
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "symbol",
        message: "symbol is required",
        value: undefined,
      });
    });

    it("should require entryPrice field", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "entryPrice",
        message: "entryPrice is required",
        value: undefined,
      });
    });

    it("should reject empty symbol", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        symbol: "",
        entryPrice: 1.1234,
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "symbol")).toBe(true);
    });

    it("should reject negative or zero entryPrice", () => {
      const trade1: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
        entryPrice: 0,
      };

      const result1 = validateTrade(trade1);
      expect(result1.valid).toBe(false);
      expect(result1.errors.some((e) => e.field === "entryPrice")).toBe(true);

      const trade2: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
        entryPrice: -10,
      };

      const result2 = validateTrade(trade2);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some((e) => e.field === "entryPrice")).toBe(true);
    });

    it("should reject invalid numeric fields", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
        entryPrice: 1.1234,
        lotSize: NaN,
        pnl: Infinity,
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "lotSize")).toBe(true);
      expect(result.errors.some((e) => e.field === "pnl")).toBe(true);
    });

    it("should reject invalid outcome values", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
        entryPrice: 1.1234,
        outcome: "Invalid" as any,
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "outcome")).toBe(true);
    });

    it("should accept valid outcome values", () => {
      const outcomes: Array<Trade["outcome"]> = [
        "Win",
        "Loss",
        "Breakeven",
        "win",
        "loss",
        "breakeven",
      ];

      for (const outcome of outcomes) {
        const trade: Partial<Trade> = {
          id: "trade-1",
          symbol: "EURUSD",
          entryPrice: 1.1234,
          outcome,
        };

        const result = validateTrade(trade);
        expect(result.valid).toBe(true);
      }
    });

    it("should reject invalid direction", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
        entryPrice: 1.1234,
        direction: "Invalid" as any,
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "direction")).toBe(true);
    });

    it("should reject invalid dates", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
        entryPrice: 1.1234,
        openTime: "invalid-date",
      };

      const result = validateTrade(trade);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "openTime")).toBe(true);
    });

    it("should include row number when provided", () => {
      const trade: Partial<Trade> = {
        id: "trade-1",
        symbol: "EURUSD",
        entryPrice: 1.1234,
      };

      const result = validateTrade(trade, 42);
      expect(result.rowNumber).toBe(42);
    });
  });

  describe("validateTrades", () => {
    it("should validate multiple trades and return summary", () => {
      const trades: Partial<Trade>[] = [
        { id: "1", symbol: "EURUSD", entryPrice: 1.1234 },
        { id: "2", symbol: "GBPUSD", entryPrice: 1.2500 },
        { id: "3", symbol: "", entryPrice: 1.3000 }, // invalid
        { id: "4", symbol: "USDJPY", entryPrice: 0 }, // invalid
      ];

      const summary = validateTrades(trades);
      expect(summary.total).toBe(4);
      expect(summary.imported).toBe(2);
      expect(summary.skipped).toBe(2);
      expect(summary.errors).toHaveLength(2);
      expect(summary.errors[0].rowNumber).toBe(3);
      expect(summary.errors[1].rowNumber).toBe(4);
    });

    it("should handle all valid trades", () => {
      const trades: Partial<Trade>[] = [
        { id: "1", symbol: "EURUSD", entryPrice: 1.1234 },
        { id: "2", symbol: "GBPUSD", entryPrice: 1.2500 },
      ];

      const summary = validateTrades(trades);
      expect(summary.total).toBe(2);
      expect(summary.imported).toBe(2);
      expect(summary.skipped).toBe(0);
      expect(summary.errors).toHaveLength(0);
    });

    it("should handle all invalid trades", () => {
      const trades: Partial<Trade>[] = [
        { id: "", symbol: "EURUSD", entryPrice: 1.1234 },
        { id: "2", symbol: "", entryPrice: 1.2500 },
      ];

      const summary = validateTrades(trades);
      expect(summary.total).toBe(2);
      expect(summary.imported).toBe(0);
      expect(summary.skipped).toBe(2);
      expect(summary.errors).toHaveLength(2);
    });
  });

  describe("filterValidTrades", () => {
    it("should filter out invalid trades", () => {
      const trades: Partial<Trade>[] = [
        { id: "1", symbol: "EURUSD", entryPrice: 1.1234 },
        { id: "2", symbol: "", entryPrice: 1.2500 }, // invalid
        { id: "3", symbol: "USDJPY", entryPrice: 110.50 },
      ];

      const valid = filterValidTrades(trades);
      expect(valid).toHaveLength(2);
      expect(valid[0].id).toBe("1");
      expect(valid[1].id).toBe("3");
    });
  });

  describe("formatValidationErrors", () => {
    it("should format single error", () => {
      const errors = [
        { field: "symbol", message: "symbol is required" },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toBe("symbol: symbol is required");
    });

    it("should format multiple errors", () => {
      const errors = [
        { field: "symbol", message: "symbol is required" },
        { field: "entryPrice", message: "entryPrice must be positive" },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain("symbol: symbol is required");
      expect(formatted).toContain("entryPrice: entryPrice must be positive");
    });

    it("should return empty string for no errors", () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toBe("");
    });
  });

  describe("formatImportSummary", () => {
    it("should format summary with successful imports", () => {
      const summary = {
        total: 10,
        imported: 10,
        skipped: 0,
        errors: [],
      };

      const formatted = formatImportSummary(summary);
      expect(formatted).toContain("10 trades imported successfully");
    });

    it("should format summary with errors", () => {
      const summary = {
        total: 10,
        imported: 7,
        skipped: 3,
        errors: [
          { rowNumber: 2, errors: [] },
          { rowNumber: 5, errors: [] },
          { rowNumber: 8, errors: [] },
        ],
      };

      const formatted = formatImportSummary(summary);
      expect(formatted).toContain("7 trades imported successfully");
      expect(formatted).toContain("3 rows skipped");
    });

    it("should use singular form for single items", () => {
      const summary = {
        total: 2,
        imported: 1,
        skipped: 1,
        errors: [{ rowNumber: 2, errors: [] }],
      };

      const formatted = formatImportSummary(summary);
      expect(formatted).toContain("1 trade imported");
      expect(formatted).toContain("1 row skipped");
    });
  });
});
