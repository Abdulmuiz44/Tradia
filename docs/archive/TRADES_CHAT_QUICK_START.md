# Trades Chat - Quick Start Guide

## What is it?
AI-powered chat interface in `/dashboard/trades/chat` that analyzes your trades using Mistral AI with your trading data as context.

## How to Use

### 1. Navigate to Chat
```
URL: /dashboard/trades/chat
```
You'll see:
- Your trades displayed in a list
- Welcome message from Tradia AI Coach
- Quick suggestion buttons
- Input field for questions

### 2. Ask Questions About Your Trading
Examples:
- "What patterns do you see in my losses?"
- "Am I risking too much per trade?"
- "Which symbols are most profitable for me?"
- "Analyze my win rate and suggest improvements"

### 3. (Optional) Select Specific Trades
- Click "0 trades attached" button
- Check trades you want AI to analyze
- Ask about those specific trades

### 4. AI Responds With Context
AI will use:
- Your account statistics (win rate, P&L, drawdown)
- Your attached trade details (symbol, outcome, price, notes)
- Mode-specific analysis tone
- Mistral AI for intelligent responses

## AI Modes

Click mode buttons at top to change tone:

| Mode | Use for |
|------|---------|
| **Coach** | Habit building, accountability |
| **Mentor** | Strategic learning, principles |
| **Analysis** | Data breakdown, patterns (default) |
| **Journal** | Emotional reflection, journaling |

## What Data AI Sees

### About Your Account
- Total trades count
- Win rate percentage
- Net profit/loss
- Risk-reward ratio
- Maximum drawdown

### About Selected Trades
- Symbol (e.g., EURUSD)
- Win/Loss outcome
- Profit/loss amount
- Entry and exit times
- Your notes
- Strategy tags

### AI Cannot See
- ✗ Your passwords
- ✗ Account credentials
- ✗ Personal identifying info
- ✗ API keys
- ✗ Data from other users

## Real-Time Features

✅ **Streaming Responses** - See AI answer appear word-by-word
✅ **Quick Suggestions** - One-click analysis prompts
✅ **Message History** - All conversations saved
✅ **Trade Selection** - Filter trades for analysis
✅ **Error Recovery** - Auto-retry on connection issues

## Example Conversation

```
YOU: "Why am I losing on EURUSD trades?"

AI sees:
- Your 47 total trades
- 55% win rate
- $2,400 net P&L
- 1.8 avg risk-reward ratio
- Your EURUSD trades: -$150, -$200, +$250 (attached)

AI responds:
"Looking at your EURUSD trades, I see a pattern:
- You win when you follow your setup criteria (the +$250 trade)
- You lose when you deviate from your plan
- Consider a pre-trade checklist..."
```

## Technical Stack

**Frontend**: Next.js React component with streaming UI
**Backend**: Next.js API route with Mistral AI
**AI Model**: Mistral (pixtral-12b-2409, with fallbacks)
**Database**: Supabase (conversations, messages, trades)

## Tips for Best Results

1. **Be Specific**: "Analyze my last 3 losses" vs "What's wrong?"
2. **Select Relevant Trades**: Use checkboxes for focused analysis
3. **Add Notes**: Your trade notes help AI understand context
4. **Use Different Modes**: Try "Coach" for accountability, "Mentor" for learning
5. **Ask Follow-ups**: Refine AI responses with additional questions
6. **Trust But Verify**: AI can make mistakes—verify important insights

## Troubleshooting

### Chat Won't Load
- Check you're logged in
- Verify you have trades in your account
- Try refreshing page

### No AI Response
- Check internet connection
- Verify Mistral API key is configured
- Try asking a simpler question
- Click retry on error message

### Trades Not Showing
- Ensure trades are imported/created
- Check trade data is complete (dates, amounts)
- Try refreshing trades from sidebar

### Slow Response
- Service might be busy, wait a moment
- Try a shorter question
- Refresh page and retry

## Next Steps

1. Add your first trade in `/dashboard/trades/add`
2. Import bulk trades in `/dashboard/trades/import`
3. Go to `/dashboard/trades/chat`
4. Select a trade and ask for analysis
5. Explore different modes for varied insights

## Data Privacy

- Your trades only processed for this response
- Conversations stored in your database
- No data shared with third parties
- MISTRAL_API_KEY protected in environment
- Each response is independent (not memorized)

## API Endpoint

If integrating programmatically:
```
POST /api/tradia/ai
{
  "messages": [{"role": "user", "content": "..."}],
  "attachedTradeIds": ["uuid-1", "uuid-2"],
  "mode": "analysis",
  "conversationId": "conv_123"
}
```

Response streams as text with X-Conversation-Id header.

---

**Ready?** Go to `/dashboard/trades/chat` and start analyzing your trading! 🚀
