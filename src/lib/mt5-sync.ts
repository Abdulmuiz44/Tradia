import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use Service Role Key for backend ops
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types
interface MT5Account {
  id: string;
  user_id: string;
  account_login: number;
  server_url: string;
  api_key_encrypted: string;
  last_sync: string | null;
}

interface MT5Trade {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  profit: number;
  open_time: string;
  close_time: string;
  open_price: number;
  close_price: number;
}

// Decrypt API Key (Simplified for demo - use a proper vault in prod)
// In a real scenario, use Supabase Vault or pgcrypto.decrypt within SQL
// Here we assume the key is stored as is or we handle decryption if we had the key.
// For this task, we'll assume it's stored plain or we'd need a separate decrypt step.
// **Security Note:** In production, do `select pgp_sym_decrypt(api_key_encrypted::bytea, 'SECRET_KEY')`
const decryptKey = (encrypted: string) => encrypted; 

export async function syncMT5Account(userId: string) {
  try {
    // 1. Get User's MT5 Connection
    const { data: accounts, error: accountError } = await supabase
      .from('mt5_accounts')
      .select('*')
      .eq('user_id', userId);

    if (accountError || !accounts || accounts.length === 0) {
      console.log(`No MT5 account found for user ${userId}`);
      return;
    }

    const results = [];

    for (const account of accounts) {
      const { account_login, server_url, api_key_encrypted, last_sync } = account;
      const apiKey = decryptKey(api_key_encrypted); // TODO: Implement actual decryption

      // 2. Fetch Data from MT5 REST API (Python Service)
      // The Python service exposes /sync-trades?user_id=...&login=...
      const syncUrl = `${server_url}/sync-trades`;
      
      try {
          const res = await axios.get(syncUrl, { 
            params: { 
                user_id: userId, 
                login: account_login 
            }
          });
          
          const result = res.data;
          
          if (result.ok) {
              results.push({ 
                  login: account_login, 
                  status: 'synced', 
                  trades_count: result.imported,
                  message: result.message
              });
          } else {
              console.error(`Sync failed for ${account_login}:`, result.message);
          }

      } catch (e: any) {
          console.error(`Failed to fetch sync data for ${account_login}`, e.message);
          results.push({ login: account_login, status: 'error', error: e.message });
      }
    }

    return results;

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
