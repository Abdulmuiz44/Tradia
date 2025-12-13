/**
 * Utility to validate that the Supabase trades table has all required columns
 * Can be called during app initialization to warn if schema is incomplete
 */

import { createClient } from '@supabase/supabase-js';

const requiredColumns = [
  'id',
  'user_id',
  'symbol',
  'side',
  'quantity',
  'price',
  'pnl',
  'status',
  'metadata',
  'created_at',
  'opentime',
  'closetime',
  'entryprice',
  'exitprice',
  'stoplossprice',
  'takeprofitprice',
  'direction',
  'ordertype',
  'session',
  'outcome',
  'resultrr',
  'duration',
  'reasonfortrade',
  'strategy',
  'emotion',
  'journalnotes',
  'notes',
  'beforescreenshoturl',
  'afterscreenshoturl',
  'commission',
  'swap',
  'pinned',
  'tags',
  'reviewed',
  'profitloss',
  'rr',
  'lotsize',
];

export async function validateTradesSchema(): Promise<{
  isValid: boolean;
  missingColumns: string[];
  extraColumns: string[];
  message: string;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials not found');
      return {
        isValid: false,
        missingColumns: [],
        extraColumns: [],
        message: 'Supabase credentials missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get table structure
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'trades',
    }).catch(() => ({
      data: null,
      error: 'RPC function not available',
    }));

    if (error || !data) {
      // Fallback: try to insert a dummy row and see what happens
      const testData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        symbol: 'TEST',
        side: 'buy',
        quantity: 0,
        price: 0,
        opentime: new Date().toISOString(),
        status: 'open',
        metadata: {},
      };

      const { error: insertError } = await supabase
        .from('trades')
        .insert([testData]);

      if (insertError?.message.includes('column') && insertError?.message.includes('does not exist')) {
        const match = insertError.message.match(/column (\w+) does not exist/);
        if (match) {
          return {
            isValid: false,
            missingColumns: [match[1]],
            extraColumns: [],
            message: `❌ Missing column: ${match[1]}. Run migration: migrations/003_fix_trades_schema.sql`,
          };
        }
      }

      return {
        isValid: true,
        missingColumns: [],
        extraColumns: [],
        message: '✓ Schema appears valid',
      };
    }

    const existingColumns = data.map((col: any) => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    const extraColumns = existingColumns.filter((col: string) => !requiredColumns.includes(col));

    const isValid = missingColumns.length === 0;

    if (isValid) {
      console.log('✓ Trades table schema is valid');
      return {
        isValid: true,
        missingColumns: [],
        extraColumns,
        message: '✓ Schema is valid. All required columns exist.',
      };
    } else {
      console.error('❌ Trades table schema is incomplete');
      console.error('Missing columns:', missingColumns);
      return {
        isValid: false,
        missingColumns,
        extraColumns,
        message: `❌ Missing ${missingColumns.length} column(s): ${missingColumns.join(', ')}. Run migrations/003_fix_trades_schema.sql in Supabase SQL Editor.`,
      };
    }
  } catch (error) {
    console.error('Error validating schema:', error);
    return {
      isValid: false,
      missingColumns: [],
      extraColumns: [],
      message: 'Error validating schema',
    };
  }
}

// Log validation result on module load (in development only)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  validateTradesSchema().then(result => {
    if (!result.isValid) {
      console.warn('⚠️ Database schema warning:', result.message);
    }
  });
}
