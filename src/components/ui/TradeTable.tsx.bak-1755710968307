'use client';

import React, { useState } from 'react';

const dummyData = [
  { pair: 'EUR/USD', result: 'Win', lot: 0.5, date: '2025-07-20' },
  { pair: 'BTC/USD', result: 'Loss', lot: 1, date: '2025-07-18' },
  { pair: 'USD/JPY', result: 'Win', lot: 0.3, date: '2025-07-19' },
];

export default function TradeTable() {
  const [filter, setFilter] = useState('All');

  const filtered = dummyData.filter((trade) =>
    filter === 'All' ? true : trade.result === filter
  );

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm mt-8">
      <div className="flex justify-between mb-3">
        <h3 className="font-semibold text-lg">Recent Trades</h3>
        <select
          onChange={(e) => setFilter(e.target.value)}
          className="border p-1 rounded"
        >
          <option>All</option>
          <option>Win</option>
          <option>Loss</option>
        </select>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Pair</th>
            <th>Result</th>
            <th>Lot</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((trade, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="py-2">{trade.pair}</td>
              <td>{trade.result}</td>
              <td>{trade.lot}</td>
              <td>{trade.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
