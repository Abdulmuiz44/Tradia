"use client";

import { redirect } from "next/navigation";

// Redirect to the default journal tab
export default function TradeJournalPage() {
  redirect("/dashboard/trade-journal/journal");
}
