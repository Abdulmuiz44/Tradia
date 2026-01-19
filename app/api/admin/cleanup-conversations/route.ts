// One-time cleanup endpoint to remove legacy conv_ prefix conversations
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createAdminClient();

        // Delete all conversations with legacy 'conv_' prefix for this user
        const { data, error } = await supabase
            .from("conversations")
            .delete()
            .eq("user_id", userId)
            .like("id", "conv_%")
            .select("id");

        if (error) {
            throw error;
        }

        const deletedCount = data?.length || 0;

        return NextResponse.json({
            success: true,
            message: `Deleted ${deletedCount} legacy conversations`,
            deletedCount
        });
    } catch (err: unknown) {
        console.error("Cleanup error:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
