// src/app/api/analytics/user-stats/route.ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createAdminSupabase } from '@/utils/supabase/admin';

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
    const supabase = createAdminSupabase();

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

    // Get trade statistics
    const { count: totalTrades } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true });

    // Get total PNL
    const { data: pnlData } = await supabase
      .from('trades')
      .select('pnl')
      .not('pnl', 'is', null);

    const totalPNL = pnlData?.reduce((sum, trade) => sum + (trade.pnl || 0), 0) || 0;

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
