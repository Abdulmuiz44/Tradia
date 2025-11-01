"use client";

import { useEffect, useState } from "react";

type TrialInfo = {
  isGrandfathered: boolean;
  isPaid: boolean;
  signupAt: string | null;
  trialEndsAt: string | null;
  daysLeft: number | null;
  expired: boolean;
};

export default function TrialBanner() {
  const [info, setInfo] = useState<TrialInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/user/trial-status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!mounted || !data?.info) return;
        setInfo(data.info as TrialInfo);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!info || info.isPaid || info.isGrandfathered) return null;

  if (info.expired) {
    return (
      <div className="w-full bg-red-600 text-white text-sm md:text-base p-3 text-center">
        Your 30-day free trial has ended. <a href="/checkout?reason=trial_expired" className="underline font-semibold">Upgrade now</a> to continue using Tradia.
      </div>
    );
  }

  const daysLeft = typeof info.daysLeft === 'number' ? Math.max(0, info.daysLeft) : null;

  return (
    <div className="w-full bg-blue-600 text-white text-sm md:text-base p-3 text-center">
      30-day free trial active{daysLeft !== null ? ` — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}. <a href="/checkout" className="underline font-semibold">Upgrade anytime</a>.
    </div>
  );
}
