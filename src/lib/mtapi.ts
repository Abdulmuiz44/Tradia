// src/lib/mtapi.ts
import { createClient } from "@/utils/supabase/server";

const BASE_URL =
  process.env.MT5_WEB_API_URL ||
  process.env.NEXT_PUBLIC_MT5_WEB_API_URL ||
  "https://mtapi.io/v1";

export interface MT5Credentials {
  server: string;
  login: string;
  password: string; // investor password
}

async function callMtapi<T>(
  endpoint: string,
  credentials: MT5Credentials,
  payload?: Record<string, any>
): Promise<T> {
  const url = `${BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  const body = { ...credentials, ...(payload || {}) };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.MT5_API_KEY || process.env.NEXT_PUBLIC_MT5_API_KEY;
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (data && (data.error || data.message)) || `MTAPI request failed: ${endpoint}`;
    throw new Error(message);
  }

  return data as T;
}

/**
 * Validate account credentials
 */
export async function validateAccount(credentials: MT5Credentials) {
  return callMtapi<{ account_info: any }>("validate", credentials);
}

/**
 * Fetch account info only (no DB update)
 */
export async function fetchAccountInfo(credentials: MT5Credentials) {
  return callMtapi<{ account_info: any }>("account_info", credentials);
}

/**
 * Fetch account info + sync Supabase
 */
export async function fetchAndSyncAccountInfo(
  userId: string,
  credentials: MT5Credentials
) {
  const data = await callMtapi<{ account_info: any }>(
    "account_info",
    credentials
  );

  const supabase = createClient();
  await supabase
    .from("mt5_accounts")
    .update({
      account_info: data.account_info,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("server", credentials.server)
    .eq("login", credentials.login);

  return data;
}

/**
 * Fetch positions + refresh account info
 */
export async function fetchPositionsAndSync(
  userId: string,
  credentials: MT5Credentials
) {
  const data = await callMtapi<{ positions: any[] }>("positions", credentials);

  // auto-refresh account_info
  await fetchAndSyncAccountInfo(userId, credentials);

  return data;
}

/**
 * Fetch orders + refresh account info
 */
export async function fetchOrdersAndSync(
  userId: string,
  credentials: MT5Credentials
) {
  const data = await callMtapi<{ orders: any[] }>("orders", credentials);

  // auto-refresh account_info
  await fetchAndSyncAccountInfo(userId, credentials);

  return data;
}

/**
 * Fetch closed trade history (deals) in a time window.
 * Endpoint name can be overridden via MT5_HISTORY_ENDPOINT (default: 'deals').
 */
export async function fetchDeals(
  credentials: MT5Credentials,
  from?: Date | string,
  to?: Date | string
) {
  const endpoint = process.env.MT5_HISTORY_ENDPOINT || "deals";
  const payload: Record<string, any> = {};
  if (from) payload.from = typeof from === "string" ? from : from.toISOString();
  if (to) payload.to = typeof to === "string" ? to : to.toISOString();

  return callMtapi<{ deals: any[]; account_info?: any }>(endpoint, credentials, payload);
}
