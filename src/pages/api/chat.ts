import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';
import { checkDailyLimit, incrementUsage } from '../../../lib/supabase-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For Supabase, we might need to get the Supabase user ID if different
    const userId = session.user.id;

    const { message, tradeHistory, mode } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check daily message limit
    const hasLimit = await checkDailyLimit(userId, 'messages');
    if (!hasLimit) {
      return res.status(429).json({
        error: 'Daily message limit exceeded. Please upgrade your plan.',
        upgradeRequired: true
      });
    }

    // Sanitize input
    const sanitizedMessage = message.trim().slice(0, 1000);

    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Get user's recent trades for context (last 10)
    let tradeContext = '';
    if (tradeHistory && Array.isArray(tradeHistory) && tradeHistory.length > 0) {
      const recentTrades = tradeHistory.slice(-10);
      tradeContext = `\n\nRecent Trading History:\n${recentTrades.map((trade: any, i: number) =>
        `${i + 1}. ${trade.symbol}: ${trade.side} ${trade.quantity} @ ${trade.price} (PnL: ${trade.pnl || 'N/A'})`
      ).join('\n')}`;
    }

    // Build AI prompt based on mode
    const systemPrompt = mode === 'grok'
      ? `You are Grok, a helpful and maximally truthful AI trading assistant built by xAI. You have real-time access to market data and can provide sophisticated trading analysis. Be direct, insightful, and focus on actionable trading intelligence. Use your training data to provide market context when relevant.`
      : `You are Tradia Coach, an AI trading mentor focused on helping traders develop sustainable strategies and risk management. Provide encouraging, educational responses that help traders grow their skills. Focus on psychology, risk management, and long-term success.`;

    const fullPrompt = `${systemPrompt}\n\nUser message: ${sanitizedMessage}${tradeContext}`;

    // Call OpenAI API (you'll need to add your API key)
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4', // or gpt-3.5-turbo for cost savings
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${sanitizedMessage}${tradeContext}` }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }

    const aiData = await openaiResponse.json();
    const aiResponse = aiData.choices?.[0]?.message?.content || 'I apologize, but I encountered an issue generating a response.';

    // Increment usage counter
    await incrementUsage(userId, 'messages');
    await incrementUsage(userId, 'api_calls');

    // Return the AI response
    res.status(200).json({
      response: aiResponse,
      usage: {
        messagesToday: await getTodayUsage(user.id, 'messages'),
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
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
