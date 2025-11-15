# Testing Guide: Emotion-Based Trading Psychology Coach

This guide covers how to test and validate the emotion-based trading psychology coach implementation.

## 🧪 Manual Testing Checklist

### Prerequisites
1. Set up environment variables in `.env.local`:
   ```bash
   XAI_API_KEY=your_xai_api_key_here
   # Optional for enhanced sentiment:
   HUGGINGFACE_API_KEY=your_hf_token_here
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Navigate to: `http://localhost:3000/chat`

### Test Cases

#### 1. **Revenge Trading Detection** 🔴
**Test Input:**
```
I need to make back what I lost today. Going all-in on this next trade to get even.
```

**Expected Results:**
- Primary emotion: `revenge`
- Tilt level: High (≥ 1.2)
- Color: Red (`bg-red-500`)
- Coaching hint: "⚠️ Revenge trading detected"
- Response includes: Acknowledgment → Pattern identification → Reframe → Action

**Example Response:**
```
I hear the urgency. That loss stings and you want to fix it fast. [ACKNOWLEDGE]

This is classic revenge trading. Your brain is in loss-recovery mode. [PATTERN]

Markets don't care about your account balance. One trade won't fix this. [REFRAME]

Close your platform. Walk away for 30 minutes. Right now. [MICRO-ACTION]

Next time you feel "I need to make it back," that's your STOP signal. [TRIGGER LOCK]
```

#### 2. **FOMO Detection** 🟠
**Test Input:**
```
Everyone is making money on this coin. I can't miss out, it's now or never!
```

**Expected Results:**
- Primary emotion: `fomo`
- Tilt level: Medium (0.8-1.2)
- Color: Orange (`bg-orange-500`)
- Coaching hint: "🏃 FOMO detected"

#### 3. **Fear Detection** 🟡
**Test Input:**
```
I'm scared to enter this trade. What if it's a stop hunt? I'm freaking out.
```

**Expected Results:**
- Primary emotion: `fear`
- Tilt level: Medium (0.8-1.2)
- Color: Yellow (`bg-yellow-500`)
- Coaching hint: "😰 Fear response"

#### 4. **Calm/Disciplined State** 🟢
**Test Input:**
```
Following my trading plan patiently. Waiting for the setup to form. Staying disciplined.
```

**Expected Results:**
- Primary emotion: `calm`
- Tilt level: Low (< 0.5)
- Color: Green (`bg-green-500`)
- Coaching hint: "✅ Good emotional state"
- Should increment streak counter

#### 5. **High Tilt / Tilt Alert** 🚨
**Test Input:**
```
I'm so pissed off! This market is rigged. I need to make it all back right now. F*** this!
```

**Expected Results:**
- Multiple emotions detected: `anger` + `revenge`
- Tilt level: Very High (≥ 1.4)
- **Tilt Alert Modal Appears:**
  - Full-screen red overlay
  - "PAUSE" heading
  - 4-7-8 breathing instructions
  - "I'm Ready to Continue" button
- User MUST acknowledge before proceeding

#### 6. **Neutral State** ⚪
**Test Input:**
```
The price is at 1234.56 with volume at 500k.
```

**Expected Results:**
- Primary emotion: `neutral`
- Tilt level: Very Low (< 0.2)
- Color: Gray (`bg-gray-400`)
- No special alerts

### UI Component Tests

#### **Emotion Pulse Bar**
1. Send messages with different emotions
2. Verify pulse bar changes color appropriately
3. Check opacity increases with tilt level
4. Confirm smooth transitions

#### **Streak Counter**
1. Send 3+ consecutive calm messages (e.g., "Following my plan")
2. Verify green badge appears: "🔥 3 Calm Messages"
3. Send an angry message
4. Verify streak resets to 0

#### **Message History**
1. Send several messages
2. Refresh the page
3. Verify history loads from localStorage
4. Click "Clear" button
5. Verify history is cleared

#### **Streaming Response**
1. Send a message
2. Verify response appears word-by-word (streaming)
3. Check for loading dots while waiting
4. Verify no UI freezing during stream

### API Endpoint Tests

#### **POST /api/chat**

**Test 1: Valid Request**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need to make back my losses",
    "history": []
  }'
```

**Expected:**
- Status: 200
- Content-Type: `text/event-stream`
- SSE events:
  ```
  data: {"type":"emotion","data":{...}}
  data: {"type":"delta","content":"..."}
  data: {"type":"done","content":"..."}
  ```

**Test 2: Missing Message**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
- Status: 400
- Error: "Message is required"

**Test 3: Unauthenticated**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

**Expected:**
- Status: 401
- Error: "Authentication required"

### Emotion Detection Unit Tests

You can test emotion patterns in the browser console at `/chat`:

```javascript
// Access emotion classifier (if exported to window for debugging)
const { detectTraderEmotion } = await import('/src/lib/emotionClassifier');

