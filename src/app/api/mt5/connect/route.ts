// src/app/api/mt5/connect/route.ts
import { NextRequest, NextResponse } from "next/server";

type ConnectBody = {
  server?: string;
  login?: string;
  investorPassword?: string;
  name?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConnectBody;

    const server = typeof body.server === "string" ? body.server.trim() : "";
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const investorPassword =
      typeof body.investorPassword === "string" ? body.investorPassword : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!server || !login || !investorPassword) {
      return NextResponse.json(
        { error: "server, login and investorPassword are required" },
        { status: 400 }
      );
    }

    // TODO: implement actual connect logic (store credentials encrypted, verify, etc.)
    // For now return success placeholder
    return NextResponse.json({
      success: true,
      message: "MT5 connect request accepted (placeholder).",
      account: { server, login, name: name || undefined },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed" }, { status: 500 });
  }
}
