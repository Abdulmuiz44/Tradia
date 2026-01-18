"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/spinner";

/**
 * /dashboard/overview redirects to /dashboard
 * The main dashboard page already shows the overview content
 * This ensures consistent UI/UX across both routes
 */
export default function OverviewPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0f1319]">
            <Spinner />
        </div>
    );
}
