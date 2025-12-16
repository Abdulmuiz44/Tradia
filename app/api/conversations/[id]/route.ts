// src/app/api/conversations/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient();
        const conversationId = params.id;

        // Get conversation
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("*")
            .eq("id", conversationId)
            .eq("user_id", userId)
            .single();

        if (convError) throw convError;
        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        // Get messages
        const { data: messages, error: msgError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

        if (msgError) throw msgError;

        return NextResponse.json({
            conversation,
            messages: messages || []
        });
    } catch (err: unknown) {
        console.error("Failed to fetch conversation:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || "Failed to fetch conversation" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, pinned, archived, model } = body;

        const supabase = createClient();
        const conversationId = params.id;

        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (title !== undefined) updateData.title = title;
        if (pinned !== undefined) updateData.pinned = pinned;
        if (archived !== undefined) updateData.archived = archived;
        if (model !== undefined) updateData.model = model;

        const { data, error } = await supabase
            .from("conversations")
            .update(updateData)
            .eq("id", conversationId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        return NextResponse.json({ conversation: data });
    } catch (err: unknown) {
        console.error("Failed to update conversation:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || "Failed to update conversation" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient();
        const conversationId = params.id;

        // Delete conversation (messages will be deleted automatically due to CASCADE)
        const { error } = await supabase
            .from("conversations")
            .delete()
            .eq("id", conversationId)
            .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("Failed to delete conversation:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || "Failed to delete conversation" }, { status: 500 });
    }
}
