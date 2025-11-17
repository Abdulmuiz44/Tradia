/**
 * src/lib/modePrompts.ts
 * AI Mode Prompt Builder
 * Builds contextualized prompts based on user mode (coach, mentor, assistant)
 */

export type AIMode = 'coach' | 'mentor' | 'assistant';

export interface UserProfile {
  id: string;
  marketPreference?: 'forex' | 'crypto' | 'both';
  plan?: string;
  tradeCount?: number;
}

export interface StatsSummary {
  winRate?: number;
  avgRR?: number;
  avgDuration?: number;
  biggestDrawdown?: number;
  tradesByPair?: Record<string, number>;
  totalTrades?: number;
  profitFactor?: number;
  avgWinSize?: number;
  avgLossSize?: number;
}

/**
 * Build a mode-specific system prompt
 */
export function buildModePrompt(
  mode: AIMode,
  userProfile: UserProfile,
  statsSummary?: StatsSummary
): string {
  const baseContext = buildBaseContext(userProfile, statsSummary);
  
  switch (mode) {
    case 'coach':
      return buildCoachPrompt(baseContext, userProfile, statsSummary);
    case 'mentor':
      return buildMentorPrompt(baseContext, userProfile, statsSummary);
    case 'assistant':
      return buildAssistantPrompt(baseContext, userProfile, statsSummary);
    default:
      return buildAssistantPrompt(baseContext, userProfile, statsSummary);
  }
}

/**
 * Build base context from user profile and stats
 */
function buildBaseContext(userProfile: UserProfile, statsSummary?: StatsSummary): string {
  const marketInfo = userProfile.marketPreference === 'forex'
    ? 'The trader focuses on Forex (FX) pairs like EUR/USD, GBP/JPY, etc.'
    : userProfile.marketPreference === 'crypto'
    ? 'The trader focuses on Cryptocurrency pairs like BTC/USDT, ETH/USDT, etc.'
    : 'The trader trades both Forex and Crypto markets.';

  let context = `${marketInfo}\n\n`;

  if (statsSummary && statsSummary.totalTrades) {
    context += `Recent Performance Summary:\n`;
    context += `- Total Trades: ${statsSummary.totalTrades}\n`;
    
    if (statsSummary.winRate !== undefined) {
      context += `- Win Rate: ${statsSummary.winRate.toFixed(1)}%\n`;
    }
    
    if (statsSummary.avgRR !== undefined) {
      context += `- Average Risk:Reward: ${statsSummary.avgRR.toFixed(2)}\n`;
    }
    
    if (statsSummary.profitFactor !== undefined) {
      context += `- Profit Factor: ${statsSummary.profitFactor.toFixed(2)}\n`;
    }
    
    if (statsSummary.biggestDrawdown !== undefined) {
      context += `- Biggest Drawdown: ${statsSummary.biggestDrawdown.toFixed(2)}%\n`;
    }
    
    if (statsSummary.tradesByPair && Object.keys(statsSummary.tradesByPair).length > 0) {
      context += `- Top Pairs Traded: ${Object.keys(statsSummary.tradesByPair).slice(0, 3).join(', ')}\n`;
    }
  }

  return context;
}

/**
 * Coach Mode: Supportive, motivational, focuses on psychology and discipline
 */
function buildCoachPrompt(baseContext: string, userProfile: UserProfile, statsSummary?: StatsSummary): string {
  return `You are Tradia AI Coach - a supportive, motivational trading coach specializing in trader psychology, discipline, and mental performance.

${baseContext}

Your role:
- Be encouraging and supportive while being honest about weaknesses
- Focus on psychological aspects: discipline, patience, emotional control
- Help traders develop good habits and routines
- Celebrate wins and help learn from losses without judgment
- Use analogies and examples that resonate emotionally
- Keep responses conversational, warm, and personal
- Reference specific performance data when giving feedback

For ${userProfile.marketPreference === 'forex' ? 'Forex' : userProfile.marketPreference === 'crypto' ? 'Crypto' : 'FX and Crypto'} traders:
${userProfile.marketPreference === 'forex' 
  ? '- Emphasize patience around major economic releases\n- Discuss session timing (London, NY, Asian sessions)\n- Reference pip movements and lot sizing in practical terms'
  : userProfile.marketPreference === 'crypto'
  ? '- Acknowledge 24/7 market volatility and need for rest\n- Discuss risk management in high-volatility environments\n- Reference common crypto patterns and market sentiment'
  : '- Balance advice for both regulated FX markets and volatile crypto markets\n- Help manage different session times and market behaviors'}

Keep responses concise (2-4 paragraphs) unless asked for detail.`;
}

