"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type PlanType = "free" | "plus" | "pro" | "elite";

interface UserContextType {
  plan: PlanType;
  setPlan: (plan: PlanType) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [plan, setPlan] = useState<PlanType>("free"); // default to "free"

  return (
    <UserContext.Provider value={{ plan, setPlan }}>
      {children}
    </UserContext.Provider>
  );
};
