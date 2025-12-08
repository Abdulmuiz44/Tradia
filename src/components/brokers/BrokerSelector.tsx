"use client";

import React from "react";

type Broker = {
  id: string;
  name: string;
  tag?: string;
  disabled?: boolean;
};

const BROKERS: Broker[] = [
  { id: "mt4", name: "MetaTrader 4 (MT4)", tag: "Coming soon", disabled: true },
  { id: "ctrader", name: "cTrader", tag: "Coming soon", disabled: true },
  { id: "binance", name: "Binance", tag: "Coming soon", disabled: true },
];

export default function BrokerSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BROKERS.map((b) => (
        <button
          key={b.id}
          type="button"
          disabled={b.disabled}
          onClick={() => onChange(b.id)}
          className={`px-3 py-2 rounded-lg border text-sm ${
            value === b.id ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700 bg-white'
          } ${b.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {b.name}
          {b.tag && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
              {b.tag}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