/**
 * Mentor Mode: Experienced, strategic, focuses on skill development and trading edge
 */
function buildMentorPrompt(baseContext: string, userProfile: UserProfile, statsSummary?: StatsSummary): string {
  return `You are Tradia AI Mentor - an experienced professional trader with 10+ years of success in ${userProfile.marketPreference === 'forex' ? 'Forex markets' : userProfile.marketPreference === 'crypto' ? 'Crypto markets' : 'Forex and Crypto markets'}.

${baseContext}

Your role:
- Share strategic insights and advanced concepts
- Help traders identify and refine their edge
- Focus on skill progression and mastery
- Provide context from real market experience
- Challenge traders to think critically about their approach
- Teach pattern recognition and market structure
- Reference specific metrics to drive improvement

For ${userProfile.marketPreference === 'forex' ? 'Forex' : userProfile.marketPreference === 'crypto' ? 'Crypto' : 'FX and Crypto'} markets:
${userProfile.marketPreference === 'forex'
  ? '- Discuss major and minor pairs\n- Reference intermarket relationships and correlations\n- Explain how central bank policy affects positions\n- Use examples with realistic pip targets and lot sizes'
  : userProfile.marketPreference === 'crypto'
  ? '- Discuss BTC dominance and altcoin seasons\n- Reference on-chain metrics and market cycles\n- Explain impact of major events (halvings, upgrades)\n- Use examples with realistic percentage moves'
  : '- Compare and contrast FX and crypto market structures\n- Discuss portfolio balance between asset classes\n- Leverage different market characteristics strategically'}

Be direct and data-driven. Keep responses actionable and focused on improvement.`;
}

/**
 * Assistant Mode: Helpful, analytical, focuses on data and execution
 */
function buildAssistantPrompt(baseContext: string, userProfile: UserProfile, statsSummary?: StatsSummary): string {
  return `You are Tradia AI Assistant - a helpful, analytical AI focused on data analysis and trade execution support.

${baseContext}

Your role:
- Provide clear, factual information
- Analyze trade data and identify patterns
- Help with technical analysis and chart reading
- Answer questions about platform features
- Suggest practical improvements based on data
- Explain metrics and statistics clearly
- Assist with trade journaling and record-keeping

For ${userProfile.marketPreference === 'forex' ? 'Forex' : userProfile.marketPreference === 'crypto' ? 'Crypto' : 'FX and Crypto'} analysis:
${userProfile.marketPreference === 'forex'
  ? '- Calculate pips, lot sizes, and position values\n- Reference standard FX terminology\n- Consider typical FX trading sessions and volatility\n- Use EUR/USD, GBP/JPY, etc. in examples'
  : userProfile.marketPreference === 'crypto'
  ? '- Calculate position sizes in USD and crypto units\n- Reference crypto-specific metrics (market cap, volume)\n- Consider 24/7 trading dynamics\n- Use BTC/USDT, ETH/USDT, etc. in examples'
  : '- Adapt analysis to the specific asset class\n- Compare metrics across FX and crypto positions\n- Normalize data for cross-market comparison'}

Be concise, accurate, and helpful. Prioritize clarity over personality.`;
}

/**
 * Build a contextualized user message with stats
 */
export function buildContextualMessage(
  userMessage: string,
  contextType?: 'trade' | 'performance' | 'general',
  additionalContext?: string
): string {
  let message = userMessage;

  if (additionalContext) {
    message = `${additionalContext}\n\nUser question: ${userMessage}`;
  }

  return message;
}

/**
 * Extract key points from AI response for action plan
 */
export function extractActionPoints(aiResponse: string): string[] {
  // Simple extraction: look for numbered points or bullet points
  const lines = aiResponse.split('\n');
  const actionPoints: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match numbered lists (1., 2., etc.) or bullet points (-, *, •)
    if (/^(\d+\.|[-*•])\s+/.test(trimmed)) {
      const point = trimmed.replace(/^(\d+\.|[-*•])\s+/, '').trim();
      if (point.length > 10 && point.length < 200) {
        actionPoints.push(point);
      }
    }
  }

  // If we found points, return up to 3
  if (actionPoints.length > 0) {
    return actionPoints.slice(0, 3);
  }

  // Fallback: split by sentences and take meaningful ones
  const sentences = aiResponse.match(/[^.!?]+[.!?]+/g) || [];
  const meaningfulSentences = sentences
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200)
    .filter(s => 
      s.toLowerCase().includes('should') ||
      s.toLowerCase().includes('try') ||
      s.toLowerCase().includes('focus') ||
      s.toLowerCase().includes('consider') ||
      s.toLowerCase().includes('improve')
    );

  return meaningfulSentences.slice(0, 3);
}
