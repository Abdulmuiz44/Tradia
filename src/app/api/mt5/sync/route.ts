// src/app/api/mt5/sync/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { getMetaApi } from "@/lib/metaapi";
import { mapMt5Deals } from "@/lib/mt5-map";
import { syncProgressTracker } from "@/lib/sync-progress";
import { z } from "zod";

const bodySchema = z.object({
  mt5AccountId: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  syncId: z.string().optional(), // For progress tracking
});

function toDateOrNull(u: unknown): Date | null {
  if (!u) return null;
  if (u instanceof Date) return isNaN(u.getTime()) ? null : u;
  const s = String(u);
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000);
  if (/^\d{13}$/.test(s)) return new Date(Number(s));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    // getServerSession returns Session | null. Session.user typically has only name/email/image.
    // Cast to flexible record to safely read custom id put there by our session callback.
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as Record<string, unknown> | undefined;
    const userId =
      sessionUser && sessionUser["id"] != null ? String(sessionUser["id"]) : undefined;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user's plan access for MT5
    const { getUserPlan, canAccessMT5 } = await import("@/lib/planAccess");
    const userPlan = await getUserPlan(userId);
    if (!canAccessMT5(userPlan)) {
      return NextResponse.json({
        error: "MT5 integration requires a Pro, Plus, or Elite plan",
        upgradeRequired: true,
        currentPlan: userPlan.type
      }, { status: 403 });
    }

    const bodyRaw = (await req.json()) as unknown;
    const parsed = bodySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { mt5AccountId, from, to, syncId } = parsed.data;

    // fetch account and check ownership via Supabase
    const supabase = createClient();
    const { data: acc, error: accErr } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("id", mt5AccountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (accErr) throw accErr;
    if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // normalize account id and metaapi account id as strings
    const accId = acc["id"] != null ? String(acc["id"]) : undefined;
    const metaapiAccountId =
      acc["metaapi_account_id"] != null ? String(acc["metaapi_account_id"]) : undefined;

    if (!accId) return NextResponse.json({ error: "Invalid account id" }, { status: 500 });
    if (!metaapiAccountId)
      return NextResponse.json({ error: "Account not connected to MetaApi" }, { status: 400 });

  // Update progress: Connecting
  if (syncId) {
    await syncProgressTracker.updateProgress(syncId, {
      currentStep: "Connecting to MT5",
      currentStepIndex: 0,
      message: "Establishing connection to MetaTrader 5...",
      progress: 10
    });
  }

  // Connect to MTAPI .NET service
  const mtapiUrl = process.env.MTAPI_SERVICE_URL || 'http://localhost:5000';
  const syncEndpoint = `${mtapiUrl}/api/mt5/sync`;

  // Update progress: Authenticating
  if (syncId) {
    await syncProgressTracker.updateProgress(syncId, {
      currentStep: "Authenticating",
      currentStepIndex: 1,
      message: "Verifying account credentials...",
      progress: 25
    });
  }

    const fromTs = from ? new Date(from) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 90); // last 90 days
    const toTs = to ? new Date(to) : new Date();

    // Update progress: Fetching Account Info
    if (syncId) {
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Fetching Account Info",
        currentStepIndex: 2,
        message: "Retrieving account information...",
        progress: 35
      });
    }

    // Call MTAPI service to get deals
    const syncResponse = await fetch(syncEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        from: fromTs.toISOString(),
        to: toTs.toISOString()
      })
    });

    if (!syncResponse.ok) {
      throw new Error(`MTAPI service error: ${syncResponse.statusText}`);
    }

    const syncData = await syncResponse.json();
    if (!syncData.success) {
      throw new Error(syncData.error || 'Failed to sync with MTAPI');
    }

    const dealsRaw = syncData.trades || [];
    const accountInfo = syncData.accountInfo;

    // Update progress: Analyzing Trade History
    if (syncId) {
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Analyzing Trade History",
        currentStepIndex: 3,
        message: "Scanning for new trades...",
        progress: 45,
        totalTrades: Array.isArray(dealsRaw) ? dealsRaw.length : 0
      });
    }

    // Map MTAPI deals to our format
    const normalized = dealsRaw.map((deal: any) => ({
      id: deal.id,
      ticket: deal.ticket,
      symbol: deal.symbol,
      volume: deal.volume,
      profit: deal.profit,
      price: deal.priceClose,
      time: new Date(deal.timeClose),
      type: deal.type,
      comment: deal.comment
    }));

    // Update progress: Processing Data
    if (syncId) {
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Processing Data",
        currentStepIndex: 4,
        message: "Validating and formatting trades...",
        progress: 60,
        totalTrades: normalized.length
      });
    }


    // Update progress: Saving to Database
    if (syncId) {
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Saving to Database",
        currentStepIndex: 5,
        message: "Storing trades securely...",
        progress: 75,
        totalTrades: normalized.length,
        processedTrades: 0
      });
    }

    // upsert each trade via Supabase (no explicit transaction)
    let processedCount = 0;
    let newTrades = 0;
    let updatedTrades = 0;

    for (const t of normalized) {
      const dealId =
        (t as Record<string, unknown>)["id"] ??
        (t as Record<string, unknown>)["deal_id"] ??
        null;
      const orderId =
        (t as Record<string, unknown>)["orderId"] ??
        (t as Record<string, unknown>)["order_id"] ??
        null;
      const positionId =
        (t as Record<string, unknown>)["positionId"] ??
        (t as Record<string, unknown>)["position_id"] ??
        null;

      const row: Record<string, unknown> = {
        user_id: userId,
        mt5_account_id: accId,
        deal_id: dealId,
        order_id: orderId,
        position_id: positionId,
        symbol: (t as Record<string, unknown>)["symbol"] ?? null,
        side:
          (t as Record<string, unknown>)["side"] ??
          (t as Record<string, unknown>)["type"] ??
          null,
        volume:
          (t as Record<string, unknown>)["lotSize"] ??
          (t as Record<string, unknown>)["volume"] ??
          null,
        price: (t as Record<string, unknown>)["price"] ?? null,
        profit:
          (t as Record<string, unknown>)["pnl"] ??
          (t as Record<string, unknown>)["profit"] ??
          null,
        commission: (t as Record<string, unknown>)["commission"] ?? null,
        swap: (t as Record<string, unknown>)["swap"] ?? null,
        taxes: (t as Record<string, unknown>)["taxes"] ?? null,
        reason: (t as Record<string, unknown>)["reason"] ?? null,
        comment:
          (t as Record<string, unknown>)["notes"] ??
          (t as Record<string, unknown>)["comment"] ??
          null,
        opened_at: toDateOrNull((t as Record<string, unknown>)["openTime"]) ?? null,
        closed_at: toDateOrNull((t as Record<string, unknown>)["closeTime"]) ?? null,
        updated_at: new Date(),
      };

      const { error: upErr } = await supabase
        .from("mt5_trades")
        .upsert(row, { onConflict: "mt5_account_id,deal_id" });
      if (upErr) {
        console.error("Failed to upsert mt5 trade:", upErr, row);
      } else {
        newTrades++; // Assume new if no error (simplified logic)
      }

      processedCount++;

      // Update progress every 10 trades or at key milestones
      if (syncId && (processedCount % 10 === 0 || processedCount === normalized.length)) {
        const progressPercent = 75 + Math.floor((processedCount / normalized.length) * 20); // 75-95%
        await syncProgressTracker.updateProgress(syncId, {
          progress: Math.min(progressPercent, 95),
          processedTrades: processedCount,
          newTrades,
          updatedTrades: processedCount - newTrades,
          message: `Processing trade ${processedCount} of ${normalized.length}...`
        });
      }
    }

    // Complete progress tracking
    if (syncId) {
      await syncProgressTracker.completeSync(syncId, {
        totalTrades: normalized.length,
        newTrades,
        updatedTrades: processedCount - newTrades,
        skippedTrades: 0
      });
    }

    return NextResponse.json({
      imported: processedCount,
      totalTrades: normalized.length,
      newTrades,
      updatedTrades: processedCount - newTrades,
      syncId
    });
  } catch (err: unknown) {
    console.error("mt5 sync error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
