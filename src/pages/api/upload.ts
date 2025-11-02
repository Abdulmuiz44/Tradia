import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkDailyLimit, incrementUsage } from '../../lib/supabase-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Check if user has file upload permissions
    const { data: planData, error: planError } = await supabase
      .rpc('get_user_plan_limits', { user_id: user.id });

    if (planError || !planData || planData.length === 0) {
      return res.status(500).json({ error: 'Could not verify plan limits' });
    }

    const userPlan = planData[0];
    const canUpload = userPlan.plan !== 'free'; // Only free plan can't upload

    if (!canUpload) {
      return res.status(403).json({
        error: 'File uploads are not available for your plan. Please upgrade.',
        upgradeRequired: true
      });
    }

    // Check daily upload limit
    const hasLimit = await checkDailyLimit(user.id, 'uploads');
    if (!hasLimit) {
      return res.status(429).json({
        error: 'Daily upload limit exceeded. Please try again tomorrow.',
        upgradeRequired: false
      });
    }

    // Handle file upload
    const file = req.body.file || req.body;
    const fileName = req.body.fileName || req.body.name;
    const fileSize = req.body.fileSize || req.body.size;
    const mimeType = req.body.mimeType || req.body.type;

    if (!file || !fileName) {
      return res.status(400).json({ error: 'File and filename are required' });
    }

    // Validate file size (max 10MB for now)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    // Validate file type (images and PDFs for now)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (mimeType && !allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'File type not allowed. Only images and PDFs are supported.' });
    }

    // Generate unique file path
    const fileExt = fileName.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filePath = `${user.id}/${timestamp}-${randomId}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-uploads')
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    // Save file metadata to database
    const { data: fileData, error: dbError } = await supabase
      .from('file_uploads')
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_path: uploadData.path,
        file_size: fileSize,
        mime_type: mimeType,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database save error:', dbError);
      // Try to delete the uploaded file if DB save fails
      await supabase.storage
        .from('chat-uploads')
        .remove([uploadData.path]);
      return res.status(500).json({ error: 'Failed to save file metadata' });
    }

    // Increment usage counter
    await incrementUsage(user.id, 'uploads');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-uploads')
      .getPublicUrl(uploadData.path);

    res.status(200).json({
      file: {
        id: fileData.id,
        name: fileName,
        path: uploadData.path,
        url: urlData.publicUrl,
        size: fileSize,
        type: mimeType,
      },
      usage: {
        uploadsToday: await getTodayUsage(user.id, 'uploads'),
      }
    });

  } catch (error) {
    console.error('Upload API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to get today's usage
async function getTodayUsage(userId: string, type: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('usage_stats')
    .select(`${type}_count`)
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) return 0;
  return data[`${type}_count`] || 0;
}
