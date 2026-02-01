'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

export default function MT5Connect({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    serverUrl: 'http://localhost:8080', // Default as per prompt
    apiKey: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/connect-mt5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to connect');

      toast.success('MT5 Account Connected Successfully!');
      // Optionally trigger an immediate sync
      // await fetch(`/api/sync-mt5/${userId}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Connect MT5 Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Account Login (ID)</label>
          <input
            type="number"
            required
            className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent dark:text-white"
            value={formData.login}
            onChange={(e) => setFormData({ ...formData, login: e.target.value })}
            placeholder="e.g. 50123456"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Server URL (REST EA)</label>
          <input
            type="url"
            required
            className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent dark:text-white"
            value={formData.serverUrl}
            onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
            placeholder="http://your-vps-ip:8080"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">API Key</label>
          <input
            type="password"
            required
            className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent dark:text-white"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect Account'}
        </button>
      </form>
    </div>
  );
}
