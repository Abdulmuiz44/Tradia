/**
 * Ensure database schema has all required columns for trades table
 * Run this after deploying to make sure schema is up to date
 */
import { createAdminSupabase } from '../src/utils/supabase/admin';

const requiredColumns = {
  id: 'UUID',
  user_id: 'UUID',
  symbol: 'TEXT',
  side: 'TEXT',
  quantity: 'DECIMAL',
  price: 'DECIMAL',
  pnl: 'DECIMAL',
  status: 'TEXT',
  metadata: 'JSONB',
  created_at: 'TIMESTAMP WITH TIME ZONE',
  opentime: 'TIMESTAMP WITH TIME ZONE',
  closetime: 'TIMESTAMP WITH TIME ZONE',
  entryprice: 'DECIMAL',
  exitprice: 'DECIMAL',
  stoplossprice: 'DECIMAL',
  takeprofitprice: 'DECIMAL',
  direction: 'TEXT',
  ordertype: 'TEXT',
  session: 'TEXT',
  outcome: 'TEXT',
  resultrr: 'DECIMAL',
  duration: 'TEXT',
  reasonfortrade: 'TEXT',
  strategy: 'TEXT',
  emotion: 'TEXT',
  journalnotes: 'TEXT',
  notes: 'TEXT',
  beforescreenshoturl: 'TEXT',
  afterscreenshoturl: 'TEXT',
  commission: 'DECIMAL',
  swap: 'DECIMAL',
  pinned: 'BOOLEAN',
  tags: 'TEXT[]',
  reviewed: 'BOOLEAN',
  profitloss: 'TEXT',
  rr: 'DECIMAL',
};

async function ensureSchema() {
  try {
    const supabase = createAdminSupabase();

    // Check existing columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'trades')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('Error checking columns:', columnsError);
      return;
    }

    const existingColumns = new Set(columns?.map(c => c.column_name) || []);

    // Log current schema
    console.log('Current columns in trades table:', Array.from(existingColumns).sort());

    // Check for missing columns
    const missingColumns = Object.keys(requiredColumns).filter(
      col => !existingColumns.has(col)
    );

    if (missingColumns.length === 0) {
      console.log('✓ All required columns exist');
      return;
    }

    console.log(`Missing ${missingColumns.length} columns:`, missingColumns);
    console.log('\nRun the migration in Supabase SQL Editor:');
    console.log('migrations/001_update_trades_schema.sql');
  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

ensureSchema();
