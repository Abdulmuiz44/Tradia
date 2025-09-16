import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createAdminSupabase } from '@/utils/supabase/admin';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Restrict to admin
  if (session.user.email !== 'abdulmuizproject@gmail.com') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from('page_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

