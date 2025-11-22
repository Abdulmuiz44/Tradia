
export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Note: getServerSession is not supported in Edge runtime directly in the same way. 
        // We might need to use a different auth approach or switch to Node runtime if auth is strict.
        // For now, assuming standard Next.js Edge API route pattern.

        const { messages, attachedTradeIds, options, mode } = await req.json();

        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Mistral API key not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Build system prompt
        const systemPrompt = mode === 'grok'
            ? `You are Mistral, a helpful and maximally truthful AI trading assistant. You have real-time access to market data and can provide sophisticated trading analysis. Be direct, insightful, and focus on actionable trading intelligence.`
            : `You are Tradia Coach, an AI trading mentor focused on helping traders develop sustainable strategies and risk management. Provide encouraging, educational responses.`;

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m: any) => ({ role: m.role, content: m.content }))
        ];

        // Call Mistral API
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'mistral-medium-latest',
                messages: apiMessages,
                max_tokens: options?.max_tokens || 1000,
                temperature: 0.7,
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Mistral API error:', errorText);
            return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create a TransformStream to convert Mistral chunks to Tradia format
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                const text = decoder.decode(chunk);
                const lines = text.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'finish', text: '' })}\n\n`));
                            return;
                        }

                        try {
                            const data = JSON.parse(dataStr);
                            const content = data.choices[0]?.delta?.content;
                            if (content) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text-delta', delta: content })}\n\n`));
                            }
                        } catch (e) {
                            // Ignore parse errors for partial chunks
                        }
                    }
                }
            },
        });

        return new Response(response.body?.pipeThrough(transformStream), {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
