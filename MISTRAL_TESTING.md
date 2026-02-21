# Mistral Integration Testing Guide

This document provides testing steps for the Mistral AI integration.

## Prerequisites

Before testing, ensure you have:

1. **Mistral API Key**: Get one from https://console.mistral.ai/
2. **Environment setup**: Add to `.env.local`:
   ```
   MISTRAL_API_KEY=your_api_key_here
   NEXTAUTH_SECRET=your_secret_here
   ```

## Manual Testing Steps

### 1. API Endpoint Test

Test the GET endpoint to verify the API is accessible:

```bash
curl http://localhost:3000/api/tradia/chat
```

**Expected Response:**
```json
{
  "service": "Tradia Chat API",
  "version": "1.0.0",
  "modes": ["coach", "mentor", "assistant", "analysis", "journal"],
  "status": "ready",
  "documentation": { ... }
}
```

### 2. Test Each Mode

#### Assistant Mode (Default)
```bash
curl -X POST http://localhost:3000/api/tradia/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my current win rate?",
    "userId": "test-user",
    "mode": "assistant"
  }'
```

#### Coach Mode
```bash
curl -X POST http://localhost:3000/api/tradia/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How can I stay disciplined after losing trades?",
    "userId": "test-user",
    "mode": "coach"
  }'
```

#### Mentor Mode
```bash
curl -X POST http://localhost:3000/api/tradia/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain Smart Money Concepts",
    "userId": "test-user",
    "mode": "mentor"
  }'
```

#### Analysis Mode
```bash
curl -X POST http://localhost:3000/api/tradia/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze the current market structure",
    "userId": "test-user",
    "mode": "analysis"
  }'
```

#### Journal Mode
```bash
curl -X POST http://localhost:3000/api/tradia/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What was I thinking when I entered this trade?",
    "userId": "test-user",
    "mode": "journal"
  }'
```

### 3. Test Rate Limiting

Send 25 requests rapidly to trigger rate limit:

```bash
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/tradia/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Test '$i'", "userId": "test-user"}' &
done
wait
```

**Expected:** After 20 requests, you should see:
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in X seconds."
}
```

### 4. Test Error Handling

#### Missing API Key
Remove `MISTRAL_API_KEY` from `.env.local` and restart server.

**Expected Response:**
```json
{
  "error": "Mistral AI is not configured",
  "message": "The Mistral API key is missing. Please contact the administrator."
}
```

#### Invalid Message
```bash
curl -X POST http://localhost:3000/api/tradia/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "",
    "userId": "test-user"
  }'
```

**Expected Response:**
```json
{
  "error": "Message is required and must be a non-empty string"
}
```

#### Invalid Mode
```bash
curl -X POST http://localhost:3000/api/tradia/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test",
    "userId": "test-user",
    "mode": "invalid-mode"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid mode. Must be one of: coach, mentor, assistant, analysis, journal"
}
```

### 5. Test UI Components

1. **Start Development Server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Chat Page:**
   - Create a test page at `app/test-mistral/page.tsx`:
   ```tsx
   import { TradiaChat } from '@/components/ai/TradiaChat';
   
   export default function TestMistralPage() {
     return (
       <div className="h-screen p-4">
         <TradiaChat userId="test-user" />
       </div>
     );
   }
   ```

3. **Test Each Mode:**
   - Click each mode button
   - Verify the mode changes
   - Send a message in each mode
   - Verify responses match the mode personality

4. **Test Mode Selector:**
   - Verify all 5 modes are displayed
   - Verify icons and colors are correct
   - Verify tooltips show descriptions
   - Verify active mode is highlighted

### 6. Integration Testing

#### With Existing AI Chat
1. Open `app/chat/page.tsx`
2. Test that existing chat still works
3. Consider adding mode selector to existing chat

#### With User Authentication
1. Log in with a real user account
2. Send messages
3. Verify user's trading data is included in context
4. Verify personalized responses

### 7. Performance Testing

Test response times:

```bash
time curl -X POST http://localhost:3000/api/tradia/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my win rate?",
    "userId": "test-user",
    "mode": "assistant"
  }'
