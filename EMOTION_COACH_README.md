# Emotion-Based Trading Psychology Coach

A full-featured emotion detection and coaching system for traders, powered by **xAI Grok API** and battle-tested psychology frameworks.

## 🎯 Overview

The Emotion Coach provides real-time psychological support to traders by:
- Detecting emotional states (revenge trading, FOMO, fear, anger, etc.)
- Providing immediate, actionable coaching
- Monitoring tilt levels and triggering interventions
- Tracking emotional streaks and progress

## 🧠 Features

### 1. **Real-Time Emotion Detection**
- **Pattern Matching**: Regex-based detection for trading-specific emotions
  - Revenge trading: "make it back", "get even", "chase losses"
  - FOMO: "missing out", "now or never", "can't miss"
  - Fear: "scared", "stop hunt", "panic"
  - Doubt: "what if", "should I have", "fakeout"
  - Anger: "rigged", "scam", "hate this"
  - Regret: "should've", "if only", "mistake"
  
- **Sentiment Enhancement**: Optional HuggingFace API integration for general sentiment

### 2. **Emotion Pulse Bar**
Visual indicator at the top of chat showing:
- Current emotional state (color-coded)
- Tilt level intensity (opacity variation)
- Real-time coaching hints

Color meanings:
- 🟢 **Green**: Calm, disciplined state
- 🔵 **Blue**: Doubt, uncertainty
- 🟡 **Yellow**: Fear, anxiety
- 🟠 **Orange**: FOMO, elevated emotions
- 🔴 **Red**: Revenge trading, anger, high tilt

### 3. **Tilt Alert System**
When tilt level ≥ 1.4 (high emotion + destructive patterns):
- **Modal Intervention**: Full-screen pause alert
- **4-7-8 Breathing**: Guided breathing technique
  - Breathe in for 4 seconds
  - Hold for 7 seconds
  - Exhale for 8 seconds
  - Repeat 3 times
- Must acknowledge before continuing

### 4. **Streak Counter**
- Tracks consecutive low-tilt messages (< 0.8)
- Shows badge at 3+ calm messages
- Positive reinforcement for emotional discipline

### 5. **5-Step Coaching Framework**

Every response follows this battle-tested structure:

1. **ACKNOWLEDGE**: Mirror the trader's emotional state without judgment
2. **PATTERN**: Identify the behavior pattern (revenge trading, FOMO, etc.)
3. **REFRAME**: Challenge distorted thinking with reality
4. **MICRO-ACTION**: One specific action to do RIGHT NOW
5. **TRIGGER LOCK**: Mental anchor for next time this emotion arises

Example:
```
User: "I need to make back what I lost today. Going all-in on this next trade."

Coach:
1. ACKNOWLEDGE: "I hear the urgency. That loss stings and you want to fix it fast."
2. PATTERN: "This is classic revenge trading. Your brain is in loss-recovery mode."
3. REFRAME: "Markets don't care about your account balance. One trade won't fix this."
4. MICRO-ACTION: "Close your platform. Walk away for 30 minutes. Right now."
5. TRIGGER LOCK: "Next time you feel 'I need to make it back,' that's your STOP signal."
```

## 🔧 Technical Architecture

### Components

#### `lib/grokClient.ts`
- Handles streaming communication with xAI Grok API
- SSE (Server-Sent Events) parsing
- Error handling and retries

#### `lib/emotionClassifier.ts`
- Regex pattern matching for trader-specific emotions
- Tilt level calculation (0-2 scale)
- Optional HuggingFace sentiment enhancement
- Emotion-to-color mapping

#### `app/api/chat/route.ts`
- POST endpoint for chat messages
- User authentication via NextAuth
- Loads user trading stats from Supabase
- Emotion detection on user input
- Dynamic system prompt building
- Response streaming with emotion data
- Conversation persistence with emotion tags
- Rate limiting (20 req/min per user)

#### `src/components/ai/EmotionCoachChat.tsx`
- Full chat UI with emotion visualization
- Emotion pulse bar
- Tilt alert modal
- Streak counter
- LocalStorage persistence
- Streaming response handling

### Data Flow

```
User Input → Emotion Detection → Stats Lookup → Grok API → Stream Response
     ↓              ↓                  ↓              ↓            ↓
 UI Update    Pulse Color      System Prompt    SSE Parse    Display + Save
```

### API Response Format

SSE stream events:
```javascript
// Emotion data
data: {"type":"emotion","data":{"primary":"fear","score":0.8,"tiltLevel":1.2,"triggers":["scared"]}}

// Content delta
data: {"type":"delta","content":"I hear"}

// Completion
data: {"type":"done","content":"Full response text"}

// Rate limit
data: {"type":"queued","message":"Coach is thinking… (high demand)"}

// Error
data: {"type":"error","error":"Error message"}
```

