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

export default function TrialStatusCard() {
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

  if (!info) return null;
  if (info.isPaid || info.isGrandfathered) return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="text-sm text-gray-300">Subscription status</div>
      <div className="mt-1 text-green-400 font-medium">Active paid plan</div>
    </div>
  );

  const daysLeft = typeof info.daysLeft === 'number' ? Math.max(0, info.daysLeft) : null;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="text-sm text-gray-300">Trial status</div>
      {info.expired ? (
        <div className="mt-1 text-red-400 font-medium">Trial ended — <a href="/checkout?reason=trial_expired" className="underline">upgrade to continue</a></div>
      ) : (
        <div className="mt-1 text-blue-400 font-medium">{daysLeft !== null ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Active'}</div>
      )}
      {info.trialEndsAt && (
        <div className="mt-1 text-xs text-gray-400">Ends on {new Date(info.trialEndsAt).toLocaleDateString()}</div>
      )}
    </div>
  );
}

