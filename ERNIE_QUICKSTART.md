# ERNIE Vision Integration - Quick Start

## What's Been Added

This PR adds support for Baidu's ERNIE-4.5-VL-28B-A3B vision model for analyzing trading chart screenshots.

## Files Added/Modified

1. **`src/lib/ai/ernieService.ts`** - Main ERNIE service
2. **`src/lib/ai/__tests__/ernieService.test.ts`** - Unit tests
3. **`app/api/ai/chat/route.ts`** - Updated to use ERNIE for images
4. **`scripts/test-ernie.js`** - Standalone test script
5. **`ERNIE_INTEGRATION_README.md`** - Full documentation
6. **`.env.ernie.example`** - Environment variable template

## Setup

### 1. Get API Key

Sign up at [Novita.ai](https://novita.ai) and get your API key.

### 2. Configure Environment

Add to your `.env.local`:

```bash
ERNIE_API_KEY=your_novita_api_key_here
ERNIE_API_BASE_URL=https://api.novita.ai/openai
```

### 3. Test the Integration

```bash
# Install dependencies (if not already done)
npm install --legacy-peer-deps

# Run standalone test
export ERNIE_API_KEY=your_api_key
node scripts/test-ernie.js

# Run unit tests
npm test -- src/lib/ai/__tests__/ernieService.test.ts
```

## How It Works

When users upload images to the chat:

1. Backend detects image data in attachments
2. Calls ERNIE API with `enable_thinking: true`
3. ERNIE analyzes with chain-of-thought reasoning
4. Backend logs reasoning (for debugging)
5. Frontend receives only the final answer

## API Request Example

```typescript
POST /api/ai/chat
{
  "message": "Analyze this chart",
  "attachments": [{
    "name": "chart.png",
    "type": "image/png",
    "data": "base64_encoded_image_data"
  }]
}
```

## Fallback Behavior

- If ERNIE_API_KEY not configured: Uses existing AI service
- If ERNIE API fails: Falls back to existing AI service
- No hard errors shown to users

## Testing

```bash
# Basic functionality test (without API key)
node scripts/test-ernie.js

# With real API (requires key)
ERNIE_API_KEY=your_key node scripts/test-ernie.js

# Unit tests
npm test -- src/lib/ai/__tests__/ernieService.test.ts
```

## Next Steps

1. Deploy with ERNIE_API_KEY configured
2. Test image upload in production
3. Monitor API usage and costs
4. Adjust timeouts/limits as needed

## Documentation

See `ERNIE_INTEGRATION_README.md` for complete documentation including:
- Frontend integration examples
- API details
- Troubleshooting
- Security notes

## Notes on Build

The project has some pre-existing build errors unrelated to ERNIE integration. The ERNIE service files compile successfully when checked independently:

```bash
# ERNIE service compiles fine
npx tsc --noEmit --skipLibCheck src/lib/ai/ernieService.ts
# ✓ No errors

# Test script runs successfully
node scripts/test-ernie.js
# ✓ Basic functionality test passed
```

The existing build issues need to be resolved separately (missing components, etc.).
