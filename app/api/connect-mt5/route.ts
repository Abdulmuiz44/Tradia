import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, login, serverUrl, apiKey } = body;

    if (!userId || !login || !serverUrl || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In production, encrypt apiKey before saving!
    // e.g., const encryptedKey = encrypt(apiKey); 
    const encryptedKey = apiKey; 

    const { data, error } = await supabase
      .from('mt5_accounts')
      .upsert({
        user_id: userId,
        account_login: login,
        server_url: serverUrl,
        api_key_encrypted: encryptedKey,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, account_login' })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Connection error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
