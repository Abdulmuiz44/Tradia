// DrawdownChart.tsx "use client";

import React from "react"; import { Line } from "react-chartjs-2"; import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, } from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface Props { trades: { profit?: number; time?: string }[]; }

export default function DrawdownChart({ trades }: Props) { let equity = 0; let peak = 0; const ddSeries: number[] = [];

trades.forEach(t => { equity += t.profit ?? 0; peak = Math.max(peak, equity); const dd = equity - peak; ddSeries.push(dd); });

return ( <div className="p-4 border rounded-xl"> <h2 className="text-lg font-semibold mb-4">Drawdown Chart</h2> <Line data={{ labels: trades.map((_, i) => i + 1), datasets: [ { label: "Drawdown", data: ddSeries, borderColor: "#ef4444", fill: false, }, ], }} options={{ responsive: true, plugins: { legend: { position: "top" } }, }} /> </div> ); }

