# Tradia AI Chat Debugging & Testing Guide

## Current Status

### ✅ Completed Fixes
1. **Removed all OpenAI/XAI dependencies** - Now Mistral-only
2. **Installed ai@3.4.0** - Compatible with `ai/react` for useChat hook
3. **Updated tsconfig.json** - moduleResolution set to "bundler"
4. **Added comprehensive error handling** to `/api/chat` endpoint
5. **Improved error response format** - Using plain text for better streaming compatibility
6. **Added message validation** - Validates array and message format before processing

### 🔍 What We Fixed in Latest Update
- Changed error responses from JSON to plain text to ensure `useChat` hook properly handles errors
- Added detailed message validation
- Added server-side logging for debugging errors
- Improved error stack traces for console debugging

## Environment Verification Checklist

### 1. Check Environment Variables
```bash
# Run this to verify MISTRAL_API_KEY is set
echo $env:MISTRAL_API_KEY
```

**Expected output:** `v1Vphvx1drTK9OdsQBv1lsTVr4bsaBrv` (or similar API key)

### 2. Verify Node Modules
```bash
# Check if ai and @ai-sdk/mistral are installed
pnpm list ai @ai-sdk/mistral
```

**Expected output:**
```
ai 3.4.0
@ai-sdk/mistral 1.0.0 or higher
```

### 3. Check Build
```bash
# Build should complete without errors
pnpm build
```

**Expected:** Build completes successfully with no TypeScript errors

## Testing the Chat API

### Test 1: Direct API Test (cURL/PowerShell)

```powershell
# Test the /api/chat endpoint directly
$body = @{
    messages = @(
        @{
            role = "user"
            content = "Hello, what is risk management in trading?"
        }
    )
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/chat" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

Write-Host $response.Content
```

### Test 2: Dev Server Test

```bash
# Start the development server
pnpm dev -H 127.0.0.1

# In another terminal, navigate to http://localhost:3000/chat
# Click on the chat interface and try sending a message
```

**Expected behavior:**
- Message appears in the chat
- Loading indicator shows "Generating..."
- AI response streams in and displays
- No error message appears

### Test 3: Browser Console Debugging

1. Open Developer Tools (F12)
2. Go to Console tab
3. Watch for any error messages when sending chat messages
4. Check Network tab - POST to `/api/chat` should return 200 with streaming data

## Troubleshooting

### Issue: "An error occurred. Please try again or check your connection."

**Likely causes and solutions:**

#### 1. MISTRAL_API_KEY not set
```bash
# Verify in terminal
echo $env:MISTRAL_API_KEY
```
If empty, add to `.env.local`:
```
MISTRAL_API_KEY=v1Vphvx1drTK9OdsQBv1lsTVr4bsaBrv
```

#### 2. Check server logs
When you run `pnpm dev`, watch the terminal for errors like:
```
Chat API Error: [specific error message]
```

Common errors:
- `MISTRAL_API_KEY not found` - API key missing or not loaded
- `429` - Rate limited (try again later or check quota)
- `401` - Invalid API key
- `Network error` - Mistral API unreachable

#### 3. Check message format
The component expects messages in this format:
```typescript
{
  id: string;
  role: "user" | "assistant";
  content: string;
}
```

#### 4. Verify streaming works
Open Network tab (F12), send a chat message, and check:
- Request: POST to `/api/chat`
- Response: Should see streaming text chunks (status 200)
- Headers: Content-Type should include streaming indication

### Issue: TypeScript errors

```bash
# Verify TypeScript compilation
pnpm build
```

If errors occur, common issues:
- Missing ai/react export (should be fixed with ai@3.4.0)
- Type mismatches in message format
- Missing imports

### Issue: Chat sends but gets no response

1. Check browser console for JavaScript errors
2. Check server terminal for "Chat API Error:" messages
3. Verify MISTRAL_API_KEY is valid by testing directly:

```bash
# Test Mistral API directly
curl -X POST https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "mistral-large-latest", "messages": [{"role": "user", "content": "hi"}]}'
```

## File Structure

### Key Files
- `/app/api/chat/route.ts` - Main chat endpoint with error handling
- `/app/api/tradia/ai/route.ts` - Alternative AI endpoint with conversation persistence
- `/src/components/ai/TradiaAIChat.tsx` - Chat UI component using useChat hook
- `src/components/chat/ChatInterface.tsx` - Alternative chat UI
- `.env.local` - Environment variables (includes MISTRAL_API_KEY)

### API Endpoint Details

#### POST `/api/chat`
- **Input:** `{ messages: Message[] }` where Message has `role` and `content`
- **Output:** Text stream (streaming response)
- **Error Response:** Plain text error message with 500 status
- **Max Duration:** 30 seconds

#### Message Format
```typescript
interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
}
```

## Performance Considerations

1. **Streaming:** Responses stream in real-time, providing better UX
2. **Token Limits:** Mistral models have token limits; very long conversations may hit limits
3. **Rate Limiting:** Mistral API has rate limits - check usage in dashboard
4. **Fallback Models:** If mistral-large-latest fails, fallback to other models (in `/api/tradia/ai`)

## Deployment Checklist

Before deploying to Vercel:

- [ ] MISTRAL_API_KEY added to Vercel environment variables
- [ ] NEXTAUTH_SECRET configured
- [ ] NEXTAUTH_URL set to production URL
- [ ] Supabase environment variables configured
- [ ] All API keys validated and working
- [ ] Build succeeds: `pnpm build`
- [ ] Chat tested locally: `pnpm dev`

### Setting Environment Variables in Vercel

1. Go to Vercel Dashboard
2. Select your Tradia project
3. Go to Settings > Environment Variables
4. Add:
```
MISTRAL_API_KEY=v1Vphvx1drTK9OdsQBv1lsTVr4bsaBrv
NEXTAUTH_SECRET=<from .env.local>
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
DATABASE_URL=<postgresql connection>
SUPABASE_SERVICE_ROLE_KEY=<from .env.local>
```

## Next Steps

1. **Local Testing:** Run `pnpm dev` and test chat functionality
2. **Debug Logs:** Watch server terminal for any "Chat API Error:" messages
3. **API Testing:** Use curl/Postman to test `/api/chat` endpoint directly
4. **Deployment:** Once verified locally, deploy to Vercel with env vars configured

## Useful Commands

```bash
# Start dev server
pnpm dev -H 127.0.0.1

# Build for production
pnpm build

# Run production build locally
pnpm start

# Check TypeScript
pnpm typecheck

# Lint code
pnpm lint

# View environment variables
cat .env.local

# Git status
git status

# View recent commits
git log --oneline -5
```

## Quick Reference

| Component | Status | Location |
|-----------|--------|----------|
| AI SDK | ✅ ai@3.4.0 | package.json |
| Mistral Integration | ✅ @ai-sdk/mistral | package.json |
| Chat Endpoint | ✅ Improved | /app/api/chat/route.ts |
| Chat Component | ✅ forwardRef support | /src/components/ai/TradiaAIChat.tsx |
| Error Handling | ✅ Enhanced | /api/chat endpoint |
| Environment | ✅ Configured | .env.local |
| Build Status | ✅ Passing | Exit code 0 |

## Support

If issues persist:
1. Check the latest commit: `git log --oneline -1`
2. Review error messages in server console
3. Verify all environment variables are set
4. Test Mistral API connectivity separately
5. Check Mistral API dashboard for quota/rate limits

---

**Last Updated:** After commit 7aad2a4
**Build Status:** ✅ Passing
**Chat Error Handling:** ✅ Enhanced with plain text responses
