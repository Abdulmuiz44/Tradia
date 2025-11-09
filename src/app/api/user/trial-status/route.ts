// src/app/api/user/trial-status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { getTrialInfoByEmail } from "@/lib/trial";
import { sendTrialExpiredEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const info = await getTrialInfoByEmail(email);
    if (!info) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

    // Opportunistic email on expiry (only once)
    if (info.expired && !info.isPaid && !info.isGrandfathered) {
      const supabase = createClient();
      const { data: user } = await supabase
        .from("users")
        .select("id, trial_expiry_email_sent_at, closed_at")
        .eq("email", email)
        .maybeSingle();

      if (user) {
        try {
          if (!user.trial_expiry_email_sent_at) {
            await sendTrialExpiredEmail(email);
          }
          await supabase
            .from("users")
            .update({
              trial_expiry_email_sent_at: user.trial_expiry_email_sent_at || new Date().toISOString(),
              closed_at: user.closed_at || new Date().toISOString(),
            })
            .eq("id", user.id);
        } catch (e) {
          console.warn("Failed to send expiry email:", e);
        }
      }
    }

    return NextResponse.json({ ok: true, info });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest?: unknown }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("trial-status error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
