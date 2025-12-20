// app/dashboard/accounts/page.tsx
import React from "react";
import AccountManager from "@/components/accounts/AccountManager";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Accounts",
  description: "Manage your trading accounts",
};

export default function AccountsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AccountManager />
    </div>
  );
}
