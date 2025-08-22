export async function syncMT5Trades(login: string, password: string, server: string) {
  try {
    const res = await fetch("http://localhost:5000/sync_mt5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password, server }),
    });

    if (!res.ok) {
      throw new Error(`Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.trades; // This will be the trades array from Flask
  } catch (err) {
    console.error("MT5 Sync Error:", err);
    return [];
  }
}
