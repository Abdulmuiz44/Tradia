// utils/supabase/admin.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error("Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
