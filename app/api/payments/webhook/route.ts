// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Route webhook to the appropriate payment provider handler
  // LemonSqueezy uses 'x-signature' header, while Flutterwave uses 'verif-hash'
  const signature = req.headers.get("x-signature");
  const verifHash = req.headers.get("verif-hash");
  
  let handlerUrl = "";
  
  if (signature) {
    // LemonSqueezy webhook
    handlerUrl = `${process.env.NEXTAUTH_URL}/api/payments/webhook/lemonsqueezy`;
  } else if (verifHash) {
    // Flutterwave webhook (legacy)
    handlerUrl = `${process.env.NEXTAUTH_URL}/api/payments/webhook/flutterwave`;
  } else {
    return NextResponse.json({ error: "Unknown payment provider" }, { status: 400 });
  }
  
  const body = await req.text();
  const res = await fetch(handlerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...Object.fromEntries(req.headers) },
    body,
  });
  const json = await res.text();
  return new NextResponse(json, { status: res.status });
}
