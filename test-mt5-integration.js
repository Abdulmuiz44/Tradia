// test-mt5-integration.js
// Simple test script to verify MT5 integration endpoints

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    console.log(`\n${method} ${endpoint}:`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);

    return { success: response.ok, data };
  } catch (error) {
    console.error(`\n${method} ${endpoint}:`);
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing MT5 Integration Endpoints...\n');

  // Test 1: Get MT5 accounts (should return empty array for unauthenticated user)
  await testEndpoint('/api/mt5/accounts');

  // Test 2: Get trades (should return empty array for unauthenticated user)
  await testEndpoint('/api/trades');

  // Test 3: Try to create MT5 account (should fail without auth)
  await testEndpoint('/api/mt5/accounts', 'POST', {
    server: 'TestServer',
    login: '123456',
    password: 'testpass',
    name: 'Test Account'
  });

  // Test 4: Try to import trades (should fail without auth)
  await testEndpoint('/api/trades/import', 'POST', {
    trades: [{
      symbol: 'EURUSD',
      openTime: new Date().toISOString(),
      closeTime: new Date().toISOString(),
      pnl: 100,
      outcome: 'Win'
    }],
    source: 'test'
  });

  console.log('\n✅ Tests completed!');
  console.log('\n📝 Note: These tests are expected to fail for unauthenticated requests.');
  console.log('   In a real scenario, you would need to authenticate first.');
  console.log('   The "Failed to fetch" error you mentioned is likely due to:');
  console.log('   1. Next.js development server not running');
  console.log('   2. Wrong port (should be 3000)');
  console.log('   3. CORS issues');
  console.log('   4. Network connectivity problems');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };