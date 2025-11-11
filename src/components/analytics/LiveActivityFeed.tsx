"use client";

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ActivityItem = {
  id: number;
  created_at: string;
  type: 'page_view' | 'action' | 'page_duration';
  path: string;
  name?: string | null;
  referrer?: string | null;
  meta?: any;
  duration_ms?: number | null;
  session_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  tz?: string | null;
  viewport_w?: number | null;
  viewport_h?: number | null;
};

export default function LiveActivityFeed() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [connected, setConnected] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/analytics/activity/recent');
        if (res.ok) {
          const { items } = await res.json();
          setItems(items);
        }
      } catch {}
    })();
  }, []);

  // Realtime subscription (requires Realtime + RLS policies)
  useEffect(() => {
    const channel = supabase
      .channel('page-activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'page_activity' },
        (payload: any) => {
          setItems(prev => [payload.new as ActivityItem, ...prev].slice(0, 100));
        }
      )
      .subscribe((status: any) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Page Activity</span>
          <span className={`text-xs px-2 py-0.5 rounded ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {connected ? 'realtime' : 'offline'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[420px] overflow-auto divide-y">
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">No recent activity.</div>
          )}
          {items.map((it) => (
            <div key={it.id} className="py-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium mr-2">{it.type}</span>
                  <span className="text-gray-600 break-all">{it.path}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(it.created_at).toLocaleTimeString()}
                </div>
              </div>
              <div className="text-xs text-gray-600">
                {it.name ? (<span className="mr-3">action: {it.name}</span>) : null}
                {typeof it.duration_ms === 'number' ? (<span className="mr-3">duration: {it.duration_ms}ms</span>) : null}
                {it.user_email ? (<span className="mr-3">user: {it.user_email}</span>) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

