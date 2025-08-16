// src/app/api/trades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ures = await pool.query('SELECT id FROM users WHERE email=$1 LIMIT 1', [email]);
    const user = ures.rows[0];
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { rows } = await pool.query(
      `SELECT *
         FROM trades
        WHERE user_id=$1
        ORDER BY close_time DESC NULLS LAST, created_at DESC`,
      [user.id]
    );
    return NextResponse.json({ trades: rows });
  } catch (err: any) {
    console.error('Fetch trades error:', err);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}
