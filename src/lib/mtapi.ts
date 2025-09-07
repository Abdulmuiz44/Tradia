// src/lib/mtapi.ts
import { createClient } from "@/utils/supabase/server";

const BASE_URL = "https://mtapi.io/v1";

export interface MT5Credentials {
  server: string;
  login: string;
  password: string; // investor password
}

async function callMtapi<T>(
  endpoint: string,
  credentials: MT5Credentials
): Promise<T> {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `MTAPI request failed: ${endpoint}`);
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
