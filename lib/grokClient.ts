// lib/grokClient.ts
/**
 * xAI Grok API client for streaming chat completions
 * Uses only xAI Grok - no OpenAI
 */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokStreamOptions {
  messages: Message[];
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Stream response from xAI Grok API
 * Returns a ReadableStream for SSE consumption
 */
export async function streamGrokResponse(
  messages: Message[],
  systemPrompt: string,
  options: Partial<GrokStreamOptions> = {}
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('XAI_API_KEY not configured');
  }

  const model = options.model || 'grok-beta';
  const temperature = options.temperature ?? 0.7;
  const max_tokens = options.max_tokens ?? 1024;

  // Build messages array with system prompt
  const fullMessages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        stream: true,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Grok API');
    }

    // Return the raw stream - caller will handle SSE parsing
    return response.body;
  } catch (error) {
    console.error('Grok API request failed:', error);
    throw error;
  }
}

/**
 * Parse SSE stream from Grok API
 * Transforms raw response into text deltas
 */
export async function* parseGrokStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith(':')) continue;
        
        // Handle [DONE] marker
        if (trimmed === 'data: [DONE]') continue;

        // Parse SSE data
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            
            if (delta) {
              yield delta;
            }
          } catch (e) {
            // Skip malformed JSON
            console.warn('Failed to parse SSE line:', trimmed);
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ') && !trimmed.endsWith('[DONE]')) {
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
