import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserPlan, updateUserProfile, getUserUsage } from '../../../lib/supabase-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (req.method === 'GET') {
      // Get user profile
      const plan = await getUserPlan(user.id);
      const usage = await getUserUsage(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          ...profile,
          ...plan,
        },
        usage,
      });

    } else if (req.method === 'PUT') {
      // Update user profile
      const { fullName, metadata } = req.body;

      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (fullName !== undefined) {
        updates.metadata = { ...updates.metadata, full_name: fullName };
      }

      if (metadata) {
        updates.metadata = { ...updates.metadata, ...metadata };
      }

      const updatedProfile = await updateUserProfile(user.id, updates);

      res.status(200).json({
        user: updatedProfile,
        message: 'Profile updated successfully',
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('User profile API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
