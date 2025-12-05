import { mistral } from '@ai-sdk/mistral';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: mistral('mistral-large-latest'),
        system: `You are Tradia AI, an expert trading coach and mentor. 
    Your goal is to help traders improve their psychology, risk management, and strategy.
    
    Guidelines:
    - Be professional, encouraging, and direct.
    - Focus on risk management is priority #1.
    - Explain complex trading concepts simply.
    - If the user asks for financial advice, remind them you are an educational AI coach, not a financial advisor.
    - Use markdown for clear formatting (bold, lists, etc).`,
        messages,
    });

    return result.toDataStreamResponse();
}
