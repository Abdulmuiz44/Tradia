'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DashboardMetrics({ userId }: { userId: string }) {
  const [metrics, setMetrics] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initial fetch
    const fetchMetrics = async () => {
      const { data, error } = await supabase
        .from('mt5_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) setMetrics(data);
    };

    fetchMetrics();

    // Realtime subscription
    const channel = supabase
      .channel('mt5-metrics')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mt5_accounts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setMetrics(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  if (!metrics) return <div className="p-4 text-center text-zinc-500">No MT5 data linked</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <MetricCard title="Balance" value={`$${metrics.balance?.toFixed(2) || '0.00'}`} />
      <MetricCard title="Equity" value={`$${metrics.equity?.toFixed(2) || '0.00'}`} />
      <MetricCard title="Win Rate" value={`${metrics.win_rate?.toFixed(1) || '0.0'}%`} />
      <MetricCard title="Daily Drawdown" value={`${metrics.daily_dd?.toFixed(2) || '0.00'}%`} />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <h3 className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{title}</h3>
      <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
