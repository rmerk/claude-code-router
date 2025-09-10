#!/usr/bin/env node

/**
 * Test script for cost-based routing logic
 */

import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routerPath = path.join(os.homedir(), '.claude-code-router', 'custom-router.js');
const router = await import(routerPath);

// Test cases for different scenarios (updated for cost-optimized routing)
const testCases = [
  {
    name: "Simple greeting",
    message: "Hello, how are you?",
    expected: "ollama,qwen2.5-coder:latest", // Cost-optimized: local model preferred
    note: "Cost optimization selects Ollama over more expensive options"
  },
  {
    name: "Coding task",
    message: "Write a Python function to reverse a string using recursion",
    expected: "ollama,llama3.2:latest", // Cost-optimized: local model preferred
    note: "Cost optimization prioritizes free local models"
  },
  {
    name: "Complex reasoning",
    message: "Explain the differences between supervised and unsupervised machine learning algorithms",
    expected: "deepseek,deepseek-reasoner", // Cost-effective reasoning model
    note: "Cost optimization finds best balance of cost vs capability"
  },
  {
    name: "Creative writing",
    message: "Write a short story about a robot learning to paint",
    expected: "anthropic,claude-3-5-sonnet-20241022", // Strong creative signals override cost
    note: "High category dominance takes precedence over cost optimization"
  },
  {
    name: "Technical analysis",
    message: "Analyze the performance implications of using microservices architecture",
    expected: "deepseek,deepseek-reasoner", // Cost-optimized choice over GPT-4-turbo
    note: "Cost optimization selects more efficient model"
  },
  {
    name: "Scientific question",
    message: "What is the mathematical proof for Pythagoras theorem?",
    expected: "deepseek,deepseek-reasoner", // Strong scientific signals
    note: "Category-specific routing takes precedence"
  }
];

async function runTests() {
  console.log("🧪 Testing Cost-Based Routing Logic\n");

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`💬 Message: "${testCase.message}"`);
    console.log(`🎯 Expected: ${testCase.expected}`);

    try {
      // Create mock request
      const mockReq = {
        body: {
          messages: [{ role: "user", content: testCase.message }]
        }
      };

      // Call router
      const result = await router(mockReq, {});
      console.log(`🤖 Routed to: ${result || 'default routing'}`);

      // Check if result matches expectation
      const success = result === testCase.expected;
      console.log(`${success ? '✅' : '❌'} ${success ? 'PASS' : 'FAIL'}`);

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }

  console.log("\n🏁 Testing complete!");
}

// Test different budget levels
async function testBudgetLevels() {
  console.log("\n💰 Testing Budget Level Impact\n");

  const testMessage = "Explain quantum computing in simple terms";
  const budgetLevels = ['low', 'medium', 'high'];

  // Cost thresholds (same as in router)
  const thresholds = { low: 5, medium: 20, high: 100 };

  for (const budget of budgetLevels) {
    console.log(`\n📊 Budget Level: ${budget.toUpperCase()} ($${thresholds[budget]}/month)`);

    // Set environment variable
    process.env.ROUTER_BUDGET_LEVEL = budget;

    const mockReq = {
      body: {
        messages: [{ role: "user", content: testMessage }]
      }
    };

    try {
      const result = await router(mockReq, {});
      console.log(`🎯 Selected: ${result || 'default'}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  delete process.env.ROUTER_BUDGET_LEVEL;
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(() => {
    return testBudgetLevels();
  }).then(() => {
    console.log("\n✨ All tests completed!");
  }).catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Test failed:', errorMessage);
  });
}

export { runTests, testBudgetLevels };
