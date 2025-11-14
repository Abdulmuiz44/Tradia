// src/app/api/analytics/user-stats/route.ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createAdminSupabase } from '@/utils/supabase/admin';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only allow admin user
    if (session.user.email !== 'abdulmuizproject@gmail.com') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // Use service role to bypass RLS and access auth admin endpoints
    // Prefer service role; gracefully fall back to SSR client if unavailable
    let supabase: ReturnType<typeof createAdminSupabase> | ReturnType<typeof import('@/utils/supabase/server')['createClient']>;
    try {
      supabase = createAdminSupabase();
    } catch (e) {
      console.warn('Falling back to SSR Supabase client (no service key):', e);
      const { createClient } = await import('@/utils/supabase/server');
      supabase = createClient();
    }

    // Primary user metrics from application users table (more relevant for app)
    const now = new Date();
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth()-1);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);

    // Treat a user as verified if email_verified is not null
    // This covers both boolean true and timestamp-based verification values
    const [{ count: totalUsers }, { count: verifiedUsers }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('email_verified', 'is', null),
    ]);
    const unverifiedUsers = (totalUsers || 0) - (verifiedUsers || 0);

    // New users windows
    const [todayUsers, weekUsers, monthUsers] = await Promise.all([
      supabase.from('users').select('id,created_at').gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString()),
      supabase.from('users').select('id,created_at').gte('created_at', weekAgo.toISOString()),
      supabase.from('users').select('id,created_at').gte('created_at', monthAgo.toISOString()),
    ]);
    const newUsersToday = todayUsers.data?.length || 0;
    const newUsersThisWeek = weekUsers.data?.length || 0;
    const newUsersThisMonth = monthUsers.data?.length || 0;

    // Active users in last 30d via sessions table (unique user_ids)
    let activeUsers = 0;
    try {
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select('user_id, expires_at')
        .gte('expires_at', thirtyDaysAgo.toISOString());
      const set = new Set<string>();
      (recentSessions || []).forEach((s: any) => { if (s?.user_id) set.add(String(s.user_id)); });
      activeUsers = set.size;
    } catch {
      activeUsers = 0;
    }

    // Get user plan distribution from user_subscriptions
    // Primary: from user_subscriptions (active)
    let planStats: Record<string, number> = {};
    try {
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select('plan, status')
        .eq('status', 'active');
      if (subscriptionData && subscriptionData.length > 0) {
        planStats = subscriptionData.reduce((acc: Record<string, number>, sub: any) => {
          const key = String(sub.plan || 'unknown');
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    } catch {}

    // Fallback: aggregate from users.plan if subscription data is empty
    if (Object.keys(planStats).length === 0) {
      try {
        const { data: users } = await supabase
          .from('users')
          .select('plan');
        if (users && users.length > 0) {
          planStats = users.reduce((acc: Record<string, number>, u: any) => {
            const key = String(u.plan || 'free');
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      } catch {}
    }

    // Advanced trade analytics (admin-wide) via SQL for performance
    // - total trades
    // - manual vs imported (by source/deal_id)
    // - total PnL across mixed schemas (pnl or profit)
    // - average open hour, most active DOW
    // - session distribution by UTC hour
    // - average duration (seconds)
    let client: any = null;
    let totalTrades = 0;
    let totalAdded = 0;
    let totalImported = 0;
    let totalDeleted = 0; // requires audit table; default 0 if none
    let totalPNL = 0;
    let avgOpenHour = null as number | null;
    let mostActiveDOW = null as number | null;
    let sessions: Record<string, number> = {};
    let avgDurationSec = null as number | null;
    try {
      // Connect to pooled Postgres (may fail if DATABASE_URL or DNS not configured)
      if (!pool) {
        throw new Error('Database pool not initialized');
      }
      client = await pool.connect();

      // total trades
      const r1 = await client.query('SELECT COUNT(*)::int AS c FROM trades');
      totalTrades = r1.rows?.[0]?.c ?? 0;

      // manual added vs imported
      const r2 = await client.query(
        "SELECT\n          SUM(CASE WHEN source = 'manual' THEN 1 ELSE 0 END)::int AS manual_count,\n          SUM(CASE WHEN source IN ('import','mt5','mt5-import') OR deal_id IS NOT NULL THEN 1 ELSE 0 END)::int AS import_count\n         FROM trades"
      );
      totalAdded = r2.rows?.[0]?.manual_count ?? 0;
      totalImported = r2.rows?.[0]?.import_count ?? 0;

      // total deleted (best-effort: optional audit table trades_audit)
      try {
        const rDel = await client.query(
          "SELECT COUNT(*)::int AS c FROM trades_audit WHERE action = 'deleted'"
        );
        totalDeleted = rDel.rows?.[0]?.c ?? 0;
      } catch {
        totalDeleted = 0; // table not present
      }

      // total PNL (sum per row of coalesce(pnl, profit, 0))
      const r3 = await client.query(
        'SELECT COALESCE(SUM(COALESCE(pnl::numeric, profit::numeric, 0)),0) AS total FROM trades'
      );
      totalPNL = Number(r3.rows?.[0]?.total ?? 0);

      // avg open hour and most active weekday
      const r4 = await client.query(
        "SELECT AVG(EXTRACT(HOUR FROM opentime)) AS avg_hour FROM trades WHERE opentime IS NOT NULL"
      );
      avgOpenHour = r4.rows?.[0]?.avg_hour !== null ? Number(r4.rows[0].avg_hour) : null;

      const r5 = await client.query(
        "SELECT EXTRACT(DOW FROM opentime)::int AS dow, COUNT(*)::int AS c FROM trades WHERE opentime IS NOT NULL GROUP BY dow ORDER BY c DESC LIMIT 1"
      );
      mostActiveDOW = r5.rows?.[0]?.dow ?? null;

      // session distribution by UTC hour mapping
      const r6 = await client.query(
        "SELECT sess, COUNT(*)::int AS c FROM (\n           SELECT CASE\n             WHEN EXTRACT(HOUR FROM open_time) BETWEEN 0 AND 6 THEN 'asian'\n             WHEN EXTRACT(HOUR FROM open_time) BETWEEN 7 AND 12 THEN 'london'\n             WHEN EXTRACT(HOUR FROM open_time) BETWEEN 13 AND 20 THEN 'newyork'\n             ELSE 'sydney' END AS sess\n           FROM trades WHERE open_time IS NOT NULL\n         ) t GROUP BY sess"
      );
      sessions = Object.fromEntries((r6.rows || []).map((r: any) => [String(r.sess), Number(r.c)]));

      // average duration (seconds)
      const r7 = await client.query(
        "SELECT AVG(EXTRACT(EPOCH FROM (closetime - opentime))) AS avg_sec FROM trades WHERE closetime IS NOT NULL AND opentime IS NOT NULL"
      );
      avgDurationSec = r7.rows?.[0]?.avg_sec !== null ? Number(r7.rows[0].avg_sec) : null;
    } catch (e) {
      console.warn('Pool-based analytics failed, will fallback to Supabase where possible:', e);
    } finally {
      try { client?.release?.(); } catch {}
    }

    // Supabase fallbacks (in case pool failed or returned zeros)
    try {
      if (!totalTrades) {
        const { count } = await supabase.from('trades').select('id', { count: 'exact', head: true });
        totalTrades = count || 0;
      }
    } catch {}

    try {
      if (!totalAdded || !totalImported) {
        const { count: manualCount } = await supabase
          .from('trades')
          .select('id', { count: 'exact', head: true })
          .is('deal_id', null);
        const { count: importedCount } = await supabase
          .from('trades')
          .select('id', { count: 'exact', head: true })
          .not('deal_id', 'is', null);
        totalAdded = manualCount || 0;
        totalImported = importedCount || 0;
      }
    } catch {}

    try {
      // Comprehensive fallback: compute metrics from recent trades when pool is unavailable
      if (!totalTrades || avgOpenHour === null || mostActiveDOW === null) {
        const { data } = await supabase
          .from('trades')
          .select('opentime, closetime, pnl, profit, source, deal_id')
          .order('opentime', { ascending: false })
          .limit(10000);
        if (data && data.length) {
          // Basic counts
          if (!totalTrades) totalTrades = data.length;

          // Added/imported split
          if (!totalAdded && !totalImported) {
            let a = 0, im = 0;
            for (const r of data as any[]) {
              const src = (r?.source || '').toString().toLowerCase();
              if (r?.deal_id || src === 'import' || src === 'mt5' || src === 'mt5-import') im++;
              else a++;
            }
            totalAdded = a; totalImported = im;
          }

          // Total PNL
          if (!totalPNL) totalPNL = (data as any[]).reduce((s, r) => s + Number(r?.pnl ?? r?.profit ?? 0), 0);

          // Time-based metrics
          const hours: number[] = [];
          const dowCount = new Array(7).fill(0);
          const sessMap: Record<string, number> = { asian: 0, london: 0, newyork: 0, sydney: 0 };
          let durSum = 0, durN = 0;
          for (const r of data as any[]) {
            const ot = r?.opentime ? new Date(r.opentime) : null;
            const ct = r?.closetime ? new Date(r.closetime) : null;
            if (ot && !isNaN(ot.getTime())) {
              const h = ot.getUTCHours();
              hours.push(h);
              const d = ot.getUTCDay();
              dowCount[d] = (dowCount[d] || 0) + 1;
              if (h >= 0 && h <= 6) sessMap.asian++;
              else if (h >= 7 && h <= 12) sessMap.london++;
              else if (h >= 13 && h <= 20) sessMap.newyork++;
              else sessMap.sydney++;
            }
            if (ot && ct) {
              const sec = Math.max(0, (ct.getTime() - ot.getTime()) / 1000);
              durSum += sec; durN++;
            }
          }
          if (hours.length && (avgOpenHour === null)) {
            avgOpenHour = hours.reduce((a, b) => a + b, 0) / hours.length;
          }
          if ((mostActiveDOW === null)) {
            let md = 0, mc = -1;
            for (let i = 0; i < 7; i++) { if ((dowCount[i] || 0) > mc) { mc = dowCount[i] || 0; md = i; } }
            mostActiveDOW = mc >= 0 ? md : null;
          }
          if (Object.keys(sessions).length === 0) sessions = sessMap;
          if (avgDurationSec === null && durN > 0) avgDurationSec = durSum / durN;
        }
      } else if (!totalPNL) {
        const { data } = await supabase.from('trades').select('pnl, profit').limit(10000);
        if (data && data.length) {
          totalPNL = data.reduce((s: number, r: any) => s + Number(r?.pnl ?? r?.profit ?? 0), 0);
        }
      }
    } catch {}

    // Get trade planning statistics (assuming there's a trade_plans table or similar)
    let totalTradePlans = 0;
    try {
      const { count, error } = await supabase
        .from('trade_plans')
        .select('*', { count: 'exact', head: true });
      totalTradePlans = count || 0;
    } catch (error) {
      console.warn('Trade plans table may not exist:', error);
      totalTradePlans = 0;
    }

    // Get MT5 connection statistics
    const { count: totalMT5Connections, error: mt5Error } = await supabase
      .from('mt5_credentials')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get AI chat usage statistics
    let totalAIChats = 0;
    try {
      const { count, error } = await supabase
        .from('ai_chat_sessions')
        .select('*', { count: 'exact', head: true });
      totalAIChats = count || 0;
    } catch (error) {
      console.warn('AI chat sessions table may not exist:', error);
      totalAIChats = 0;
    }

    // Get user engagement metrics
    const { data: engagementData, error: engagementError } = await supabase
      .from('user_profiles')
      .select('trading_style, trading_experience, created_at');

    const tradingStyles = engagementData?.reduce((acc: Record<string, number>, profile) => {
      if (profile.trading_style) {
        acc[profile.trading_style] = (acc[profile.trading_style] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    const tradingExperience = engagementData?.reduce((acc: Record<string, number>, profile) => {
      if (profile.trading_experience) {
        acc[profile.trading_experience] = (acc[profile.trading_experience] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    const stats = {
      // User metrics
      totalUsers,
      activeUsers,
      verifiedUsers,
      unverifiedUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,

      // Plan distribution
      planDistribution: planStats,

      // Trade metrics
      totalTrades: totalTrades || 0,
      totalPNL,
      totalTradesAdded: totalAdded,
      totalTradesImported: totalImported,
      totalTradesDeleted: totalDeleted,
      avgTradeOpenHour: avgOpenHour,
      mostActiveWeekday: mostActiveDOW, // 0=Sun .. 6=Sat (UTC)
      sessionDistribution: sessions,
      avgTradeDurationSec: avgDurationSec,
      totalTradePlans: totalTradePlans || 0,

      // Platform engagement
      totalMT5Connections: totalMT5Connections || 0,
      totalAIChats: totalAIChats || 0,

      // User demographics
      tradingStyles,
      tradingExperience,

      // Metadata
      lastUpdated: new Date().toISOString(),
      dataFreshness: 'real-time'
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
