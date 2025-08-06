const mockLeaders = [
  { name: "Alice", winRate: 85 },
  { name: "Bob", winRate: 77 },
  { name: "Charlie", winRate: 68 },
];

export default function Leaderboard() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Top Performers</h2>
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="border-b dark:border-zinc-700">
            <th className="text-left p-2">Trader</th>
            <th className="text-left p-2">Win Rate (%)</th>
          </tr>
        </thead>
        <tbody>
          {mockLeaders.map((trader, idx) => (
            <tr key={idx} className="border-b dark:border-zinc-700">
              <td className="p-2">{trader.name}</td>
              <td className="p-2">{trader.winRate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
