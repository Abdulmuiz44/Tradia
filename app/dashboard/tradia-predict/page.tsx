"use client";

import LayoutClient from "@/components/LayoutClient";
import TradiaPredictPanel from "@/components/analytics/TradiaPredictPanel";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/spinner";
import { useUser } from "@/context/UserContext";

export default function TradiaPredictPage() {
  const { status } = useSession();
  const router = useRouter();
  const { plan } = useUser();

  if (status === "loading") {
    return <Spinner />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return <Spinner />;
  }

  const normalizedPlan = (plan || "free").toLowerCase();

  if (normalizedPlan !== 'plus' && normalizedPlan !== 'elite' && normalizedPlan !== 'pro') {
    router.push("/dashboard");
    return <Spinner />;
  }

  return (
    <LayoutClient>
      <div className="p-4 md:p-6">
        <TradiaPredictPanel />
      </div>
    </LayoutClient>
  );
}
