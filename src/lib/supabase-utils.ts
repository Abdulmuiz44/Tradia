import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Check if user has exceeded daily limits
export async function checkDailyLimit(userId: string, limitType: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get current usage
    const { data: usageData, error: usageError } = await supabase
      .from('usage_stats')
      .select(`${limitType}_count`)
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Usage check error:', usageError);
      return false;
    }

    const currentCount = usageData?.[`${limitType}_count`] || 0;

    // Get plan limits
    const { data: planData, error: planError } = await supabase
      .rpc('get_user_plan_limits', { user_id: userId });

    if (planError || !planData || planData.length === 0) {
      console.error('Plan limits error:', planError);
      return false;
    }

    const planLimits = planData[0];
    let limit: number;

    switch (limitType) {
      case 'messages':
        limit = planLimits.ai_chats_per_day;
        break;
      case 'uploads':
        // For uploads, use a default limit based on plan
        limit = planLimits.plan === 'free' ? 0 :
               planLimits.plan === 'pro' ? 5 :
               planLimits.plan === 'plus' ? 20 : 100;
        break;
      case 'api_calls':
        limit = 1000; // Default API call limit
        break;
      default:
        limit = 0;
    }

    // -1 means unlimited
    return limit === -1 || currentCount < limit;
  } catch (error) {
    console.error('checkDailyLimit error:', error);
    return false;
  }
}

// Increment usage counter
export async function incrementUsage(userId: string, usageType: string, incrementBy: number = 1): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Try to update existing record first
    const { data: existingData } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existingData) {
      // Update existing record
      const updateData: any = { updated_at: new Date().toISOString() };
      if (usageType === 'messages') updateData.messages_count = existingData.messages_count + incrementBy;
      if (usageType === 'uploads') updateData.uploads_count = existingData.uploads_count + incrementBy;
      if (usageType === 'api_calls') updateData.api_calls_count = existingData.api_calls_count + incrementBy;

      await supabase
        .from('usage_stats')
        .update(updateData)
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      // Insert new record
      const insertData: any = {
        user_id: userId,
        date: today,
        messages_count: usageType === 'messages' ? incrementBy : 0,
        uploads_count: usageType === 'uploads' ? incrementBy : 0,
        api_calls_count: usageType === 'api_calls' ? incrementBy : 0,
      };

      await supabase
        .from('usage_stats')
        .insert(insertData);
    }
  } catch (error) {
    console.error('incrementUsage error:', error);
    // Don't throw error to avoid breaking the main flow
  }
}

// Get user's current plan
export async function getUserPlan(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('plan, is_active, subscription_status')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('getUserPlan error:', error);
      return { plan: 'free', isActive: true };
    }

    return {
      plan: data.plan || 'free',
      isActive: data.is_active !== false,
      subscriptionStatus: data.subscription_status || 'inactive'
    };
  } catch (error) {
    console.error('getUserPlan error:', error);
    return { plan: 'free', isActive: true };
  }
}

// Get user's usage statistics
export async function getUserUsage(userId: string, date?: string) {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('getUserUsage error:', error);
      return { messages: 0, uploads: 0, apiCalls: 0 };
    }

    return {
      messages: data?.messages_count || 0,
      uploads: data?.uploads_count || 0,
      apiCalls: data?.api_calls_count || 0,
    };
  } catch (error) {
    console.error('getUserUsage error:', error);
    return { messages: 0, uploads: 0, apiCalls: 0 };
  }
}

// Update user profile
export async function updateUserProfile(userId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('updateUserProfile error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('updateUserProfile error:', error);
    throw error;
  }
}
