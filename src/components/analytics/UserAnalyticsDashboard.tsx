// src/components/analytics/UserAnalyticsDashboard.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserPlus, TrendingUp, Activity, ShieldX } from 'lucide-react';
import LiveActivityFeed from '@/components/analytics/LiveActivityFeed';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  planDistribution: Record<string, number>;
  totalTrades: number;
  totalPNL: number;
  totalTradePlans: number;
  totalMT5Connections: number;
  totalAIChats: number;
  tradingStyles: Record<string, number>;
  tradingExperience: Record<string, number>;
  totalTradesAdded?: number;
  totalTradesImported?: number;
  totalTradesDeleted?: number;
  avgTradeOpenHour?: number | null;
  mostActiveWeekday?: number | null; // 0=Sun..6=Sat
  sessionDistribution?: Record<string, number>;
  avgTradeDurationSec?: number | null;
  lastUpdated: string;
  dataFreshness: string;
}

export default function UserAnalyticsDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    planDistribution: {},
    totalTrades: 0,
    totalPNL: 0,
    totalTradePlans: 0,
    totalMT5Connections: 0,
    totalAIChats: 0,
    tradingStyles: {},
    tradingExperience: {},
    lastUpdated: '',
    dataFreshness: 'loading'
  });
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  const isAdmin = session?.user?.email === "abdulmuizproject@gmail.com";

  // Show access denied for non-admin users
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <ShieldX className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          This analytics dashboard is only available to administrators.
          If you believe you should have access, please contact support.
        </p>
      </div>
    );
  }

  useEffect(() => {
    fetchUserStats();
    // simple polling for near real-time
    const id = setInterval(fetchUserStats, 10000);
    return () => clearInterval(id);
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/analytics/user-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: number | null | undefined) => {
    const num = Number(value ?? 0);
    if (!Number.isFinite(num)) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    if (num <= -1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num <= -1_000) return (num / 1_000).toFixed(1) + 'K';
    return String(num);
  };

  const formatDuration = (sec?: number | null) => {
    if (!sec || sec <= 0) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return `${h}h ${rm}m`;
    }
    return `${m}m ${s}s`;
  };

  const weekdayName = (d?: number | null) => {
    const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    if (d === null || d === undefined) return '—';
    return names[d] ?? String(d);
  };

  const getActiveUserPercentage = () => {
    if (stats.totalUsers === 0) return 0;
    return Math.round((stats.activeUsers / stats.totalUsers) * 100);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Analytics</h2>
          <p className="text-muted-foreground">
            Track your user growth and engagement metrics
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Live Data
        </Badge>
      </div>

      {/* Real-time live feed */}
      <LiveActivityFeed />

      {/* User Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.activeUsers)}</div>
            <p className="text-xs text-muted-foreground">
              {getActiveUserPercentage()}% of total users
            </p>
          </CardContent>
        </Card>

        {/* Verified Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatNumber(stats.verifiedUsers)}</div>
            <p className="text-xs text-muted-foreground">
              Email verified
            </p>
          </CardContent>
        </Card>

        {/* Unverified Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unverified Users</CardTitle>
            <UserPlus className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(stats.unverifiedUsers)}</div>
            <p className="text-xs text-muted-foreground">
              Pending verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">New Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{formatNumber(stats.newUsersToday)}</div>
            <p className="text-sm text-muted-foreground">Signups in the last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{formatNumber(stats.newUsersThisWeek)}</div>
            <p className="text-sm text-muted-foreground">Signups in the last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{formatNumber(stats.newUsersThisMonth)}</div>
            <p className="text-sm text-muted-foreground">Signups in the last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatNumber(stats.totalTrades)}</div>
            <p className="text-xs text-muted-foreground">Trades analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total PNL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${formatNumber(stats.totalPNL)}</div>
            <p className="text-xs text-muted-foreground">Combined profit/loss</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trade Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatNumber(stats.totalTradePlans)}</div>
            <p className="text-xs text-muted-foreground">Planned trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">MT5 Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(stats.totalMT5Connections)}</div>
            <p className="text-xs text-muted-foreground">Active MT5 accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Trade Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trades Added (Manual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalTradesAdded || 0)}</div>
            <p className="text-xs text-muted-foreground">All users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trades Imported</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalTradesImported || 0)}</div>
            <p className="text-xs text-muted-foreground">CSV / MT5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Trades Deleted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalTradesDeleted || 0)}</div>
            <p className="text-xs text-muted-foreground">Audit logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Trade Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.avgTradeDurationSec)}</div>
            <p className="text-xs text-muted-foreground">Across all trades</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timing */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Open Hour (UTC)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats.avgTradeOpenHour !== null && stats.avgTradeOpenHour !== undefined ? Math.round(Number(stats.avgTradeOpenHour)) + ':00' : '—'}</div>
            <p className="text-sm text-muted-foreground">Typical time users open trades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Most Active Weekday</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{weekdayName(stats.mostActiveWeekday)}</div>
            <p className="text-sm text-muted-foreground">Based on trade opens (UTC)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.sessionDistribution && Object.keys(stats.sessionDistribution).length > 0 ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                {Object.entries(stats.sessionDistribution).sort((a,b)=> b[1]-a[1]).slice(0,3).map(([k,v]) => (
                  <div key={k}>
                    <div className="text-xl font-bold">{formatNumber(v)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{k}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">AI Chat Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-cyan-600">{formatNumber(stats.totalAIChats)}</div>
          <p className="text-sm text-muted-foreground">Total AI conversations</p>
        </CardContent>
      </Card>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>Distribution of user plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.planDistribution).map(([plan, count]) => (
              <div key={plan} className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{formatNumber(count)}</div>
                <div className="text-sm text-muted-foreground capitalize">{plan}</div>
              </div>
            ))}
            {Object.keys(stats.planDistribution).length === 0 && (
              <div className="col-span-full text-center text-muted-foreground">
                No subscription data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Freshness */}
      <Card>
        <CardHeader>
          <CardTitle>Data Status</CardTitle>
          <CardDescription>Real-time analytics information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Last Updated</div>
              <div className="text-xs text-muted-foreground">
                {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                stats.dataFreshness === 'real-time' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium capitalize">{stats.dataFreshness}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchUserStats}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>
    </div>
  );
}
