// src/app/api/coach/weekly-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { sendEmail } from "@/lib/email";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const recap = body?.recap as { wr?: number; net?: number; avgWin?: number; avgLoss?: number } | undefined;
  const email = session.user.email as string;

  const subject = `Your Weekly Coach Recap`;
  const wr = recap?.wr ?? "-";
  const net = recap?.net ?? "-";
  const avgWin = recap?.avgWin ?? "-";
  const avgLoss = recap?.avgLoss ?? "-";

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto;">
      <h2>Weekly Coach Recap</h2>
      <p>Here's a quick look at your last 7 days:</p>
      <ul>
        <li><strong>Win rate:</strong> ${wr}%</li>
        <li><strong>Net P/L:</strong> ${net}</li>
        <li><strong>Avg win:</strong> ${avgWin}</li>
        <li><strong>Avg loss:</strong> -${avgLoss}</li>
      </ul>
      <p>Tip: Keep risk per trade = 1-2% and take short breaks after losses to reset.</p>
    </div>
  `;

  try {
    await sendEmail(email, subject, html);
    return NextResponse.json({ sent: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'send_failed' }, { status: 500 });
  }
}