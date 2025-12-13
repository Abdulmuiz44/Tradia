import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    // Verify admin access via authorization header or session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabase();

    // Run the migration
    const { data, error } = await supabase.rpc('exec_migration');

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Schema migration completed',
      data
    });
  } catch (error: any) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminSupabase();

    // Check if timestamp column exists
    const { data: columns, error } = await supabase.rpc('get_columns', {
      p_table: 'trades'
    });

    if (error) {
      console.error('Error fetching columns:', error);
      return NextResponse.json({
        exists: false,
        message: 'Could not verify schema'
      });
    }

    const hasTimestamp = columns?.some((col: any) => col.column_name === 'timestamp');
    const hasOpentime = columns?.some((col: any) => col.column_name === 'opentime');

    return NextResponse.json({
      timestamp_exists: hasTimestamp,
      opentime_exists: hasOpentime,
      columns: columns?.map((col: any) => col.column_name)
    });
  } catch (error: any) {
    console.error('Schema check error:', error);
    return NextResponse.json({
      error: error.message,
      timestamp_exists: false
    });
  }
}
