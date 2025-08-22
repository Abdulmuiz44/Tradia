"use client";

import { useContext, useState } from "react";
import { TradeContext } from "@/context/TradeContext";

export default function MT5SyncButton() {
  const { setTradesFromCsv } = useContext(TradeContext);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    const login = prompt("Enter your MT5 Login ID:");
    const password = prompt("Enter your MT5 Password:");
    const server = prompt("Enter your MT5 Server:");

    if (!login || !password || !server) {
      alert("❌ All MT5 credentials are required!");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/integrations/mt5/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, server }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ Failed to sync: ${data.error || "Unknown error"}`);
        return;
      }

      // Store the trades in context (which also updates UI instantly)
      setTradesFromCsv(data.trades);

      alert("✅ MT5 Trades Synced Successfully!");
    } catch (err) {
      console.error("MT5 Sync Error:", err);
      alert("❌ An error occurred while syncing MT5 trades.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? "Syncing..." : "Sync MT5 Trades"}
    </button>
  );
}
