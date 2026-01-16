import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAdminSupabase } from "@/utils/supabase/admin";

/**
 * GET: Check if the upgrade modal should be shown this session
 * Returns: { plan, modalShownThisSession }
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createAdminSupabase();
        const email = session.user.email.toLowerCase();

        // Get user data including plan and last modal shown time
        const { data: user, error } = await supabase
            .from("users")
            .select("id, plan, upgrade_modal_shown_at")
            .eq("email", email)
            .single();

        if (error || !user) {
            return NextResponse.json({
                plan: "starter",
                modalShownThisSession: false
            });
        }

        // Check if modal was shown in the last 24 hours (session-based)
        const modalShownAt = user.upgrade_modal_shown_at
            ? new Date(user.upgrade_modal_shown_at)
            : null;

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const modalShownThisSession = modalShownAt && modalShownAt > twentyFourHoursAgo;

        return NextResponse.json({
            plan: user.plan || "starter",
            modalShownThisSession,
        });
    } catch (error) {
        console.error("Error checking upgrade modal status:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

/**
 * POST: Mark the upgrade modal as shown
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        if (body.action !== "mark_shown") {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const supabase = createAdminSupabase();
        const email = session.user.email.toLowerCase();

        // Update the modal shown timestamp
        const { error } = await supabase
            .from("users")
            .update({
                upgrade_modal_shown_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq("email", email);

        if (error) {
            console.error("Error updating modal shown status:", error);
            return NextResponse.json({ error: "Failed to update" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking upgrade modal as shown:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
