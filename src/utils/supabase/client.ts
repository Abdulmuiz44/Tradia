// utils/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time or if env vars are missing, return a mock client
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured for browser client');
    return {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signIn: () => Promise.resolve({ data: null, error: null }),
        signOut: () => Promise.resolve({ error: null }),
      },
    } as any;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
};
