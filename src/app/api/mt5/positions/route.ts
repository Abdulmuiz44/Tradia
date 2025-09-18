import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { fetchPositionsAndSync } from "@/lib/mtapi";
import { requireActiveTrialOrPaid } from "@/lib/trial";

export async function POST(req: Request) {
  if (process.env.FREEZE_MT5_INTEGRATION === '1') {
    return NextResponse.json({ error: 'MT5 integration temporarily disabled' }, { status: 503 });
  }
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const email = (session?.user as any)?.email as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const trial = email ? await requireActiveTrialOrPaid(email) : { allowed: false };
    if (!email || !trial.allowed || !(trial.info?.isGrandfathered || trial.info?.isPaid)) {
      return NextResponse.json({ error: "UPGRADE_REQUIRED" }, { status: 403 });
    }

    const { server, login, password } = await req.json();
    if (!server || !login || !password) {
      return NextResponse.json({ error: "Server, login, and password required" }, { status: 400 });
    }

    const { positions } = await fetchPositionsAndSync(userId, { server, login, password });
    return NextResponse.json({ success: true, positions });
  } catch (err) {
    console.error("Positions API error:", err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}
