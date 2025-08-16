// src/app/mt5/sync/page.tsx
'use client';

import { useState } from 'react';

export default function MT5SyncPage() {
  const [mt5AccountId, setMt5AccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resMsg, setResMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sync = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setResMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/mt5/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mt5AccountId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Sync failed');
      setResMsg(`Imported ${data.imported} trades`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 flex items-start justify-center bg-gray-50">
      <form onSubmit={sync} className="w-full max-w-lg bg-white p-6 rounded-2xl shadow space-y-4">
        <h1 className="text-2xl font-bold">Sync MT5 Trades</h1>

        <input
          placeholder="mt5_account_id (UUID)"
          value={mt5AccountId}
          onChange={(e) => setMt5AccountId(e.target.value)}
          className="w-full p-3 border rounded"
          required
        />

        {err && <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{err}</div>}
        {loading ? (
          <button disabled className="w-full py-3 bg-gray-300 rounded">Syncing…</button>
        ) : (
          <button className="w-full py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700">Sync now</button>
        )}
        {resMsg && <p className="text-sm text-green-700">{resMsg}</p>}
      </form>
    </div>
  );
}
