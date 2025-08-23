// utils/supabase/admin.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminSupabase() {
  // accept either NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // accept either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE env vars. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
