// src/pages/api/integrations/mt5/sync.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as mt5 from "mt5linux";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { login, password, server } = req.body;

    if (!login || !password || !server) {
      return res.status(400).json({ error: "Missing MT5 credentials" });
    }

    // Initialize MT5 connection
    const connected = await mt5.initialize();
    if (!connected) {
      return res.status(500).json({ error: "Failed to initialize MT5" });
    }

    const loginResult = await mt5.login(login, password, server);
    if (!loginResult) {
      return res.status(401).json({ error: "MT5 login failed" });
    }

    // Get trade history for last 90 days
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const to = new Date();

    const history = await mt5.historyOrdersGet(from, to);

    // Convert MT5 trade data to your Trade type
    const trades = history.map((trade: any) => ({
      id: String(trade.ticket),
      symbol: trade.symbol,
      volume: trade.volume,
      openTime: trade.time_setup,
      closeTime: trade.time_done,
      profit: trade.profit,
      type: trade.type, // buy/sell
    }));

    // Shutdown MT5 connection
    await mt5.shutdown();

    return res.status(200).json({ trades });

  } catch (err) {
    console.error("MT5 Sync Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
