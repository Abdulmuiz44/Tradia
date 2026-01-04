# Mistral AI Integration for Tradia

This document describes the complete Mistral AI integration for the Tradia trading platform.

## Overview

The integration provides AI-powered chat functionality with 5 specialized modes, each tailored for different trading needs:

1. **Coach Mode** (💪) - Motivational, growth-based guidance
2. **Mentor Mode** (🎓) - Expert trader advice and wisdom
3. **Assistant Mode** (🤖) - Straightforward Q&A and help
4. **Analysis Mode** (📊) - Chart breakdown, market structure, SMC logic
5. **Journal Mode** (📝) - Reflective questions about trading decisions

## Setup

### 1. Environment Configuration

Create a `.env.local` file in the project root (use `.env.local.example` as a template):

```bash
# Required: Mistral AI API Key
MISTRAL_API_KEY=your_mistral_api_key_here

# Optional: Default mode
TRADIA_MODE=assistant

# Optional: Twitter integration
TWITTER_BEARER_TOKEN=your_twitter_token
```

**Get your Mistral API key:**
- Visit: https://console.mistral.ai/
- Sign up or log in
- Navigate to API Keys section
- Create a new API key
- Copy and paste into `.env.local`

### 2. Vercel Configuration

For Vercel deployments, add the environment variables through the Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `MISTRAL_API_KEY` with your key
4. Optionally add `TRADIA_MODE` and `TWITTER_BEARER_TOKEN`

Vercel will automatically inject these variables at runtime.

## Architecture

### Core Components

```
src/
├── lib/
│   ├── mistral.ts          # Mistral API client
│   └── modes.ts            # Mode templates and system prompts
├── types/
│   └── mistral.ts          # TypeScript types
├── components/
│   └── ai/
│       ├── ModeSelector.tsx  # UI for mode selection
│       └── TradiaChat.tsx    # Example chat component
└── app/
    └── api/
        └── tradia/
            └── chat/
                └── route.ts  # API endpoint
```

### Flow Diagram

```
User Message
     ↓
React Component (TradiaChat.tsx)
     ↓
POST /api/tradia/chat
     ↓
API Route (route.ts)
     ├─ Authenticate user
     ├─ Validate input
     ├─ Check rate limit
     ├─ Fetch user trading data
     └─ Call Mistral client
          ↓
Mistral Client (mistral.ts)
     ├─ Select mode template
     ├─ Build system prompt
     ├─ Add conversation context
     └─ Call Mistral API
          ↓
Mistral AI API
     ↓
Response to User
```

## API Reference

### POST /api/tradia/chat

Send a message to the AI chat.

**Request:**
```json
{
  "message": "What's my win rate?",
  "userId": "optional-user-id",
  "mode": "assistant",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    }
  ]
}
```

**Response:**
```json
{
  "response": "Your current win rate is 65%...",
  "mode": "assistant",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "responseTime": 1234,
    "tradeCount": 150
  }
}
```

**Error Response:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 30 seconds."
}
```

### GET /api/tradia/chat

Get API information and status.

**Response:**
```json
{
  "service": "Tradia Chat API",
  "version": "1.0.0",
  "modes": ["coach", "mentor", "assistant", "analysis", "journal"],
  "status": "ready",
  "documentation": { ... }
}
```

## Usage Examples

### Basic Integration

```typescript
import { TradiaChat } from '@/components/ai/TradiaChat';

export default function ChatPage() {
  return (
    <div className="h-screen">
      <TradiaChat 
        userId="user-123"
        initialMode="coach"
      />
    </div>
  );
}
```

### Using the Hook

```typescript
import { useTradiaChat } from '@/components/ai/TradiaChat';

function MyComponent() {
  const { sendMessage, loading, error } = useTradiaChat(userId, 'mentor');
  
  const handleAsk = async () => {
    const response = await sendMessage('How can I improve my risk management?');
    console.log(response);
  };
  
  return (
    <button onClick={handleAsk} disabled={loading}>
      {loading ? 'Thinking...' : 'Ask Mentor'}
    </button>
  );
}
```

### Direct API Call

```typescript
async function askTradia(message: string, mode: TradiaMode) {
  const response = await fetch('/api/tradia/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, mode })
  });
  
  const data = await response.json();
  return data.response;
}
```

### Mode Selection UI

```typescript
import { ModeSelector, ModeInfo } from '@/components/ai/ModeSelector';