## 🚀 Setup

### 1. Environment Variables

Create `.env.local`:
```bash
# Required: xAI Grok API
XAI_API_KEY=your_xai_api_key_here

# Optional: Enhanced sentiment analysis
HUGGINGFACE_API_KEY=your_huggingface_key_here
```

### 2. Get xAI API Key

1. Visit [x.ai](https://x.ai)
2. Sign up for API access
3. Generate API key
4. Add to `.env.local`

### 3. Database Schema (Optional)

For persistence, add these tables:

```sql
-- Chat history with emotion tracking
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  emotion_primary TEXT,
  emotion_score FLOAT,
  tilt_level FLOAT,
  emotion_triggers TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW()
);
```

### 4. Run the App

```bash
npm run dev
```

Navigate to: `http://localhost:3000/chat`

## 📊 Emotion Detection Algorithm

### Tilt Level Calculation

```
tiltLevel = Σ (matchCount × emotionWeight × tiltContribution)
```

Where:
- `matchCount`: Number of pattern matches
- `emotionWeight`: Emotion-specific multiplier (1.0-1.6)
- `tiltContribution`: Tilt impact (-0.5 to 0.9)

Scale:
- **0.0 - 0.8**: Calm (green)
- **0.8 - 1.4**: Elevated (yellow/orange)
- **1.4 - 2.0**: Tilt (red, intervention triggered)

### Pattern Examples

**Revenge Trading** (weight: 1.5, tilt: 0.8):
- "make it back"
- "get even"
- "chase losses"
- "double down"

**FOMO** (weight: 1.4, tilt: 0.7):
- "missing out"
- "now or never"
- "everyone else is"

**Fear** (weight: 1.3, tilt: 0.6):
- "scared"
- "stop hunt"
- "panic"

**Calm** (weight: 1.0, tilt: -0.5):
- "patient"
- "following plan"
- "disciplined"

## 🎨 UI Components

### Emotion Pulse Bar
```tsx
<div 
  className={`h-2 ${emotionColor} transition-all duration-300`}
  style={{ opacity: 0.7 + emotion.tiltLevel * 0.15 }}
/>
```

### Tilt Alert Modal
- Triggered at tiltLevel ≥ 1.4
- Full-screen red overlay
- 4-7-8 breathing instructions
- "I'm Ready to Continue" button

### Streak Counter
- Shows at 3+ consecutive low-tilt messages
- Green badge with fire emoji
- Positive reinforcement

## 🔒 Security & Privacy

- **No data sharing**: All conversations stay in your database
- **Ephemeral context**: Grok API doesn't persist data
- **Rate limiting**: Prevents abuse (20 req/min)
- **User isolation**: Each user's data is separate
- **Encryption**: Uses HTTPS for all API calls

## 📈 Future Enhancements

- [ ] Voice input for emotion detection
- [ ] Historical emotion analytics
- [ ] Custom pattern training
- [ ] Integration with trading platform events
- [ ] Multi-language support
- [ ] Emotion journaling export

## 🐛 Troubleshooting

### Grok API Issues

**Rate Limited**:
- Shows "Coach is thinking… (high demand)"
- Automatic retry after delay
- Check rate limits in xAI dashboard

**API Key Invalid**:
- Error: "XAI_API_KEY not configured"
- Verify `.env.local` file exists
- Check key format in xAI dashboard

### Emotion Not Detected

- Emotion shows as "neutral"
- Try more specific trading language
- Use phrases from pattern list
- Check console for detection logs

### Stream Errors

- Check browser console
- Verify API endpoint is running
- Check network tab for SSE connection
- Ensure no CORS issues

## 💡 Best Practices

### For Users

1. **Be honest**: Describe your actual emotional state
2. **Use specific language**: "I'm scared" > "I'm uncertain"
3. **Follow micro-actions**: Do them immediately
4. **Track patterns**: Notice recurring emotions
5. **Respect tilt alerts**: Take the breathing break

### For Developers

1. **Test emotion patterns**: Add new patterns carefully
2. **Monitor tilt thresholds**: Adjust if too sensitive
3. **Rate limit appropriately**: Balance UX and costs
4. **Log emotion data**: Analyze for improvements
5. **Keep prompts updated**: Refine coaching framework

## 📝 License

Part of Tradia - See main LICENSE file

## 🤝 Contributing

Contributions welcome! Areas to improve:
- More emotion patterns
- Better tilt algorithms
- UI/UX enhancements
- Performance optimizations
- Documentation improvements

---

**Built with**: Next.js, TypeScript, xAI Grok, Tailwind CSS
**Inspired by**: Trading psychology research and battle-tested mentor experience
