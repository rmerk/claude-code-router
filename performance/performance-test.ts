#!/usr/bin/env node

/**
 * Performance Testing Suite for Claude Code Router
 * Measures latency, throughput, and comparative performance across models
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PerformanceTestResults {
  timestamp: string;
  tests: Record<string, any>;
  summary: Record<string, any>;
}

class PerformanceTester {
  private results: PerformanceTestResults;

  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {}
    };
  }

  async runAllTests() {
    console.log("⚡ Running Performance Test Suite\n");

    // Test 1: Latency Comparison
    await this.testLatencyComparison();

    // Test 2: Throughput Testing
    await this.testThroughput();

    // Test 3: Cost Efficiency Analysis
    await this.testCostEfficiency();

    // Test 4: Model Capability Benchmark
    await this.testModelCapabilities();

    // Generate report
    this.generateReport();

    console.log("\n🏁 Performance testing completed!");
    console.log(`📊 Results saved to: performance-results.json`);
  }

  async testLatencyComparison() {
    console.log("=== Latency Comparison Test ===");

    const testPrompts = [
      { name: "Simple", prompt: "Hello, how are you?", tokens: 5 },
      { name: "Medium", prompt: "Explain quantum computing in simple terms", tokens: 35 },
      { name: "Complex", prompt: "Write a comprehensive analysis of microservices architecture patterns and their trade-offs", tokens: 120 }
    ];

    const models = [
      { name: 'ollama,llama3.2:latest', display: 'Ollama Llama 3.2' },
      { name: 'ollama,qwen2.5-coder:latest', display: 'Ollama Qwen 2.5 Coder' },
      { name: 'groq,llama-3.1-70b-versatile', display: 'Groq Llama 3.1 70B' },
      { name: 'deepseek,deepseek-chat', display: 'DeepSeek Chat' }
    ];

    const results = {};

    for (const model of models) {
      results[model.name] = {};

      for (const testPrompt of testPrompts) {
        console.log(`Testing ${model.display} with ${testPrompt.name} prompt...`);

        const latencies = [];
        const tokenCounts = [];

        // Run 3 times for each model/prompt combination
        for (let i = 0; i < 3; i++) {
          try {
            const startTime = Date.now();

            const response = await this.makeRequest(model.name, testPrompt.prompt, 100);
            const endTime = Date.now();

            if (response && response.choices && response.choices[0]) {
              const latency = endTime - startTime;
              const tokens = response.usage?.completion_tokens || 0;

              latencies.push(latency);
              tokenCounts.push(tokens);

              console.log(`  Run ${i + 1}: ${latency}ms, ${tokens} tokens`);
            } else {
              console.log(`  Run ${i + 1}: Failed`);
            }

            // Small delay between requests
            await this.delay(1000);

          } catch (error) {
            console.log(`  Run ${i + 1}: Error - ${error.message}`);
          }
        }

        if (latencies.length > 0) {
          const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
          const avgTokens = tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length;
          const tokensPerSecond = avgTokens / (avgLatency / 1000);

          results[model.name][testPrompt.name] = {
            avgLatency: Math.round(avgLatency),
            avgTokens: Math.round(avgTokens),
            tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
            minLatency: Math.min(...latencies),
            maxLatency: Math.max(...latencies)
          };
        }
      }
    }

    this.results.tests.latencyComparison = results;
  }

  async testThroughput() {
    console.log("\n=== Throughput Test ===");

    const testModel = 'ollama,llama3.2:latest';
    const numRequests = 10;
    const requests = [];

    console.log(`Sending ${numRequests} concurrent requests to ${testModel}...`);

    // Create concurrent requests
    for (let i = 0; i < numRequests; i++) {
      requests.push(
        this.makeRequest(testModel, `Test request ${i + 1}`, 50)
          .then(response => ({ success: true, response }))
          .catch(error => ({ success: false, error: error.message }))
      );
    }

    const startTime = Date.now();
    const results = await Promise.all(requests);
    const endTime = Date.now();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = endTime - startTime;
    const avgTimePerRequest = totalTime / numRequests;
    const requestsPerSecond = (successful / totalTime) * 1000;

    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📊 Avg time per request: ${Math.round(avgTimePerRequest)}ms`);
    console.log(`🚀 Requests per second: ${Math.round(requestsPerSecond * 100) / 100}`);

    this.results.tests.throughput = {
      totalRequests: numRequests,
      successful,
      failed,
      totalTime,
      avgTimePerRequest: Math.round(avgTimePerRequest),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100
    };
  }

  async testCostEfficiency() {
    console.log("\n=== Cost Efficiency Analysis ===");

    const models = [
      { name: 'ollama,llama3.2:latest', cost: 0 },
      { name: 'ollama,qwen2.5-coder:latest', cost: 0 },
      { name: 'groq,llama-3.1-70b-versatile', cost: 0.00059 },
      { name: 'deepseek,deepseek-chat', cost: 0.00014 },
      { name: 'openai,gpt-3.5-turbo', cost: 0.002 }
    ];

    const testPrompt = "Write a Python function to calculate fibonacci numbers recursively";
    const results = {};

    console.log("Testing cost efficiency across models...");

    for (const model of models) {
      try {
        const response = await this.makeRequest(model.name, testPrompt, 100);

        if (response && response.usage) {
          const inputTokens = response.usage.prompt_tokens || 0;
          const outputTokens = response.usage.completion_tokens || 0;
          const totalTokens = response.usage.total_tokens || 0;

          // Calculate cost (per 1K tokens for input, per 1K tokens for output)
          const inputCost = (inputTokens / 1000) * model.cost;
          const outputCost = (outputTokens / 1000) * model.cost;
          const totalCost = inputCost + outputCost;

          results[model.name] = {
            inputTokens,
            outputTokens,
            totalTokens,
            totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
            costPerToken: totalTokens > 0 ? Math.round((totalCost / totalTokens) * 1000000) / 1000000 : 0
          };

          console.log(`${model.name}: ${totalTokens} tokens, $${totalCost}`);
        }
      } catch (error) {
        console.log(`${model.name}: Error - ${error.message}`);
        results[model.name] = { error: error.message };
      }

      await this.delay(1000); // Rate limiting
    }

    this.results.tests.costEfficiency = results;
  }

  async testModelCapabilities() {
    console.log("\n=== Model Capability Benchmark ===");

    const capabilities = [
      {
        name: "Code Generation",
        prompt: "Write a Python function that implements a binary search algorithm",
        evaluate: (response) => {
          const content = response.choices?.[0]?.message?.content || "";
          const hasFunction = /def\s+\w+\s*\(/.test(content);
          const hasAlgorithm = /binary\s+search|mid\s*=|left|right/.test(content);
          return hasFunction && hasAlgorithm;
        }
      },
      {
        name: "Reasoning",
        prompt: "Explain why the sky appears blue during the day",
        evaluate: (response) => {
          const content = response.choices?.[0]?.message?.content || "";
          const hasScience = /scattering|wavelength|blue|rayleigh/.test(content);
          const hasExplanation = /because|due to|reason/.test(content);
          return hasScience && hasExplanation;
        }
      },
      {
        name: "Creativity",
        prompt: "Write a haiku about artificial intelligence",
        evaluate: (response) => {
          const content = response.choices?.[0]?.message?.content || "";
          const lines = content.split('\n').filter(line => line.trim());
          // Haiku should have 3 lines, 5-7-5 syllable pattern (rough check)
          return lines.length >= 3;
        }
      }
    ];

    const models = [
      'ollama,llama3.2:latest',
      'ollama,qwen2.5-coder:latest',
      'groq,llama-3.1-70b-versatile'
    ];

    const results = {};

    for (const model of models) {
      results[model] = {};

      for (const capability of capabilities) {
        console.log(`Testing ${model} on ${capability.name}...`);

        try {
          const response = await this.makeRequest(model, capability.prompt, 100);

          if (response && response.choices && response.choices[0]) {
            const success = capability.evaluate(response);
            const tokens = response.usage?.total_tokens || 0;

            results[model][capability.name] = {
              success,
              tokens,
              score: success ? 1 : 0
            };

            console.log(`  ${success ? '✅' : '❌'} ${capability.name}: ${tokens} tokens`);
          } else {
            results[model][capability.name] = { success: false, error: 'No response' };
            console.log(`  ❌ ${capability.name}: No response`);
          }
        } catch (error) {
          results[model][capability.name] = { success: false, error: error.message };
          console.log(`  ❌ ${capability.name}: Error - ${error.message}`);
        }

        await this.delay(2000); // Longer delay for capability tests
      }
    }

    this.results.tests.capabilities = results;
  }

  async makeRequest(model, prompt, maxTokens = 100) {
    const response = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    // Generate performance summary
    this.generateSummary();

    // Save results to file
    const outputPath = path.join(__dirname, 'performance-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
  }

  generateSummary() {
    const summary = {
      fastestModel: null,
      mostCostEffective: null,
      bestOverall: null,
      recommendations: []
    };

    // Analyze latency results
    if (this.results.tests.latencyComparison) {
      const latencyData = this.results.tests.latencyComparison;
      const avgLatencies: Record<string, number> = {};

      for (const [model, prompts] of Object.entries(latencyData)) {
        const latencies = Object.values(prompts).map(p => p.avgLatency).filter(l => l);
        if (latencies.length > 0) {
          avgLatencies[model] = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        }
      }

      const fastest = Object.entries(avgLatencies).sort(([,a], [,b]) => a - b)[0];
      if (fastest) {
        summary.fastestModel = {
          model: fastest[0],
          avgLatency: Math.round(fastest[1])
        };
      }
    }

    // Analyze cost efficiency
    if (this.results.tests.costEfficiency) {
      const costData = this.results.tests.costEfficiency;
      const validCosts = Object.entries(costData)
        .filter(([,data]: [string, any]) => !(data as any).error && (data as any).totalCost !== undefined)
        .sort(([,a]: [string, any], [,b]: [string, any]) => ((a as any).totalCost as number) - ((b as any).totalCost as number));

      if (validCosts.length > 0) {
        const [model, data] = validCosts[0] as [string, { totalCost: number }];
        summary.mostCostEffective = {
          model,
          cost: data.totalCost
        };
      }
    }

    // Generate recommendations
    if (summary.fastestModel) {
      summary.recommendations.push(`For speed-critical tasks, use: ${summary.fastestModel.model}`);
    }
    if (summary.mostCostEffective) {
      summary.recommendations.push(`For cost efficiency, use: ${summary.mostCostEffective.model}`);
    }
    summary.recommendations.push("For coding tasks, prefer Ollama models (free, fast, specialized)");
    summary.recommendations.push("For complex reasoning, consider DeepSeek models (cost-effective alternative to GPT-4)");

    this.results.summary = summary;
  }
}

// Run performance tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PerformanceTester();
  tester.runAllTests().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Performance test failed:', errorMessage);
  });
}

export default PerformanceTester;