function ChatSettings() {
  const [mode, setMode] = useState<TradiaMode>('assistant');
  
  return (
    <div>
      <ModeSelector 
        currentMode={mode}
        onModeChange={setMode}
      />
      <ModeInfo mode={mode} />
    </div>
  );
}
```

## Modes in Detail

### Coach Mode (💪)
**Purpose:** Motivational support and growth mindset development

**Best for:**
- Building trading discipline
- Overcoming losing streaks
- Setting and achieving goals
- Developing positive habits

**Example questions:**
- "How can I stay disciplined after a losing streak?"
- "Help me build more confidence in my strategy"
- "What habits do successful traders develop?"

### Mentor Mode (🎓)
**Purpose:** Expert trading knowledge and professional guidance

**Best for:**
- Learning advanced concepts
- Understanding market structure
- Professional risk management
- Strategy development

**Example questions:**
- "Explain Smart Money Concepts in simple terms"
- "How do institutional traders approach risk management?"
- "What separates professional traders from amateurs?"

### Assistant Mode (🤖)
**Purpose:** Quick answers and practical help

**Best for:**
- Platform navigation
- Data analysis
- Metric calculations
- Feature guidance

**Example questions:**
- "What is my win rate this month?"
- "How do I import trades from MT5?"
- "Calculate my profit factor"

### Analysis Mode (📊)
**Purpose:** Technical analysis and market structure

**Best for:**
- Chart pattern analysis
- Market structure identification
- SMC/ICT concepts
- Technical setup evaluation

**Example questions:**
- "Analyze this chart pattern for me"
- "What does the market structure tell us?"
- "Identify order blocks and fair value gaps"

### Journal Mode (📝)
**Purpose:** Self-reflection and psychological awareness

**Best for:**
- Understanding decision-making
- Identifying patterns
- Emotional awareness
- Learning from experiences

**Example questions:**
- "What were you thinking when you entered this trade?"
- "What patterns do you notice in your losing trades?"
- "What did you learn from your best trade this week?"

## Security

### API Key Protection

- ✅ API key is **never** exposed to the client
- ✅ All AI calls happen server-side only
- ✅ Key is loaded from environment variables
- ✅ Warnings logged if key is missing

### Rate Limiting

Built-in rate limiting protects against abuse:

- **20 requests per minute** per user
- Enforced at both API route and Mistral client levels
- Returns clear error messages with retry timing
- Can be configured in production with Redis

### Input Validation

All inputs are validated:

- Message length limited to 5000 characters
- Mode must be one of the 5 valid options
- User authentication required
- SQL injection protection through Supabase

### Best Practices

1. **Never commit** `.env.local` to version control
2. **Rotate API keys** periodically
3. **Monitor usage** through Mistral dashboard
4. **Set spending limits** in Mistral console
5. **Use environment-specific keys** (dev vs. prod)

## Personalization

The system automatically personalizes responses based on:

1. **User's trading data** - Recent trades, performance metrics
2. **User's plan** - Starter, Pro, Plus, Elite
3. **Trading experience** - Beginner, Intermediate, Advanced
4. **Trading goals** - From user profile
5. **Conversation history** - Last 10 messages

### Context Building

```typescript
const context = {
  userName: 'John',
  tradingGoal: 'Achieve consistent profitability',
  experience: 'Intermediate',
  riskTolerance: 'Moderate',
  preferredMarkets: ['EURUSD', 'GBPUSD'],
  tradeData: userTrades
};
```

## Performance

### Response Times

- **Average:** 1-3 seconds
- **Model:** mistral-small-latest (default)
- **Advanced:** mistral-large-latest (analysis mode)

### Token Optimization

- System prompts: ~500 tokens
- User message: Variable
- Conversation history: Last 10 messages only
- Response limit: 1000 tokens (configurable)

### Caching

Consider implementing:
- Response caching for common questions
- User context caching
- Trade data caching (already in place via Supabase)

## Troubleshooting

### "Mistral API is not configured"

**Solution:** Add `MISTRAL_API_KEY` to your `.env.local` file

```bash
MISTRAL_API_KEY=your_key_here
```

### "Rate limit exceeded"

**Solution:** Wait for the specified time or implement Redis-based rate limiting

### "Invalid Mistral API key"

**Solution:** 
1. Check your API key is correct
2. Verify it's active in Mistral console
3. Ensure no extra spaces in `.env.local`

### Build errors with pages/app conflict

**Solution:** This is a pre-existing issue in the repo, not related to Mistral integration

## Testing

### Manual Testing

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Test API endpoint:**
   ```bash
   curl http://localhost:3000/api/tradia/chat \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello", "userId": "test", "mode": "assistant"}'
   ```

3. **Test in UI:**
   - Navigate to `/chat`
   - Try each mode
   - Send various messages
   - Verify responses are mode-appropriate

### Automated Testing

```typescript
// Example test
describe('Tradia Chat API', () => {
  it('should return a response for valid request', async () => {
    const response = await fetch('/api/tradia/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message',
        userId: 'test-user',
        mode: 'assistant'
      })
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.response).toBeDefined();
    expect(data.mode).toBe('assistant');
  });
});
```

## Future Enhancements

### Planned Features

1. **Streaming Responses** - Real-time token streaming
2. **Voice Integration** - Text-to-speech for responses
3. **Image Analysis** - Chart screenshot analysis with vision models
4. **Multi-language** - Support for multiple languages
5. **Custom Modes** - User-defined AI personalities
6. **Conversation Memory** - Long-term conversation storage
7. **Advanced Analytics** - Track AI usage and effectiveness

### Integrations

- Twitter/X AI integration (already planned)
- Discord bot
- Telegram bot
- Mobile app support
- Email digest of AI insights

## Cost Management

### Mistral Pricing (as of 2024)

- **mistral-small-latest:** ~$0.001 per 1K tokens
- **mistral-large-latest:** ~$0.008 per 1K tokens

### Estimated Costs

For 1000 users with 10 messages/day:
- 10,000 requests/day
- ~500 tokens per request average
- ~5M tokens/day
- **Cost: ~$5-10/day** depending on model mix

### Cost Optimization

1. Use `mistral-small-latest` for most queries
2. Reserve `mistral-large-latest` for analysis mode
3. Implement response caching
4. Set per-user limits based on plan
5. Monitor usage via Mistral dashboard

## Support

For issues or questions:

1. Check this documentation
2. Review `.env.local.example`
3. Check Mistral API status: https://status.mistral.ai/
4. Review Mistral documentation: https://docs.mistral.ai/
5. Contact the development team

## License

This integration is part of the Tradia platform. All rights reserved.
