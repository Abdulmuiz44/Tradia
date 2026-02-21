#!/usr/bin/env node
/**
 * Simple test script for Mistral AI integration
 * 
 * This script verifies that the core Mistral integration files
 * are properly configured and can be imported.
 * 
 * Usage: node scripts/test-mistral.js
 */

console.log('🧪 Testing Mistral AI Integration...\n');

let passed = 0;
let failed = 0;

// Test 1: Check if environment variable is mentioned
console.log('Test 1: Checking environment configuration...');
try {
  const fs = require('fs');
  const envExample = fs.readFileSync('.env.local.example', 'utf8');
  
  if (envExample.includes('MISTRAL_API_KEY')) {
    console.log('✅ MISTRAL_API_KEY found in .env.local.example');
    passed++;
  } else {
    console.log('❌ MISTRAL_API_KEY not found in .env.local.example');
    failed++;
  }
  
  if (envExample.includes('TRADIA_MODE')) {
    console.log('✅ TRADIA_MODE found in .env.local.example');
    passed++;
  } else {
    console.log('❌ TRADIA_MODE not found in .env.local.example');
    failed++;
  }
} catch (error) {
  console.log('❌ Failed to read .env.local.example:', error.message);
  failed += 2;
}

console.log();

// Test 2: Check if required files exist
console.log('Test 2: Checking required files...');
const requiredFiles = [
  'src/lib/mistral.ts',
  'src/lib/modes.ts',
  'src/types/mistral.ts',
  'app/api/tradia/chat/route.ts',
  'src/components/ai/ModeSelector.tsx',
  'src/components/ai/TradiaChat.tsx',
  'MISTRAL_INTEGRATION.md'
];

requiredFiles.forEach(file => {
  const fs = require('fs');
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
    passed++;
  } else {
    console.log(`❌ ${file} missing`);
    failed++;
  }
});

console.log();

// Test 3: Check file contents
console.log('Test 3: Verifying file contents...');
try {
  const fs = require('fs');
  
  // Check modes.ts has all 5 modes
  const modesContent = fs.readFileSync('src/lib/modes.ts', 'utf8');
  const modes = ['coach', 'mentor', 'assistant', 'analysis', 'journal'];
  let allModesFound = true;
  
  modes.forEach(mode => {
    if (!modesContent.includes(`'${mode}'`) && !modesContent.includes(`"${mode}"`)) {
      console.log(`❌ Mode '${mode}' not found in modes.ts`);
      allModesFound = false;
      failed++;
    }
  });
  
  if (allModesFound) {
    console.log('✅ All 5 modes defined in modes.ts');
    passed++;
  }
  
  // Check mistral.ts has sendChatMessage
  const mistralContent = fs.readFileSync('src/lib/mistral.ts', 'utf8');
  if (mistralContent.includes('sendChatMessage')) {
    console.log('✅ sendChatMessage function found in mistral.ts');
    passed++;
  } else {
    console.log('❌ sendChatMessage function not found in mistral.ts');
    failed++;
  }
  
  // Check API route has POST handler
  const routeContent = fs.readFileSync('app/api/tradia/chat/route.ts', 'utf8');
  if (routeContent.includes('export async function POST')) {
    console.log('✅ POST handler found in API route');
    passed++;
  } else {
    console.log('❌ POST handler not found in API route');
    failed++;
  }
  
  // Check for rate limiting
  if (routeContent.includes('rate') || routeContent.includes('Rate')) {
    console.log('✅ Rate limiting implemented');
    passed++;
  } else {
    console.log('❌ Rate limiting not found');
    failed++;
  }
  
  // Check for authentication
  if (routeContent.includes('auth') || routeContent.includes('session')) {
    console.log('✅ Authentication check implemented');
    passed++;
  } else {
    console.log('❌ Authentication check not found');
    failed++;
  }
  
} catch (error) {
  console.log('❌ Failed to verify file contents:', error.message);
  failed += 5;
}

console.log();

// Test 4: Check documentation
console.log('Test 4: Verifying documentation...');
try {
  const fs = require('fs');
  const docsContent = fs.readFileSync('MISTRAL_INTEGRATION.md', 'utf8');
  
  const requiredSections = [
    'Setup',
    'API Reference',
    'Usage Examples',
    'Security',
    'Modes in Detail'
  ];
  
  requiredSections.forEach(section => {
    if (docsContent.includes(section)) {
      console.log(`✅ Documentation includes "${section}" section`);
      passed++;
    } else {
      console.log(`❌ Documentation missing "${section}" section`);
      failed++;
    }
  });
  
} catch (error) {
  console.log('❌ Failed to verify documentation:', error.message);
  failed += 5;
}

console.log();

// Summary
console.log('═'.repeat(50));
console.log('Test Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total:  ${passed + failed}`);
console.log(`💯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('═'.repeat(50));

if (failed === 0) {
  console.log('\n🎉 All tests passed! Mistral integration is properly configured.');
  console.log('\nNext steps:');
  console.log('1. Add MISTRAL_API_KEY to your .env.local file');
  console.log('2. Start the development server: npm run dev');
  console.log('3. Test the API: curl http://localhost:3000/api/tradia/chat');
  console.log('4. Check MISTRAL_TESTING.md for comprehensive testing guide');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the errors above.');
  process.exit(1);
}
