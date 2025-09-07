// src/app/api/analytics/user-stats/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createClient } from '@/utils/supabase/server';

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

    const supabase = createClient();

    // Get total users from auth.users (Supabase Auth table)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    const totalUsers = authUsers?.users?.length || 0;

    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    // Get verified vs unverified users
    const verifiedUsers = authUsers?.users?.filter(user => user.email_confirmed_at)?.length || 0;
    const unverifiedUsers = totalUsers - verifiedUsers;

    // Get active users (users who have signed in within the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = authUsers?.users?.filter(user =>
      user.last_sign_in_at && new Date(user.last_sign_in_at) > thirtyDaysAgo
    )?.length || 0;

    // Get new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newUsersToday = authUsers?.users?.filter(user =>
      user.created_at && new Date(user.created_at) >= today && new Date(user.created_at) < tomorrow
    )?.length || 0;

    // Get new users this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = authUsers?.users?.filter(user =>
      user.created_at && new Date(user.created_at) >= weekAgo
    )?.length || 0;

    // Get new users this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const newUsersThisMonth = authUsers?.users?.filter(user =>
      user.created_at && new Date(user.created_at) >= monthAgo
    )?.length || 0;

    // Get user plan distribution from user_subscriptions
    const { data: subscriptionData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('status', 'active');

    const planStats = subscriptionData?.reduce((acc: Record<string, number>, sub) => {
      acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get trade statistics
    const { count: totalTrades, error: tradeError } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true });

    // Get total PNL
    const { data: pnlData, error: pnlError } = await supabase
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