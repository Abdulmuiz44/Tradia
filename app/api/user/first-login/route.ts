import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAdminSupabase } from "@/utils/supabase/admin";

/**
 * GET: Check if this is the user's first login
 * Returns: { isFirstLogin, redirectTo }
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createAdminSupabase();
        const email = session.user.email.toLowerCase();

        // Get user data
        const { data: user, error } = await supabase
            .from("users")
            .select("id, first_login_complete, plan")
            .eq("email", email)
            .single();

        if (error || !user) {
            // New user, redirect to upgrade
            return NextResponse.json({
                isFirstLogin: true,
                redirectTo: "/dashboard/upgrade"
            });
        }

        const isFirstLogin = user.first_login_complete !== true;

        return NextResponse.json({
            isFirstLogin,
            redirectTo: isFirstLogin ? "/dashboard/upgrade" : null,
        });
    } catch (error) {
        console.error("Error checking first login status:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

/**
 * POST: Mark first login as complete
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createAdminSupabase();
        const email = session.user.email.toLowerCase();

        // Update first login complete flag
        const { error } = await supabase
            .from("users")
            .update({
                first_login_complete: true,
                updated_at: new Date().toISOString()
            })
            .eq("email", email);

        if (error) {
            console.error("Error updating first login status:", error);
            return NextResponse.json({ error: "Failed to update" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking first login complete:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
