// src/lib/payment-logging.server.ts
// Server-side helper to persist payment logs into DB

import { createClient } from "@/utils/supabase/server";

type LogLevel = "info" | "warn" | "error";

export async function logPayment(
  source: string,
  level: LogLevel,
  message: string,
  context?: Record<string, unknown> | null,
  userId?: string | null
) {
  try {
    const supabase = createClient();
    await supabase.from("payment_logs").insert({
      user_id: userId ?? null,
      source,
      level,
      message,
      context: context ?? null,
    });
  } catch (err) {
    console.error("payment log insert failed:", err);
  }
}

