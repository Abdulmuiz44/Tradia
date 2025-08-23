import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',              // critical for email links + code exchange
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true       // handles implicit flow fragments if they ever appear
  },
});
