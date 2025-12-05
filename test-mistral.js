const apiKey = 'v1Vphvx1drTK9OdsQBv1lsTVr4bsaBrv';
const systemPrompt = 'You are a helpful trading assistant.';
const userPrompt = 'Hello, can you help me?';

const models = ['mistral-medium-latest', 'mistral-small-latest', 'mistral-tiny'];

async function testModels() {
  for (const model of models) {
    console.log(`\n========== Testing ${model} ==========`);
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      console.log('Status:', response.status);

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ SUCCESS');
        console.log('Response:', data.choices?.[0]?.message?.content?.substring(0, 200));
        break;
      } else {
        console.log('❌ ERROR:', data.message || data);
      }
    } catch (e) {
      console.error('Network error:', e.message);
    }
  }
}

testModels();

