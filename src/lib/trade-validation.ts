// src/lib/trade-validation.ts

import type { Trade, TradeOutcome } from "@/types/trade";

/**
 * Validation error for a single field
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation result for a trade, including row number (for imports)
 */
export interface TradeValidationResult {
  valid: boolean;
  errors: ValidationError[];
  rowNumber?: number;
}

/**
 * Summary of import results
 */
export interface ImportValidationSummary {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{
    rowNumber: number;
    errors: ValidationError[];
  }>;
}

/**
 * Required fields for a valid trade
 */
const REQUIRED_FIELDS: (keyof Trade)[] = [
  "id",
  "symbol",
  "entryPrice",
];

/**
 * Valid outcome values
 */
const VALID_OUTCOMES: TradeOutcome[] = [
  "Win",
  "Loss",
  "Breakeven",
  "win",
  "loss",
  "breakeven",
];

/**
 * Validates a single trade object
 * @param trade - The trade to validate
 * @param rowNumber - Optional row number for import context
 * @returns Validation result with any errors found
 */
export function validateTrade(
  trade: Partial<Trade>,
  rowNumber?: number
): TradeValidationResult {
  const errors: ValidationError[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    const value = trade[field];
    if (value === undefined || value === null || value === "") {
      errors.push({
        field,
        message: `${field} is required`,
        value,
      });
    }
  }

  // Validate symbol (must be non-empty string)
  if (trade.symbol !== undefined) {
    if (typeof trade.symbol !== "string" || trade.symbol.trim().length === 0) {
      errors.push({
        field: "symbol",
        message: "symbol must be a non-empty string",
        value: trade.symbol,
      });
    }
  }

  // Validate entryPrice (must be a positive number)
  if (trade.entryPrice !== undefined) {
    const entryPrice = Number(trade.entryPrice);
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      errors.push({
        field: "entryPrice",
        message: "entryPrice must be a positive number",
        value: trade.entryPrice,
      });
    }
  }

  // Validate numeric fields (if present)
  const numericFields: (keyof Trade)[] = [
    "exitPrice",
    "lotSize",
    "stopLossPrice",
    "takeProfitPrice",
    "pnl",
    "commission",
    "swap",
    "resultRR",
  ];

  for (const field of numericFields) {
    const value = trade[field];
    if (value !== undefined && value !== null && value !== "") {
      const numValue = Number(value);
      if (!Number.isFinite(numValue)) {
        errors.push({
          field,
          message: `${field} must be a valid number`,
          value,
        });
      }
    }
  }

  // Validate outcome (if present)
  if (trade.outcome !== undefined && trade.outcome !== null && trade.outcome !== "") {
    if (!VALID_OUTCOMES.includes(trade.outcome)) {
      errors.push({
        field: "outcome",
        message: `outcome must be one of: ${VALID_OUTCOMES.join(", ")}`,
        value: trade.outcome,
      });
    }
  }

  // Validate direction (if present)
  if (trade.direction !== undefined && trade.direction !== null && trade.direction !== "") {
    if (trade.direction !== "Buy" && trade.direction !== "Sell") {
      errors.push({
        field: "direction",
        message: "direction must be 'Buy' or 'Sell'",
        value: trade.direction,
      });
    }
  }

  // Validate dates (if present)
  const dateFields: (keyof Trade)[] = ["openTime", "closeTime", "created_at", "updated_at"];
  for (const field of dateFields) {
    const value = trade[field];
    if (value !== undefined && value !== null && value !== "") {
      const date = new Date(value as string | Date);
      if (isNaN(date.getTime())) {
        errors.push({
          field,
          message: `${field} must be a valid date`,
          value,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    rowNumber,
  };
}

/**
 * Validates multiple trades and returns a summary
 * @param trades - Array of trades to validate
 * @returns Validation summary with import statistics
 */
export function validateTrades(
  trades: Partial<Trade>[]
): ImportValidationSummary {
  const results = trades.map((trade, index) => 
    validateTrade(trade, index + 1)
  );

  const errors = results
    .filter((r) => !r.valid)
    .map((r) => ({
      rowNumber: r.rowNumber!,
      errors: r.errors,
    }));

  return {
    total: trades.length,
    imported: results.filter((r) => r.valid).length,
    skipped: errors.length,
    errors,
  };
}

/**
 * Filters valid trades from an array
 * @param trades - Array of trades to filter
 * @returns Array of valid trades only
 */
export function filterValidTrades(
  trades: Partial<Trade>[]
): Partial<Trade>[] {
  return trades.filter((trade) => validateTrade(trade).valid);
}

/**
 * Creates a user-friendly error message from validation errors
 * @param errors - Array of validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "";
  if (errors.length === 1) {
    return `${errors[0].field}: ${errors[0].message}`;
  }
  return errors.map((e) => `${e.field}: ${e.message}`).join("; ");
}

/**
 * Creates a formatted summary message for import results
 * @param summary - Import validation summary
 * @returns Formatted summary message
 */
export function formatImportSummary(summary: ImportValidationSummary): string {
  const parts: string[] = [];
  
  if (summary.imported > 0) {
    parts.push(`${summary.imported} trade${summary.imported !== 1 ? "s" : ""} imported successfully`);
  }
  
  if (summary.skipped > 0) {
    parts.push(`${summary.skipped} row${summary.skipped !== 1 ? "s" : ""} skipped due to validation errors`);
  }
  
  return parts.join(", ");
}
