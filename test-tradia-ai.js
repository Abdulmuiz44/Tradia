// Test the Tradia AI endpoint with model fallback
const apiKey = 'v1Vphvx1drTK9OdsQBv1lsTVr4bsaBrv';

async function testTradiaAI() {
  console.log('Testing Tradia AI endpoint...\n');
  
  const payload = {
    messages: [
      {
        role: 'user',
        content: 'Hello, can you help me analyze my trading performance?'
      }
    ],
    attachedTradeIds: [],
    options: {
      temperature: 0.25,
      max_tokens: 1024
    },
    mode: 'coach'
  };

  try {
    const response = await fetch('http://localhost:3000/api/tradia/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers));

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      console.log('\n=== Streaming Response ===\n');
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        process.stdout.write(chunk);
      }
      
      console.log('\n\n=== Streaming Complete ===');
    } else {
      const text = await response.text();
      console.log('Error Response:', text);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

testTradiaAI();
