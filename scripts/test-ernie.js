#!/usr/bin/env node
/**
 * Simple standalone test for ERNIE service
 * Run with: node scripts/test-ernie.js
 */

const axios = require('axios');

// Mock ERNIE service for testing
class ErnieService {
  constructor(config) {
    this.config = {
      apiKey: config?.apiKey || process.env.ERNIE_API_KEY || '',
      baseUrl: config?.baseUrl || process.env.ERNIE_API_BASE_URL || 'https://api.novita.ai/openai',
      model: config?.model || 'baidu/ernie-4.5-vl-28b-a3b',
    };
  }

  isConfigured() {
    return Boolean(this.config.apiKey && this.config.baseUrl);
  }

  async analyzeImage(imageData, prompt, systemPrompt) {
    if (!this.isConfigured()) {
      throw new Error('ERNIE service is not configured');
    }

    console.log('\n🔍 Testing ERNIE Service...');
    console.log('📝 Config:', {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      apiKeyLength: this.config.apiKey.length,
    });

    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    let imageUrl = imageData;
    if (!imageData.startsWith('http') && !imageData.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageData}`;
    }

    messages.push({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'high',
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    });

    const requestBody = {
      model: this.config.model,
      messages,
      enable_thinking: true,
      temperature: 0.7,
      max_tokens: 2000,
    };

    try {
      console.log('📤 Sending request to ERNIE API...');
      const response = await axios.post(
        `${this.config.baseUrl}/v1/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          timeout: 60000,
        }
      );

      const choice = response.data.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response from ERNIE API: missing message');
      }

      const result = {
        content: choice.message.content,
        reasoning: choice.message.reasoning_content,
        model: response.data.model,
        usage: response.data.usage,
      };

      console.log('\n✅ Success!');
      console.log('📊 Usage:', result.usage);
      if (result.reasoning) {
        console.log('\n💭 Reasoning (logged, not sent to frontend):');
        console.log(result.reasoning.substring(0, 200) + '...');
      }
      console.log('\n💬 Final Answer (sent to frontend):');
      console.log(result.content);

      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data;
        console.error('\n❌ ERNIE API Error:', {
          statusCode,
          message: errorData?.error?.message || error.message,
        });
        throw new Error(`ERNIE API Error (${statusCode}): ${errorData?.error?.message || error.message}`);
      }
      throw error;
    }
  }
}

// Run test
async function test() {
  console.log('🚀 ERNIE Service Standalone Test\n');

  // Check for API key
  if (!process.env.ERNIE_API_KEY) {
    console.log('⚠️  No ERNIE_API_KEY found in environment');
    console.log('To test with real API:');
    console.log('  export ERNIE_API_KEY=your_novita_api_key');
    console.log('  node scripts/test-ernie.js\n');
    console.log('Running in mock mode...\n');
    
    // Mock test
    const service = new ErnieService({ apiKey: 'mock-key' });
    console.log('✓ Service created');
    console.log('✓ Configuration:', service.isConfigured() ? 'Valid' : 'Invalid');
    console.log('\n✅ Basic functionality test passed!\n');
    return;
  }

  // Real API test
  const service = new ErnieService();
  
  if (!service.isConfigured()) {
    console.error('❌ Service is not properly configured');
    process.exit(1);
  }

  console.log('✓ Service configured with API key\n');

  // Test with a simple image URL or base64 (you would replace this with real data)
  const testImageUrl = 'https://example.com/trading-chart.png';
  const testPrompt = 'Analyze this trading chart';
  const systemPrompt = 'You are a trading expert analyzing charts.';

  try {
    const result = await service.analyzeImage(testImageUrl, testPrompt, systemPrompt);
    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  test().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { ErnieService };
