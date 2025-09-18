import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { validateAccount } from "@/lib/mtapi";
import { requireActiveTrialOrPaid } from "@/lib/trial";

export async function POST(req: Request) {
  if (process.env.FREEZE_MT5_INTEGRATION === '1') {
    return NextResponse.json({ error: 'MT5 integration temporarily disabled' }, { status: 503 });
  }
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    // Trial enforcement
    const trial = await requireActiveTrialOrPaid(String(userEmail));
    if (!trial.allowed || !(trial.info?.isGrandfathered || trial.info?.isPaid)) {
      return NextResponse.json(
        { error: "UPGRADE_REQUIRED", message: "Broker validation requires an active paid plan. Trial users must upgrade." },
        { status: 403 }
      );
    }
    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { server, login, investorPassword } = await req.json();
    if (!server || !login || !investorPassword) {
      return NextResponse.json(
        { error: "Server, login, and password are required" },
        { status: 400 }
      );
    }

    try {
      const { account_info } = await validateAccount({
        server,
        login,
        password: investorPassword,
      });

      return NextResponse.json({
        success: true,
        accountInfo: account_info,
        message: "MT5 connection validated successfully",
      });
    } catch (e: any) {
      const message = typeof e?.message === 'string' ? e.message : 'Validation failed';
      // Surface a clear error back to the client so UI can show it
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Validate API error:", err);
    const message = err instanceof Error ? err.message : 'Validation failed';
    return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
  }
}
