// app/components/SessionToast.tsx

"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

const SessionToast = () => {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      console.log("User session:", session);
      // Optionally show a toast here if you want
    }
  }, [session, status]);

  return null; // No visual output — UI unchanged
};

export default SessionToast;
