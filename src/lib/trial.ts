// src/lib/trial.ts
import { createClient } from "@/utils/supabase/server";

export type TrialInfo = {
  isGrandfathered: boolean;
  isPaid: boolean;
  signupAt: string | null;
  trialEndsAt: string | null;
  daysLeft: number | null;
  expired: boolean;
};

export function isPaidPlan(plan: string | null | undefined): boolean {
  const p = String(plan || "starter").toLowerCase();
  return p === "pro" || p === "plus" || p === "elite";
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function getTrialInfoByEmail(email: string): Promise<TrialInfo | null> {
  const supabase = createClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, plan, is_grandfathered, signup_at, trial_ends_at")
    .eq("email", email)
    .maybeSingle();
  if (error || !user) return null;

  const paid = isPaidPlan(user.plan as string);
  const gf = Boolean(user.is_grandfathered);
  const signupAt = user.signup_at as string | null;
  const trialEndsAt = (user.trial_ends_at as string | null) || null;

  if (paid || gf) {
    return {
      isGrandfathered: gf,
      isPaid: paid,
      signupAt,
      trialEndsAt,
      daysLeft: null,
      expired: false,
    };
  }

  let daysLeft: number | null = null;
  let expired = false;

  if (trialEndsAt) {
    const now = new Date();
    const end = new Date(trialEndsAt);
    daysLeft = daysBetween(now, end);
    expired = now > end;
  }

  return {
    isGrandfathered: gf,
    isPaid: paid,
    signupAt,
    trialEndsAt,
    daysLeft,
    expired,
  };
}

export async function requireActiveTrialOrPaid(email: string): Promise<{ allowed: boolean; reason?: string; info?: TrialInfo }>{
  const info = await getTrialInfoByEmail(email);
  if (!info) return { allowed: false, reason: "USER_NOT_FOUND" };
  if (info.isPaid || info.isGrandfathered) return { allowed: true, info };
  if (info.trialEndsAt) {
    const now = new Date();
    const end = new Date(info.trialEndsAt);
    if (now <= end) return { allowed: true, info };
  }
  return { allowed: false, reason: "TRIAL_EXPIRED", info };
}

