import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);

      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (error.message.includes('Email not confirmed')) {
        return res.status(401).json({ error: 'Please confirm your email before logging in' });
      }

      return res.status(400).json({ error: error.message });
    }

    if (!data.user || !data.session) {
      return res.status(400).json({ error: 'Login failed' });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('plan, is_active, subscription_status')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    // Return user data and session
    res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        plan: profile?.plan || 'free',
        isActive: profile?.is_active !== false,
        subscriptionStatus: profile?.subscription_status || 'inactive',
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      }
    });

  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
