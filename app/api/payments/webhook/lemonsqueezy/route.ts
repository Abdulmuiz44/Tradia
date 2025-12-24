// src/app/api/payments/webhook/lemonsqueezy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { verifyWebhookSignature } from "@/lib/lemonsqueezy.server";
import { logPayment } from "@/lib/payment-logging.server";

function asString(u: unknown) {
  return typeof u === "string" ? u.trim() : String(u ?? "");
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }

    // Log receipt of webhook for traceability
    await logPayment(
      "webhook",
      "info",
      "Received LemonSqueezy webhook",
      { headers: Object.fromEntries(req.headers), payload },
      null
    );

    // Verify webhook signature
    const signature = req.headers.get("x-signature") || "";
    const isValidSignature = await verifyWebhookSignature(raw, signature);

    if (!isValidSignature) {
      console.warn("Webhook: invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const event = payload?.meta?.event_name || "";
    const data = payload?.data || {};

    // Extract relevant information
    const orderId = asString(data?.id || data?.order_id || "");
    const subscriptionId = asString(
      data?.subscription_id || data?.subscription?.id || ""
    );
    const customerEmail = asString(
      data?.customer?.email || data?.customer_email || ""
    );
    const status = asString(data?.status || "");
    const customData = data?.custom || {};
    const userId = asString(customData?.user_id || "");
    const billingCycle = asString(customData?.billing_cycle || "monthly");

    // Extract variant/product info from attributes
    const variantId = asString(
      data?.variant?.id || data?.variant_id || ""
    );

    const supabase = createClient();

    // Handle order.created or order.completed events
    if (
      event === "order.created" ||
      event === "order.completed" ||
      event === "order.refunded"
    ) {
      // Get variant info to determine plan type
      const variantAttributes = data?.variant?.attributes || {};
      const variantName = asString(variantAttributes?.name || "");

      // Extract plan type from variant name (e.g., "Pro Monthly", "Plus Yearly")
      let planType = "pro";
      if (
        variantName.toLowerCase().includes("elite") ||
        variantName.includes("Elite")
      ) {
        planType = "elite";
      } else if (
        variantName.toLowerCase().includes("plus") ||
        variantName.includes("Plus")
      ) {
        planType = "plus";
      }

      if (status === "paid" || status === "completed") {
        // Order successful - activate subscription
        let userToUpdate: string | null = null;

        // Try to find user by ID from custom data first
        if (userId && userId !== "guest") {
          userToUpdate = userId;
        }

        // Fallback: find user by email
        if (!userToUpdate && customerEmail) {
          const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();
          if (userRow) {
            userToUpdate = userRow.id;
          }
        }

        // Update or create user_plans record
        if (userToUpdate) {
          const { data: existing } = await supabase
            .from("user_plans")
            .select("*")
            .eq("user_id", userToUpdate)
            .eq("plan_type", planType)
            .maybeSingle();

          if (existing) {
            // Update existing record
            await supabase
              .from("user_plans")
              .update({
                status: "active",
                lemonsqueezy_order_id: orderId,
                lemonsqueezy_subscription_id: subscriptionId,
                lemonsqueezy_variant_id: variantId,
                lemonsqueezy_transaction: data,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
          } else {
            // Create new record
            const amount = parseFloat(
              asString(data?.total_formatted || data?.amount || "0")
                .replace(/[^\d.-]/g, "")
            ) || 0;

            await supabase.from("user_plans").insert({
              user_id: userToUpdate,
              plan_type: planType,
              billing_cycle: billingCycle as "monthly" | "yearly",
              amount,
              currency: asString(data?.currency || "USD"),
              status: "active",
              lemonsqueezy_order_id: orderId,
              lemonsqueezy_subscription_id: subscriptionId,
              lemonsqueezy_variant_id: variantId,
              lemonsqueezy_transaction: data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          // Update user's active plan
          await supabase
            .from("users")
            .update({ plan: planType })
            .eq("id", userToUpdate);

          await logPayment(
            "webhook",
            "info",
            "Activated subscription from order webhook",
            {
              orderId,
              subscriptionId,
              planType,
              status: "active",
            },
            userToUpdate
          );
        }
      } else if (status === "refunded" || status === "failed") {
        // Handle refunds or failed payments
        if (userId && userId !== "guest") {
          // Mark as pending or failed
          await supabase
            .from("user_plans")
            .update({
              status: status === "refunded" ? "refunded" : "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("lemonsqueezy_order_id", orderId);

          await logPayment(
            "webhook",
            "info",
            `Order ${status}`,
            { orderId, status },
            userId
          );
        }
      }
    }

    // Handle subscription.created events
    if (event === "subscription.created") {
      const userToUpdate = userId || null;
      if (userToUpdate && userToUpdate !== "guest") {
        // Update existing plan with subscription ID if not already set
        const { data: existing } = await supabase
          .from("user_plans")
          .select("*")
          .eq("user_id", userToUpdate)
          .is("lemonsqueezy_subscription_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_plans")
            .update({
              lemonsqueezy_subscription_id: subscriptionId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
      }
    }

    // Handle subscription.updated events (pause/resume)
    if (event === "subscription.updated") {
      const newStatus = asString(data?.status || "");
      if (subscriptionId) {
        const { data: existing } = await supabase
          .from("user_plans")
          .select("*")
          .eq("lemonsqueezy_subscription_id", subscriptionId)
          .maybeSingle();

        if (existing) {
          let planStatus = "active";
          if (
            newStatus === "paused" ||
            newStatus === "past_due" ||
            newStatus === "expired"
          ) {
            planStatus = "paused";
          } else if (newStatus === "cancelled") {
            planStatus = "cancelled";
          }

          await supabase
            .from("user_plans")
            .update({
              status: planStatus,
              lemonsqueezy_transaction: data,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          await logPayment(
            "webhook",
            "info",
            `Subscription ${newStatus}`,
            { subscriptionId, status: planStatus },
            existing.user_id
          );
        }
      }
    }

    // Handle subscription.cancelled events
    if (event === "subscription.cancelled") {
      if (subscriptionId) {
        const { data: existing } = await supabase
          .from("user_plans")
          .select("*")
          .eq("lemonsqueezy_subscription_id", subscriptionId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_plans")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          await logPayment(
            "webhook",
            "info",
            "Subscription cancelled",
            { subscriptionId },
            existing.user_id
          );
        }
      }
    }

    await logPayment(
      "webhook",
      "info",
      `LemonSqueezy webhook processed: ${event}`,
      { event, orderId, subscriptionId },
      null
    );

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    await logPayment(
      "webhook",
      "error",
      err instanceof Error ? err.message : String(err),
      null,
      null
    );
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
