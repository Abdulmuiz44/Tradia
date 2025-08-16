// src/app/mt5/connect/page.tsx
'use client';

import { useState } from 'react';

export default function MT5ConnectPage() {
  const [form, setForm] = useState({
    server: '',
    login: '',
    investorPassword: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(s => ({ ...s, [e.target.name]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/mt5/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to connect');
      setMsg('MT5 account connected. You can sync history now.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 flex items-start justify-center bg-gray-50">
      <form onSubmit={submit} className="w-full max-w-lg bg-white p-6 rounded-2xl shadow space-y-4">
        <h1 className="text-2xl font-bold">Connect MT5 Account</h1>

        <input name="server" placeholder="Broker Server (e.g. ICMarketsSC-MT5)"
               onChange={onChange} value={form.server}
               className="w-full p-3 border rounded" required />

        <input name="login" placeholder="Account login (number)"
               onChange={onChange} value={form.login}
               className="w-full p-3 border rounded" required />

        <input name="investorPassword" type="password" placeholder="Investor password"
               onChange={onChange} value={form.investorPassword}
               className="w-full p-3 border rounded" required />

        <input name="name" placeholder="Label (optional)"
               onChange={onChange} value={form.name}
               className="w-full p-3 border rounded" />

        {err && <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{err}</div>}
        {loading ? (
          <button disabled className="w-full py-3 bg-gray-300 rounded">Connecting…</button>
        ) : (
          <button className="w-full py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700">Connect</button>
        )}
        {msg && <p className="text-sm text-green-700">{msg}</p>}
      </form>
    </div>
  );
}
