// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Forward to the specific handler internally so we don't redirect (webhook expects 200)
  const url = `${process.env.NEXTAUTH_URL}/api/payments/webhook/flutterwave`;
  const body = await req.text();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...Object.fromEntries(req.headers) },
    body,
  });
  const json = await res.text();
  return new NextResponse(json, { status: res.status });
}
