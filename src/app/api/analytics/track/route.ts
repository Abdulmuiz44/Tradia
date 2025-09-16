import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createAdminSupabase } from '@/utils/supabase/admin';

type TrackBody = {
  type: 'page_view' | 'action' | 'page_duration';
  path: string;
  name?: string;
  referrer?: string;
  meta?: Record<string, any>;
  durationMs?: number;
  sessionId?: string;
  viewport?: { w: number; h: number };
  tz?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = (await req.json()) as TrackBody;
    const supabase = createAdminSupabase();

    // Collect request metadata
    const ua = req.headers.get('user-agent') || undefined;
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      (req.ip as string | undefined);

    // Basic shape validation
    if (!body?.type || !body?.path) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const record = {
      type: body.type,
      path: body.path,
      name: body.name ?? null,
      referrer: body.referrer ?? null,
      meta: body.meta ?? null,
      duration_ms: body.durationMs ?? null,
      session_id: body.sessionId ?? null,
      viewport_w: body.viewport?.w ?? null,
      viewport_h: body.viewport?.h ?? null,
      tz: body.tz ?? null,
      user_id: (session?.user as any)?.id ?? null,
      user_email: session?.user?.email ?? null,
      user_agent: ua ?? null,
      ip: ip ?? null,
    };

    await supabase.from('page_activity').insert(record);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

