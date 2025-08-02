// src/components/dashboard/CsvUpload.tsx
import React, { useContext } from "react";
import Papa from "papaparse";
import { TradeContext } from "@/context/TradeContext";

const CsvUpload = () => {
  const { setTrades } = useContext(TradeContext);

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const formatted = result.data.map((row: any) => ({
          symbol: row.Symbol || "",
          direction: row.Direction || "",
          openTime: row["Open Time"] || "",
          closeTime: row["Close Time"] || "",
          lotSize: parseFloat(row["Lot Size"]) || 0,
          entryPrice: parseFloat(row["Entry Price"]) || 0,
          exitPrice: parseFloat(row["Exit Price"]) || 0,
          pnl: parseFloat(row["PNL ($)"]) || 0,
          duration: row.Duration || "",
          outcome: row.Outcome || "",
          rr: row["Risk To Reward (RR)"] || "",
        }));
        setTrades(formatted);
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-xl shadow-md w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-white">Upload Trade History CSV</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleCSV}
        className="file:bg-white/10 file:border-none file:px-4 file:py-2 file:rounded-md file:text-white file:cursor-pointer text-sm text-white"
      />
    </div>
  );
};

export default CsvUpload;
