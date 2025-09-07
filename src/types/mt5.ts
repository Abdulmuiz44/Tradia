// src/types/mt5.ts
// Centralized MT5 types — the single source of truth for MT5 credentials, connection state,
// validation results, account & trade shapes, and helper result shapes used across the app.

/**
 * Basic MT5 account stored in your DB
 */
export interface MT5Account {
  id: string;
  user_id: string;
  login: string;
  server: string;
  name: string;
  // status of the stored account (use ConnectionStatus for runtime status)
  state: ConnectionStatus;
  balance?: number | null;
  currency?: string | null;
  last_connected_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Credentials that users supply to connect an MT5 terminal.
 * - server, login, password are required at runtime for connection attempts.
 * - name, id, user_id, investorPassword are optional metadata.
 */
export interface MT5Credentials {
  id?: string;
  user_id?: string;
  login: string;
  password: string;
  investorPassword?: string;
  server: string;
  name?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Lightweight connection payload shape (for creating temporary connection objects)
 */
export interface MT5Connection {
  login: string;
  password: string;
  server: string;
  name?: string;
}

/**
 * MT5 trade (raw import shape)
 */
export interface MT5Trade {
  deal_id: string;
  order_id: string;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price?: number;
  profit: number;
  commission: number;
  swap: number;
  comment?: string;
  open_time: Date | string;
  close_time?: Date | string;
}

/**
 * Open position shape
 */
export interface MT5Position {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  open_price: number;
  current_price: number;
  profit: number;
  swap: number;
  commission: number;
}

/**
 * Account info returned by a terminal check
 */
export interface MT5AccountInfo {
  login: string;
  balance: number;
  equity?: number;
  margin?: number;
  free_margin?: number;
  margin_level?: number;
  currency?: string;
}

/**
 * Stored credential record (DB-level)
 */
export interface StoredCredential {
  id: string;
  user_id: string;
  login: string;
  server: string;
  name?: string;
  encryptedPassword: string;
  encryptedInvestorPassword?: string;
  securityLevel?: "high" | "medium" | "low";
  rotationRequired?: boolean;
  lastUsedAt?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Connection error codes used in logic (expandable)
 *
 * We also allow arbitrary string values in case external systems return
 * error codes not enumerated here — this keeps runtime robust.
 */
export type ConnectionError =
  | "invalid_credentials"
  | "server_unreachable"
  | "terminal_not_found"
  | "login_failed"
  | "network_error"
  | "timeout"
  | "unknown"
  | "connection_lost"
  | "invalid_server"
  | "account_disabled"
  | "insufficient_funds"
  | "market_closed"
  | "invalid_symbol"
  | "invalid_volume"
  | "no_connection"
  | "authentication_failed"
  | "session_expired"
  | "rate_limit_exceeded"
  | "server_maintenance"
  | "invalid_request"
  | "permission_denied"
  | string;

/**
 * (Legacy alias) if any module imports ConnectionErrorCode, keep it available.
 */
export type ConnectionErrorCode = ConnectionError;

/**
 * Common connection status values used throughout the UI and manager
 */
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "validating"
  | "connected"
  | "disconnected"
  | "error"
  | "timeout"
  | "degraded"
  | "unknown"
  | "retrying";

/**
 * The result of validation attempts — always contains errors/warnings arrays
 */
export interface ConnectionValidationResult {
  isValid: boolean;
  errors: string[]; // empty array if none
  warnings: string[]; // empty array if none
  // These are more relaxed: the validation flow typically returns human-readable
  // error strings; keep them nullable to express optional presence.
  error?: string | null;
  errorMessage?: string | null;
  accountInfo?: MT5AccountInfo | null;
}

/**
 * The runtime connection state object used by the connection manager.
 * updateConnectionState expects Partial<MT5ConnectionState> updates.
 *
 * NOTE: `error` is intentionally permissive to accept:
 *  - a structured object `{ code?: ConnectionError; message?: string }`
 *  - a ConnectionError string (one of the enumerated code values)
 *  - an arbitrary string (for unexpected messages)
 *  - null
 *
 * This avoids multiple narrow type-casting sites across the manager and UI.
 */
export interface MT5ConnectionState {
  status: ConnectionStatus;
  isValid?: boolean;
  isValidating?: boolean;
  accountInfo?: MT5AccountInfo | null;

  // Accept structured or simple error shapes to match runtime usage.
  error?: { code?: ConnectionError; message?: string } | ConnectionError | string | null;

  errorMessage?: string | null;
  lastCheckedAt?: string | null;

  // always useful to store arrays for reporting
  errors?: string[];
  warnings?: string[];
}

/**
 * Result returned by mt5Integration.connectAccount/testConnection functions
 */
export interface MT5ConnectionResult {
  success: boolean;
  accountInfo?: MT5AccountInfo | null;
  error?: string | null;
  message?: string | null;
  code?: ConnectionError | null;
}

/**
 * Result returned by a sync call
 */
export interface MT5SyncResult {
  success: boolean;
  syncId?: string;
  syncedCount?: number;
  error?: string | null;
  message?: string | null;
  details?: any;
}

/**
 * Utility: the type exported for components that want a small shape
 */
export type MinimalMT5Credentials = Pick<
  MT5Credentials,
  "server" | "login" | "password" | "name"
>;

/* ---------------------------------------------------------------------------
  Notes / usage
  - Use `import type { MT5Credentials, ConnectionError } from "@/types/mt5"` in UI components.
  - Use `MT5ConnectionState` when storing or updating connection state via the manager,
    because updateConnectionState expects Partial<MT5ConnectionState>.
  - ConnectionValidationResult always includes `errors` and `warnings` arrays so code
    that returns validation results doesn't get type complaints.
--------------------------------------------------------------------------- */
