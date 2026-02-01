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

      // 2. Fetch Data from MT5 REST API
      const headers = { 'Authorization': `Bearer ${apiKey}` }; // Assuming Bearer auth or similar
      
      // A. Account Info
      let accountInfo;
      try {
          const res = await axios.get(`${server_url}/api/account/${account_login}`, { headers });
          accountInfo = res.data;
      } catch (e) {
          console.error(`Failed to fetch account info for ${account_login}`, e);
          continue;
      }

      // B. Positions (Open Trades)
      // const positionsRes = await axios.get(`${server_url}/api/positions/${account_login}`, { headers });
      // const positions = positionsRes.data;

      // C. History (New Trades)
      const fromDate = last_sync ? new Date(last_sync).toISOString() : '2020-01-01T00:00:00';
      let history = [];
      try {
          const historyRes = await axios.get(`${server_url}/api/history/${account_login}`, { 
            headers,
            params: { from: fromDate } 
          });
          history = historyRes.data;
      } catch (e) {
          console.error(`Failed to fetch history for ${account_login}`, e);
      }

      // 3. Compute Metrics
      // Simplified calculations
      const balance = accountInfo.balance;
      const equity = accountInfo.equity;
      const margin = accountInfo.margin;

      // Example: Win Rate from recent history
      const recentTrades = history.filter((t: any) => t.type === 'buy' || t.type === 'sell');
      const wins = recentTrades.filter((t: any) => t.profit > 0).length;
      const winRate = recentTrades.length > 0 ? (wins / recentTrades.length) * 100 : 0;

      // 4. Update Supabase
      // Update Account Stats
      await supabase
        .from('mt5_accounts')
        .update({
          balance,
          equity,
          margin,
          win_rate: winRate,
          last_sync: new Date().toISOString()
        })
        .eq('id', account.id);

      // Upsert Trades
      if (history.length > 0) {
        const tradesToUpsert = history.map((t: any) => ({
          id: t.ticket, // Using Ticket as ID
          user_id: userId,
          mt5_account_id: account.id,
          symbol: t.symbol,
          type: t.type,
          volume: t.volume,
          profit: t.profit,
          open_time: t.time || t.open_time, // Adjust based on actual API response
          // Map other fields as needed
        }));

        const { error: tradeError } = await supabase
          .from('trades')
          .upsert(tradesToUpsert, { onConflict: 'id' });
        
        if (tradeError) console.error('Error upserting trades:', tradeError);
      }
      
      results.push({ login: account_login, status: 'synced', trades_count: history.length });
    }

    return results;

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
