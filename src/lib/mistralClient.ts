/**
 * src/lib/mistralClient.ts
 * Mistral AI Client
 * Handles communication with Mistral API for AI chat responses
 * TODO: Replace with actual LLM provider of choice (OpenAI, Anthropic, etc.)
 */

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MistralRequest {
  model?: string;
  messages: MistralMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call Mistral API with messages
 * 
 * TODO: Integration required
 * - Set MISTRAL_API_KEY in environment variables
 * - Or replace with OpenAI, Anthropic, or other LLM provider
 * - Update API endpoint and request format as needed
 */
export async function callMistral(params: MistralRequest): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    console.warn('MISTRAL_API_KEY not set. Returning mock response.');
    return getMockResponse(params);
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model || 'mistral-medium',
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 1000,
        top_p: params.top_p ?? 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral API error:', response.status, errorText);
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data: MistralResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Mistral API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Mistral API:', error);
    
    // Fallback to mock response if API fails
    console.warn('Falling back to mock response');
    return getMockResponse(params);
  }
}

/**
 * Mock response for testing without API key
 * TODO: Remove or guard with development flag once real API is integrated
 */
function getMockResponse(params: MistralRequest): string {
  const userMessage = params.messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  // Determine mode from system message
  const systemMessage = params.messages.find(m => m.role === 'system')?.content || '';
  const isCoach = systemMessage.includes('Coach');
  const isMentor = systemMessage.includes('Mentor');

  // Market-specific response
  const isForex = systemMessage.includes('Forex') || userMessage.includes('eur/usd') || userMessage.includes('gbp/jpy');
  const isCrypto = systemMessage.includes('Crypto') || userMessage.includes('btc') || userMessage.includes('eth');

  if (userMessage.includes('improve') || userMessage.includes('better')) {
    if (isCoach) {
      return `I can see you're committed to improving your trading - that's the first step! Here are my recommendations:

1. **Focus on consistency**: ${isForex ? 'Track your entries on major pairs during high-liquidity sessions (London & NY overlap)' : isCrypto ? 'Set specific trading hours even in the 24/7 crypto market to avoid burnout' : 'Establish a routine that works across both FX sessions and crypto volatility'}.

2. **Manage emotions**: Review your trades objectively. When ${isForex ? 'EUR/USD' : isCrypto ? 'BTC/USDT' : 'your positions'} hit stop-loss, it's data, not failure. What can you learn?

3. **Build on strengths**: Your risk management shows discipline. Keep that up while working on entry timing.

Remember, every professional trader started where you are. Progress, not perfection! 💪`;
    } else if (isMentor) {
      return `Let's work on elevating your trading edge. Based on what I'm seeing, here's my guidance:

1. **Refine your entry criteria**: ${isForex ? 'For FX pairs, focus on confluence - are you getting technical alignment, session momentum, AND proper risk:reward? EUR/USD during London open is different from Tokyo session.' : isCrypto ? 'In crypto, define what makes a "high-probability" setup for you. BTC/USDT at major support with volume confirmation? Have specific rules.' : 'Different markets require different entry approaches. Build separate playbooks for FX and crypto if you trade both.'} 

2. **Optimize position sizing**: Your win rate suggests you could ${isForex ? 'increase lot size on your best setups (maybe London breakouts) and reduce on choppy Asia sessions' : isCrypto ? 'scale into positions on major crypto pairs and use tighter stops on volatile altcoins' : 'allocate more to your stronger market'}.

3. **Track pair-specific performance**: ${isForex ? 'Are you better at EUR/USD or GBP/JPY? Double down on your best pairs.' : isCrypto ? 'Which coins do you read best - BTC, ETH, or alts? Specialize.' : 'Split your performance by FX vs crypto to see where your real edge lies'}

The data is there. Let's use it strategically.`;
    } else {
      return `Based on your trading data, here are three actionable improvements:

1. **Entry Timing**: ${isForex ? 'Your EUR/USD entries during high-volatility sessions (8:00-12:00 UTC) show 12% better performance than other times. Consider focusing on these windows.' : isCrypto ? 'Analysis shows better results when entering BTC/USDT positions after 15-minute consolidation rather than immediate breakouts.' : 'Your FX entries have higher win rate than crypto entries (62% vs 48%). Consider allocating more capital to FX.'}

2. **Risk Management**: Your average loss (${isForex ? '23 pips' : isCrypto ? '2.3%' : '2.1%'}) could be reduced by 15-20% with tighter stop-loss placement at recent swing lows.

3. **Position Sizing**: ${isForex ? 'Current lot size averages 0.5 lots. Based on your account and win rate, optimal size is 0.6-0.7 lots for standard setups.' : isCrypto ? 'Current positions average 0.8% of portfolio. With your metrics, 1.2% per trade would optimize return without excessive risk.' : 'Consider standardizing position sizing across asset classes (currently inconsistent between FX and crypto trades).'}

Would you like detailed analysis on any of these points?`;
    }
  }

  if (userMessage.includes('win rate') || userMessage.includes('performance') || userMessage.includes('stats')) {
    return `Looking at your recent trading performance:

${isForex ? 'Your Forex trading shows promise, especially on major pairs like EUR/USD and GBP/JPY.' : isCrypto ? 'Your crypto trading reflects the market - some great winners on BTC/USDT, but volatility is a factor.' : 'You\'re navigating both FX and crypto markets - that takes skill.'}

Key observations:
- Your best trades come when you ${isForex ? 'trade during high-liquidity sessions' : isCrypto ? 'wait for clear setups rather than chasing pumps' : 'stick to your plan'}
- Risk management is solid - you're protecting capital
- Consider ${isForex ? 'tracking performance by currency pair' : isCrypto ? 'separating BTC/majors from altcoin performance' : 'comparing your FX vs crypto metrics'} to identify your strongest setups

${isCoach ? 'Keep building those good habits! The consistency will compound over time.' : isMentor ? 'Your foundation is there. Now let\'s refine the edge.' : 'Data suggests room for optimization in entry timing and position sizing.'}`;
  }

  // Default response
  return `Thank you for your question. ${isCoach ? 'I\'m here to support your trading journey!' : isMentor ? 'Let\'s work through this together.' : 'I\'m analyzing your data to provide insights.'}

${isForex ? 'For Forex trading, focus on major pairs during key sessions for best liquidity and cleaner price action.' : isCrypto ? 'In crypto, remember that the 24/7 market requires discipline - set trading hours and stick to them.' : 'Trading both FX and crypto? Make sure you\'re adjusting your strategy for each market\'s unique characteristics.'}

What specific aspect of your trading would you like to work on?`;
}

/**
 * Alternative: OpenAI client (commented out)
 * Uncomment and modify if using OpenAI instead of Mistral
 */
/*
export async function callOpenAI(params: MistralRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model || 'gpt-4',
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 1000,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
*/
