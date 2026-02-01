import { NextResponse } from 'next/server';
import { syncMT5Account } from '@/lib/mt5-sync';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cron job endpoint
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;

  // Simple authorization check (e.g. Secret header for Cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (userId === 'all') {
      // Fetch all users with MT5 connections
      const { data: accounts, error } = await supabase
        .from('mt5_accounts')
        .select('user_id');
      
      if (error) throw error;
      
      const uniqueUserIds = [...new Set(accounts.map(a => a.user_id))];
      const results = [];
      
      // Process in parallel (limit concurrency in prod)
      for (const uid of uniqueUserIds) {
        try {
          const res = await syncMT5Account(uid);
          results.push({ userId: uid, result: res });
        } catch (e) {
          console.error(`Failed sync for ${uid}`, e);
          results.push({ userId: uid, error: 'Failed' });
        }
      }
      return NextResponse.json({ success: true, results });
    } else {
      const result = await syncMT5Account(userId);
      return NextResponse.json({ success: true, result });
    }
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
