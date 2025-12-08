import { mistral } from '@ai-sdk/mistral';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                'No messages provided',
                { 
                    status: 400,
                    headers: { 'Content-Type': 'text/plain' }
                }
            );
        }

        // Validate messages format
        const hasValidMessages = messages.every((msg: any) => 
            msg.role && typeof msg.content === 'string'
        );
        
        if (!hasValidMessages) {
            return new Response(
                'Invalid message format',
                { 
                    status: 400,
                    headers: { 'Content-Type': 'text/plain' }
                }
            );
        }

        const result = streamText({
            model: mistral('mistral-large-latest') as any,
            system: `You are Tradia AI, an expert trading coach and mentor. 
Your goal is to help traders improve their psychology, risk management, and strategy.

Guidelines:
- Be professional, encouraging, and direct.
- Focus on risk management is priority #1.
- Explain complex trading concepts simply.
- If the user asks for financial advice, remind them you are an educational AI coach, not a financial advisor.
- Use markdown for clear formatting (bold, lists, etc).`,
            messages: messages as any,
        });

        return (await result).toTextStreamResponse();
    } catch (error) {
        console.error('Chat API Error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = error instanceof Error ? error.stack : '';
        
        console.error('Error details:', errorDetails);
        
        // Return error as plain text stream for useChat to handle
        return new Response(
            `Error: ${errorMessage}`,
            { 
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            }
        );
    }
}
