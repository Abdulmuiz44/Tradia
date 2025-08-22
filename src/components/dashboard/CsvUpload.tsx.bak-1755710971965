// src/components/dashboard/CsvUpload.tsx

"use client";

import React, { useState, useContext } from "react";
import Papa from "papaparse";
import { TradeContext } from "@/context/TradeContext";
import { Trade } from "@/types/trade";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";

const CsvUpload: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setTradesFromCsv } = useContext(TradeContext);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Trade>(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const validTrades: Trade[] = results.data.map((row) => ({
          ...row,
          id: row.id || crypto.randomUUID(),
        }));
        setTradesFromCsv(validTrades);
        toast.success("CSV data uploaded successfully!");
        setIsModalOpen(false);
      },
      error: function () {
        toast.error("Failed to parse CSV. Please check the format.");
      },
    });
  };

  return (
    <>
      <Button
        variant="default"
        onClick={() => setIsModalOpen(true)}
        className="mt-4"
      >
        Upload CSV
      </Button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Upload Trade CSV</h2>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="mb-4"
          />
          <Button onClick={() => setIsModalOpen(false)}>Close</Button>
        </div>
      </Modal>
    </>
  );
};

export default CsvUpload;
