// components/LayoutClient.tsx

"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import UpgradeModal from "@/components/modals/UpgradeModal";

interface LayoutClientProps {
  children: ReactNode;
}

const LayoutClient = ({ children }: LayoutClientProps) => {
  return (
    <SessionProvider>
      {children}
      <UpgradeModal />
    </SessionProvider>
  );
};

export default LayoutClient;
