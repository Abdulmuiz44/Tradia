# ERNIE Vision Model Integration

## Overview

Tradia now supports advanced image analysis for trading charts and screenshots using Baidu's **ERNIE-4.5-VL-28B-A3B-Thinking** model via Novita's OpenAI-compatible API. This enables users to upload trading chart screenshots and receive detailed AI-powered analysis with reasoning capabilities.

## Features

- **Vision-based Analysis**: Upload trading charts, screenshots, or trade history images
- **Chain-of-Thought Reasoning**: ERNIE uses `enable_thinking: true` to perform deep reasoning (logged but not shown to users)
- **Automatic Fallback**: If ERNIE is unavailable or fails, the system falls back to the existing AI service
- **Multiple Image Support**: Analyze single or multiple images in one request
- **Trading Context**: System prompts are optimized for trading and chart analysis

## Configuration

### Environment Variables

Add these to your `.env.local` or environment configuration:

```bash
# Required: Your Novita API key
ERNIE_API_KEY=your_novita_api_key_here

# Optional: API base URL (defaults to Novita's OpenAI endpoint)
ERNIE_API_BASE_URL=https://api.novita.ai/openai
```

### Getting an API Key

1. Sign up at [Novita.ai](https://novita.ai)
2. Navigate to API Keys section
3. Generate a new API key
4. Add it to your environment variables

## Usage

### API Request Format

The chat API (`/api/ai/chat`) now accepts image data in the attachments array:

```typescript
POST /api/ai/chat

{
  "message": "Analyze this trading chart",
  "attachments": [
    {
      "name": "chart.png",
      "type": "image/png",
      "size": 123456,
      "data": "base64_encoded_image_data_or_url"
    }
  ]
}
```

### Frontend Integration

To upload images from the frontend:

```typescript
// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Send to API
const sendMessageWithImage = async (message: string, imageFile: File) => {
  const imageData = await fileToBase64(imageFile);
  
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      attachments: [{
        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size,
        data: imageData
      }]
    })
  });
  
  const result = await response.json();
  return result.response; // Only contains final answer, not reasoning
};
```

## How It Works

### Request Flow

1. User uploads an image (trading chart screenshot) with a question
2. Backend receives the request at `/api/ai/chat`
3. System checks if ERNIE is configured (`ERNIE_API_KEY` present)
4. If configured and images present:
   - Calls ERNIE service with `enable_thinking: true`
   - ERNIE analyzes the image with chain-of-thought reasoning
   - Returns both `reasoning_content` (logged) and `content` (final answer)
   - Only the final answer is sent to the frontend
5. If ERNIE fails or not configured:
   - Falls back to existing AI service
   - Uses mock analysis for image placeholders

### Response Structure

#### ERNIE API Response (Internal)
```typescript
{
  "choices": [{
    "message": {
      "content": "The chart shows a bullish trend...",  // Sent to frontend
      "reasoning_content": "First, I identify the trend lines... Then, I analyze support levels..."  // Logged only
    }
  }],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 75,
    "total_tokens": 225
  }
}
```

#### Frontend Response
```typescript
{
  "response": "The chart shows a bullish trend...",  // Only final answer
  "analysis": null,  // Legacy field
  "timestamp": "2025-11-15T11:30:00.000Z"
}
```

## Code Architecture

### Service Layer (`src/lib/ai/ernieService.ts`)

- **`ErnieService`**: Main class for ERNIE API interactions
- **`analyzeImage()`**: Single image analysis
- **`analyzeMultipleImages()`**: Batch image analysis
- **`getErnieService()`**: Singleton instance getter
- **`shouldUseErnie()`**: Helper to check if ERNIE should be used

### API Route (`app/api/ai/chat/route.ts`)

Updated to:
1. Detect image attachments with data
2. Call ERNIE service when images present
3. Fall back to existing AI on errors
4. Return only final answer to frontend

### Type Definitions

```typescript
interface ErnieRequest {
  model: string;
  messages: ChatMessage[];
  enable_thinking: boolean;  // Always true for reasoning
  temperature?: number;
  max_tokens?: number;
}

interface ErnieResult {
  content: string;           // Final answer (sent to frontend)
  reasoning?: string;        // Chain-of-thought (logged only)
  model: string;
  usage?: { ... };
}
```

## Testing

### Unit Tests

Run the ERNIE service tests:

```bash
npm test -- src/lib/ai/__tests__/ernieService.test.ts
```

Tests cover:
- Service initialization and configuration
- Single and multiple image analysis
- Error handling and fallback logic
- API request/response parsing
- Edge cases (missing config, invalid responses, etc.)

### Manual Testing

1. Configure ERNIE API key
2. Start the dev server: `npm run dev`
3. Navigate to chat interface
4. Upload a trading chart screenshot
5. Ask a question about the chart
6. Verify response contains analysis from ERNIE

## Example Prompts

Good prompts for trading chart analysis:

- "What trading pattern do you see in this chart?"
- "Analyze the support and resistance levels"
- "Is this a good entry point? Why or why not?"
- "Compare these two charts and identify differences"
- "What risk management issues do you see?"

## Error Handling

The system has multiple layers of fallback:

1. **ERNIE API Error**: Falls back to existing AI service
2. **AI Service Error**: Returns informative message with trade count
3. **Complete Failure**: Returns graceful error message (no hard errors shown to users)

All errors are logged for debugging:

```typescript
console.error('[AI Chat] ERNIE analysis failed, falling back to regular AI:', error);
```

## Performance Considerations

- **Timeouts**: 60s for single image, 90s for multiple images
- **Token Limits**: Default max_tokens: 2000
- **Image Quality**: Uses `detail: 'high'` for trading charts
- **Caching**: ERNIE service uses singleton pattern

## Model Information

- **Model**: `baidu/ernie-4.5-vl-28b-a3b`
- **Provider**: Novita AI (OpenAI-compatible endpoint)
- **Capabilities**: 
  - Vision understanding
  - Chain-of-thought reasoning
  - Multi-image analysis
  - High-detail image processing

## Security Notes

- API keys are stored in environment variables (never committed to git)
- Image data is base64 encoded for transmission
- ERNIE reasoning content is logged server-side only
- No image data is persisted without explicit user action

## Troubleshooting

### "ERNIE service is not configured"

**Solution**: Add `ERNIE_API_KEY` to your environment variables

### Images not being analyzed

**Solution**: Ensure the `data` field is populated in attachments with base64 encoded image

### Falling back to regular AI

**Cause**: ERNIE API error or not configured  
**Solution**: Check logs for specific error, verify API key is valid

### Timeout errors

**Cause**: Large images or multiple images taking too long  
**Solution**: Reduce image size or quality before upload

## Dependencies

The ERNIE integration requires:

```json
{
  "axios": "^1.11.0"  // HTTP client for API calls
}
```

Already included in the project dependencies.

## Future Enhancements

Potential improvements:

- [ ] Stream responses for real-time feedback
- [ ] Image preprocessing and optimization
- [ ] Caching frequently analyzed charts
- [ ] User-specific model fine-tuning
- [ ] Multi-modal analysis (text + image + trade data)
- [ ] Advanced reasoning visualization for premium users

## Support

For issues or questions:
1. Check logs for error messages
2. Verify environment configuration
3. Test with Novita API directly
4. Open an issue on GitHub

---

**Last Updated**: November 2025  
**Version**: 1.0.0
