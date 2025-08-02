import React from 'react';

interface CardProps {
  title: string;
  value: string;
  growth?: string;
}

export default function PerformanceCard({ title, value, growth }: CardProps) {
  return (
    <div className="bg-white shadow-sm rounded-2xl p-4 w-full sm:w-64 hover:shadow-md transition">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="text-2xl font-bold mt-1 text-gray-800">{value}</h2>
      {growth && (
        <p className="text-green-500 text-xs mt-1">{growth} growth</p>
      )}
    </div>
  );
}