```

**Expected:**
- Average: 1-3 seconds
- Max: 5 seconds

### 8. Browser Testing

Test in different browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## Verification Checklist

### Environment & Configuration
- [ ] MISTRAL_API_KEY loads correctly from `.env.local`
- [ ] Warning appears in console when key is missing
- [ ] TRADIA_MODE environment variable works (if set)
- [ ] Vercel environment variables work in deployment

### API Functionality
- [ ] GET /api/tradia/chat returns API info
- [ ] POST /api/tradia/chat accepts valid requests
- [ ] All 5 modes work correctly
- [ ] Rate limiting triggers after 20 requests
- [ ] Authentication is enforced
- [ ] User trading data is fetched
- [ ] Conversation history is supported

### Error Handling
- [ ] Missing API key returns 503 with helpful message
- [ ] Invalid mode returns 400 with error
- [ ] Empty message returns 400
- [ ] Message too long returns 400
- [ ] Rate limit returns 429 with retry time
- [ ] Unauthenticated returns 401
- [ ] Mistral API errors are handled gracefully

### UI Components
- [ ] ModeSelector displays all 5 modes
- [ ] Mode icons and colors are correct
- [ ] Active mode is highlighted
- [ ] Disabled state works
- [ ] Mobile dropdown version works
- [ ] ModeInfo shows correct descriptions
- [ ] TradiaChat component renders
- [ ] Messages display correctly
- [ ] Input field works
- [ ] Send button works
- [ ] Loading state shows
- [ ] Error messages display

### Security
- [ ] API key never exposed to client
- [ ] Server-side only code works
- [ ] Rate limiting protects API
- [ ] Input validation works
- [ ] SQL injection protected
- [ ] CodeQL scan passes

### Performance
- [ ] Response times under 5 seconds
- [ ] UI is responsive
- [ ] No memory leaks
- [ ] Handles multiple concurrent users

### Documentation
- [ ] .env.local.example is complete
- [ ] MISTRAL_INTEGRATION.md is accurate
- [ ] Code comments are helpful
- [ ] README mentions Mistral integration

## Known Issues

### Build Warning
- The project has a pre-existing warning about pages/app directory structure
- This is not related to Mistral integration
- Build may fail but the code is correct
- Issue exists in base branch

### TypeScript Errors
- Running `tsc` directly shows errors due to configuration
- These are resolved when running through Next.js
- Use `npm run type-check` instead (may show unrelated errors)

## Troubleshooting

### "Cannot find module '@/lib/mistral'"
**Solution:** Ensure files are in correct locations:
- `src/lib/mistral.ts`
- `src/lib/modes.ts`
- TypeScript paths configured in `tsconfig.json`

### "Mistral API key is not configured"
**Solution:**
1. Check `.env.local` file exists
2. Verify `MISTRAL_API_KEY` is set
3. Restart development server
4. Check for typos or extra spaces

### "Rate limit exceeded"
**Solution:**
- Wait 60 seconds
- This is expected behavior
- In production, implement Redis-based rate limiting

### Response is generic/not personalized
**Solution:**
- Ensure user is authenticated
- Check that trading data is being fetched
- Verify Supabase connection works
- Check console logs for errors

## Success Criteria

The integration is successful when:

1. ✅ All 5 modes return appropriate responses
2. ✅ Rate limiting works correctly
3. ✅ Error handling is comprehensive
4. ✅ UI components render without errors
5. ✅ Security scan passes (CodeQL)
6. ✅ API key is never exposed to client
7. ✅ Documentation is complete and accurate
8. ✅ Performance is acceptable (< 5s responses)
9. ✅ Integration works with existing features
10. ✅ Code follows project conventions

## Next Steps After Testing

1. **Production Deployment:**
   - Add MISTRAL_API_KEY to Vercel
   - Test in production environment
   - Monitor usage and costs

2. **Feature Enhancements:**
   - Add streaming responses
   - Implement conversation memory
   - Add voice integration
   - Support image analysis

3. **Monitoring:**
   - Set up usage tracking
   - Monitor error rates
   - Track response times
   - Analyze user feedback

4. **Documentation:**
   - Update main README
   - Add API documentation
   - Create video tutorials
   - Write blog post about integration
