import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return a mock client during build time
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn('Supabase credentials not configured. Using mock client for build.');
      // Return a minimal mock that won't break the build
      return {
        from: () => ({
          select: () => Promise.resolve({ data: null, error: null }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null }),
        }),
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          signIn: () => Promise.resolve({ data: null, error: null }),
          signOut: () => Promise.resolve({ error: null }),
        },
      } as any;
    }
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: 'pkce',              // critical for email links + code exchange
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true       // handles implicit flow fragments if they ever appear
    },
  });

  return supabaseInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return (getSupabaseClient() as any)[prop];
  }
});
