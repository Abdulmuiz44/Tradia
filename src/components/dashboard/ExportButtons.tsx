// src/components/dashboard/ExportButtons.tsx
"use client";

import React from "react";
import { utils, writeFile } from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";

type Row = Record<string, unknown>;

interface ExportButtonsProps {
  data: ReadonlyArray<Row>;
}

export default function ExportButtons({ data }: ExportButtonsProps): React.ReactElement {
  const exportExcel = (): void => {
    const ws = utils.json_to_sheet<Row>([...data]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Trades");
    writeFile(wb, "trades.xlsx");
  };

  const exportJSON = (): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "trades.json");
  };

  return (
    <div className="flex space-x-3">
      <Button variant="outline" onClick={exportExcel} data-track="export_trades" data-track-meta='{"format":"excel"}'>
        Export Excel
      </Button>
      <Button variant="outline" onClick={exportJSON} data-track="export_trades" data-track-meta='{"format":"json"}'>
        Export JSON
      </Button>
    </div>
  );
}
