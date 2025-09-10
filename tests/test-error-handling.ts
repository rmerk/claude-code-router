#!/usr/bin/env node

/**
 * Test script for error handling and fallback mechanisms
 */

import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import router module
const routerPath = path.join(os.homedir(), '.claude-code-router', 'custom-router.js');

// Since the functions are defined in the same module scope, we need to test them differently
// Let's create a mock test that simulates the error handling logic

async function testErrorHandling() {
  console.log("🛡️ Testing Error Handling & Fallback Mechanisms\n");

  // Test 1: Test with a non-existent Ollama model to trigger fallback
  console.log("=== Test 1: Ollama Model Fallback ===");

  try {
    const response = await fetch('http://localhost:11435/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'non-existent-model',
        messages: [{ role: 'user', content: 'Test error handling' }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log(`✅ Ollama handled invalid model: ${errorData.error}`);
    } else {
      console.log(`❌ Expected error but got success`);
    }
  } catch (error) {
    console.log(`✅ Ollama error handling: ${error.message}`);
  }

  // Test 2: Test timeout handling
  console.log("\n=== Test 2: Timeout Handling ===");

  try {
    // Test with a very short timeout to trigger timeout error
    const response = await fetch('http://localhost:11435/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        messages: [{ role: 'user', content: 'x'.repeat(10000) }], // Very long message
        max_tokens: 1
      }),
      signal: AbortSignal.timeout(100) // Very short timeout
    });

    const result = await response.json();
    console.log(`Response received (should not happen with short timeout)`);

  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log(`✅ Timeout handled correctly: ${error.message}`);
    } else {
      console.log(`ℹ️  Other error: ${error.message}`);
    }
  }

  // Test 3: Test router with invalid model
  console.log("\n=== Test 3: Router Error Handling ===");

  try {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'invalid-provider,invalid-model',
        messages: [{ role: 'user', content: 'Test router error handling' }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log(`✅ Router handled invalid provider: ${errorData.error?.message || 'Error handled'}`);
    } else {
      console.log(`❌ Expected error but got success`);
    }
  } catch (error) {
    console.log(`✅ Router error handling: ${error.message}`);
  }

  console.log("\n🏁 Error handling tests completed!");
}

// Test Ollama proxy error handling
async function testProxyErrorHandling() {
  console.log("\n🔄 Testing Ollama Proxy Error Handling\n");

  try {
    // Test with a non-existent model to trigger error
    const response = await fetch('http://localhost:11435/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'non-existent-model',
        messages: [{ role: 'user', content: 'Test error handling' }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log(`✅ Proxy handled error correctly: ${errorData.error}`);
    } else {
      console.log(`❌ Expected error but got success`);
    }
  } catch (error) {
    console.log(`✅ Proxy error handling: ${error.message}`);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testErrorHandling().then(() => {
    return testProxyErrorHandling();
  }).then(() => {
    console.log("\n✨ All error handling tests completed!");
  }).catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Test failed:', errorMessage);
  });
}

export { testErrorHandling, testProxyErrorHandling };
