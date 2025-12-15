"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface MobileBackButtonProps {
  className?: string;
  showOnDesktop?: boolean;
}

export default function MobileBackButton({
  className = "",
  showOnDesktop = false,
}: MobileBackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`${
        showOnDesktop ? "" : "lg:hidden"
      } p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors ${className}`}
      title="Go back"
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
