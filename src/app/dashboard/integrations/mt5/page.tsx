// src/app/dashboard/integrations/mt5/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MT5IntegrationPage() {
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [integrationKey, setIntegrationKey] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // get local session user info from Supabase client (auth-helpers)
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const id = user?.id ?? null;
      setUserId(id);
      if (!id) return;
      // fetch the integration key from users table (public)
      const { data: rows } = await supabase.from("users").select("integration_key").eq("id", id).maybeSingle();
      setIntegrationKey(rows?.integration_key ?? null);

      // fetch recent trades via server route
      setLoading(true);
      try {
        const res = await fetch(`/api/mt5/recent?userId=${id}`);
        const json = await res.json();
        setRecent(json.trades ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerateKey = async () => {
    if (!userId) return alert("Sign in first");
    // You should implement a protected server route to generate/store integration_key for the user.
    // For now instruct the user where to create it. Show a helpful note:
    alert("In production: call a server API to create and store a random integration_key for this user. See README.");
  };

  const webhookUrl = `${location.origin}/api/mt5/webhook`;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto bg-white/5 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-3">Connect MT5 (Webhook)</h2>

        <p className="text-sm text-gray-300 mb-4">
          Option A (recommended): Install our MT5 Expert Advisor that sends trade open/close events to a webhook.
          Option B: Run the local Python connector if you prefer.
        </p>

        <div className="mb-4">
          <h3 className="font-medium">Webhook URL</h3>
          <div className="mt-2 rounded bg-zinc-900 p-3 text-sm">
            <code className="break-words">{webhookUrl}</code>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-medium">Integration key</h3>
          <p className="text-xs text-gray-300 mb-2">This key identifies your account to the webhook. Create/generate it from your account settings (server-side).</p>
          <div className="flex gap-2">
            <input value={integrationKey ?? ""} readOnly className="flex-1 rounded p-2 bg-black/50 text-sm" />
            <button className="px-3 py-2 bg-indigo-600 rounded" onClick={handleGenerateKey}>Generate key</button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-medium">MT5 Expert Advisor (EA) instructions</h3>
          <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2">
            <li>Download and install the EA file into your MT5 `MQL5/Experts` folder and compile.</li>
            <li>In MT5: Tools → Options → Expert Advisors → add your webhook domain to <em>Allow WebRequest for listed URL</em>.</li>
            <li>Attach the EA to the chart you trade with. In the EA settings, set your webhook URL and integration key.</li>
            <li>The EA will post trade events to the webhook whenever trades open or close.</li>
          </ol>
        </div>

        <div className="mb-6">
          <h3 className="font-medium">Local Python connector (optional)</h3>
          <p className="text-sm text-gray-300">Run a small Python script on the same machine as your MT5 terminal to push trade history and updates to the webhook. See `tools/mt5_connector.py` in the repo for an example.</p>
        </div>

        <div>
          <h3 className="font-medium mb-2">Recent imported trades</h3>
          {loading ? <div>Loading...</div> : (
            <div className="text-sm">
              {recent.length === 0 ? (
                <div className="text-gray-400">No trades received yet.</div>
              ) : (
                <ul className="space-y-2">
                  {recent.map((t) => (
                    <li key={t.id} className="p-2 rounded border border-white/6 bg-black/20">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{t.symbol} • {t.direction}</div>
                          <div className="text-xs text-gray-300">P&L: {t.pnl ?? "—"} • Lot: {t.lot_size ?? "—"}</div>
                        </div>
                        <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