// Test various inputs
const tests = [
  "I need to make it back",
  "I'm missing out!",
  "I'm scared",
  "Following my plan"
];

tests.forEach(text => {
  const result = detectTraderEmotion(text);
  console.log(text, '→', result.primary, result.tiltLevel);
});
```

### Rate Limiting Test

1. Send 20+ messages rapidly (within 60 seconds)
2. Verify rate limit message appears: "Coach is thinking… (high demand)"
3. Wait 60 seconds
4. Verify messages work again

### Error Handling Tests

#### **Invalid API Key**
1. Set `XAI_API_KEY=invalid_key` in `.env.local`
2. Restart server
3. Send a message
4. Verify error message: "AI service is misconfigured"

#### **Network Failure**
1. Disconnect internet
2. Send a message
3. Verify error message appears
4. Reconnect internet
5. Try again - should work

### Performance Tests

1. **Long Message:**
   - Send a 500+ word message
   - Verify: Processes without timeout
   - Response time: < 10 seconds

2. **Rapid Messages:**
   - Send 10 messages quickly
   - Verify: All queue properly
   - No UI blocking

3. **Large History:**
   - Build up 50+ message history
   - Verify: Only last 10 sent to API
   - LocalStorage doesn't overflow

## 🔍 Debugging Tips

### Check Emotion Detection
```javascript
// In browser console at /chat
localStorage.setItem('debug_emotions', 'true');
// Reload page
// Now emotion detection logs appear in console
```

### View SSE Stream
```javascript
// In browser Network tab
// Filter by: event-stream
// Click on /api/chat request
// View "EventStream" tab for real-time events
```

### Inspect Tilt Calculation
```javascript
// Add to emotionClassifier.ts temporarily:
console.log('Emotion scores:', emotionScores);
console.log('Calculated tilt:', tiltLevel);
```

## 📊 Validation Criteria

### ✅ Success Criteria
- [ ] All 6 emotion types detected correctly
- [ ] Tilt alert triggers at ≥ 1.4
- [ ] Streak counter increments for calm messages
- [ ] Responses follow 5-step framework
- [ ] Streaming works without freezing
- [ ] LocalStorage persistence works
- [ ] Rate limiting prevents abuse
- [ ] Error messages are user-friendly

### ⚠️ Common Issues

**Issue:** Emotion always shows as "neutral"
- **Fix:** Check pattern matching in `emotionClassifier.ts`
- Verify input text contains trigger words

**Issue:** Tilt alert doesn't trigger
- **Fix:** Check tilt threshold (should be ≥ 1.4)
- Test with high-emotion messages (anger + revenge)

**Issue:** Streaming response freezes
- **Fix:** Check browser console for errors
- Verify SSE connection in Network tab
- Check xAI API status

**Issue:** Rate limit too aggressive
- **Fix:** Adjust `LIMIT` in `app/api/chat/route.ts`
- Default: 20 req/min per user

## 🚀 Production Testing

Before deploying:

1. **Load Test:**
   - Simulate 50 concurrent users
   - Verify: No crashes, reasonable response times

2. **API Cost Test:**
   - Track API calls to xAI
   - Estimate monthly cost based on usage

3. **Security Test:**
   - Verify: No API keys exposed in client
   - Check: Rate limiting works
   - Confirm: User data isolation

4. **Mobile Test:**
   - Test on iOS Safari
   - Test on Android Chrome
   - Verify: UI responsive, touch works

## 📝 Test Report Template

```
## Test Session Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Dev/Staging/Prod]

### Emotion Detection Tests
- [ ] Revenge trading detected
- [ ] FOMO detected
- [ ] Fear detected
- [ ] Calm detected
- [ ] High tilt triggers alert

### UI Tests
- [ ] Pulse bar updates correctly
- [ ] Streak counter works
- [ ] Tilt alert modal appears
- [ ] History persists

### API Tests
- [ ] Streaming response works
- [ ] Error handling works
- [ ] Rate limiting works

### Issues Found:
1. [Issue description]
2. [Issue description]

### Recommendations:
1. [Recommendation]
2. [Recommendation]
```

---

**Happy Testing! 🧪**

For issues or questions, refer to [EMOTION_COACH_README.md](EMOTION_COACH_README.md)
