# Tradia AI Quick Guide

## What's New

### Chat Interface (`/dashboard/trades/data`)
- **Multi-turn conversations**: Ask follow-up questions and get context-aware responses
- **Message history**: Scroll through previous messages in the conversation
- **Real-time responses**: Watch AI responses appear as they're generated
- **Clear design**: Simple, clean interface like trade history page

### How to Use

#### Starting an Analysis
1. Go to `/dashboard/trades/data`
2. Choose a quick analysis button:
   - **Performance**: Win rate, P&L, consistency analysis
   - **Risk Check**: Risk-to-reward evaluation
   - **Patterns**: Trading patterns and symbol performance
   - **Action Plan**: Personalized next steps

#### Custom Questions
1. Type your question in the input box
2. Press Ctrl+Enter or click Send button
3. AI responds with analysis based on your trades
4. Ask follow-up questions for deeper insights

#### Features
- **Auto-scroll**: Always see the latest messages
- **Light/Dark mode**: Works in both themes
- **Clear Chat**: Reset conversation with the X button
- **Keyboard shortcut**: Ctrl+Enter to send

### AI Learning & Personalization

The AI learns from your messages:
- Remembers your trading style from previous questions
- References specific trades and patterns you've discussed
- Adapts tone based on your interactions
- Builds context over multiple questions

### Data Used

Each analysis uses:
- **All your trades** from Supabase
- **Account summary**: Win rate, P&L, max drawdown, R:R ratio
- **Recent trades**: Last 10 trades for detailed context
- **Attached trades**: Any specific trades you reference

### Risk Management Page (`/dashboard/risk-management`)

Now powered by:
- ✅ Real Supabase data for current user
- ✅ Automatic refresh on page load
- ✅ Live calculations based on your actual trades
- ✅ All visualizations use authenticated user data

## UI Improvements

### Color Scheme
- **User messages**: Blue bubbles (right side)
- **AI messages**: Gray/white bubbles (left side)
- **Minimalistic**: Clean, focused design
- **Consistent**: Matches trade-history page style

### Responsiveness
- Mobile-friendly
- Touch-optimized buttons
- Readable on all screen sizes
- Proper text sizing

## Tips

1. **Be specific**: "Analyze my EURUSD trades from last week" is better than "Tell me about my trades"
2. **Ask follow-ups**: "Why did I struggle on Thursdays?" follows up on patterns
3. **Reference data**: "My win rate is 58%, can I do better?" gives AI more context
4. **Use modes**: Different conversation types get different AI personalities
5. **Export insights**: Take screenshots or notes of important findings

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No trades yet" message | Add trades first in trade-history page |
| AI response not visible | Check light/dark mode, scroll to see full message |
| Conversation reset | Click X to clear, or it persists across sessions |
| Response taking long | AI is analyzing, be patient (shows "Analyzing...") |

## Database

### Conversations Table
- Stores conversation history in Supabase
- Links to your user ID
- Tracks when you last messaged

### Chat Messages Table
- Each message is stored
- Preserves full conversation context
- Private to your account

## API Endpoint

`POST /api/tradia/ai`

Request:
```json
{
  "conversationId": "conv_xxx",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "mode": "analysis",
  "options": {"temperature": 0.3, "max_tokens": 2000}
}
```

Response: Streamed text via Server-Sent Events

## Files Changed

- `src/components/dashboard/TradiaAIAnalysis.tsx` - Chat interface
- `app/dashboard/risk-management/page.tsx` - Data fetching
- `app/api/tradia/ai/route.ts` - Already supports conversations

## Next Session

Start chatting with Tradia AI and it will remember your trading style!
