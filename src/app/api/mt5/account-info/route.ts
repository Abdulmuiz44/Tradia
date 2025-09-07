import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { fetchAndSyncAccountInfo } from "@/lib/mtapi";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { server, login, password } = await req.json();
    if (!server || !login || !password) {
      return NextResponse.json({ error: "Server, login, and password required" }, { status: 400 });
    }

    const { account_info } = await fetchAndSyncAccountInfo(userId, { server, login, password });
    return NextResponse.json({ success: true, accountInfo: account_info });
  } catch (err) {
    console.error("Account-info API error:", err);
    return NextResponse.json({ error: "Failed to fetch account info" }, { status: 500 });
  }
}
