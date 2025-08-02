// app/components/LayoutClient.tsx

"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface LayoutClientProps {
  children: ReactNode;
}

const LayoutClient = ({ children }: LayoutClientProps) => {
  return <SessionProvider>{children}</SessionProvider>;
};

export default LayoutClient;
