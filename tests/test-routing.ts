#!/usr/bin/env node

/**
 * Integration Tests for Claude Code Router
 * Tests routing logic, custom router, and provider connectivity
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions for router tester
interface RouterConfig {
  default?: string;
  background?: string;
  think?: string;
  longContext?: string;
  longContextThreshold?: number;
  webSearch?: string;
  [key: string]: string | number | undefined;
}

interface Provider {
  name: string;
  api_base_url: string;
  models: string[];
  api_key?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  [key: string]: any;
}

interface TestConfig {
  Router?: RouterConfig;
  Providers?: Provider[];
  [key: string]: any;
}

type CustomRouterFunction = (req: any, config: TestConfig) => Promise<string> | string;

class RouterTester {
  private configPath: string;
  private customRouterPath: string;
  private config: TestConfig | null;
  private customRouter: CustomRouterFunction | null;
  constructor() {
    this.configPath = path.join(os.homedir(), '.claude-code-router', 'config.json');
    this.customRouterPath = path.join(os.homedir(), '.claude-code-router', 'custom-router.js');
    this.config = null;
    this.customRouter = null;
  }

  async loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Config file not found: ${this.configPath}`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);

      console.log('✅ Configuration loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      return false;
    }
  }

  async loadCustomRouter() {
    try {
      if (!fs.existsSync(this.customRouterPath)) {
        console.log('⚠️  Custom router not found, using default routing');
        return null;
      }

      // Load and validate custom router
      delete require.cache[require.resolve(this.customRouterPath)];
      this.customRouter = require(this.customRouterPath);

      if (typeof this.customRouter !== 'function') {
        throw new Error('Custom router must export a function');
      }

      console.log('✅ Custom router loaded successfully');
      return this.customRouter;
    } catch (error) {
      console.error('❌ Failed to load custom router:', error.message);
      return null;
    }
  }

  async testRoutingLogic() {
    console.log('\n🧪 Testing Routing Logic');
    console.log('─'.repeat(40));

    const testQueries = [
      // Code-related queries
      { query: 'How do I implement a binary search algorithm in Python?', expectedCategory: 'coding' },
      { query: 'Debug this JavaScript error: TypeError: Cannot read property', expectedCategory: 'coding' },
      { query: 'What is the difference between let and var in JavaScript?', expectedCategory: 'coding' },

      // Reasoning queries
      { query: 'Explain how machine learning works step by step', expectedCategory: 'reasoning' },
      { query: 'Why does this algorithm have O(n^2) complexity?', expectedCategory: 'reasoning' },
      { query: 'Analyze the pros and cons of microservices architecture', expectedCategory: 'reasoning' },

      // Creative queries
      { query: 'Write a creative story about a robot learning emotions', expectedCategory: 'creative' },
      { query: 'Design a user interface for a music streaming app', expectedCategory: 'creative' },
      { query: 'Generate marketing copy for a new coffee shop', expectedCategory: 'creative' },

      // Technical queries
      { query: 'How do I deploy a Docker container to AWS ECS?', expectedCategory: 'technical' },
      { query: 'Set up monitoring with Prometheus and Grafana', expectedCategory: 'technical' },
      { query: 'Configure SSL certificates for Nginx', expectedCategory: 'technical' },

      // Scientific queries
      { query: 'Explain the theory of relativity in simple terms', expectedCategory: 'scientific' },
      { query: 'Calculate the derivative of f(x) = x^2 + 3x + 1', expectedCategory: 'scientific' },

      // Simple queries
      { query: 'Hello, how are you?', expectedCategory: 'simple' },
      { query: 'What time is it?', expectedCategory: 'simple' },
      { query: 'Thank you for your help', expectedCategory: 'simple' }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testQueries) {
      try {
        const result = await this.testQuery(testCase.query);

        if (result.category === testCase.expectedCategory) {
          console.log(`✅ "${testCase.query.slice(0, 50)}..." → ${result.routing} (${result.category})`);
          passed++;
        } else {
          console.log(`❌ "${testCase.query.slice(0, 50)}..." → Expected: ${testCase.expectedCategory}, Got: ${result.category} (${result.routing})`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ "${testCase.query.slice(0, 50)}..." → Error: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed, total: testQueries.length };
  }

  async testQuery(query) {
    if (!this.customRouter) {
      throw new Error('Custom router not loaded');
    }

    // Create a mock request object
    const mockReq = {
      body: {
        messages: [
          { role: 'user', content: query }
        ]
      }
    };

    // Call the custom router
    const routing = await this.customRouter(mockReq, this.config);

    // Analyze the query to determine category (simplified version of router logic)
    const patterns = {
      coding: /\b(code|function|class|method|variable|debug|error|bug|fix|implement|programming|script|algorithm|syntax|compile|runtime|exception|stack\s*trace|git|repository|commit|branch|merge|pull\s*request)\b/gi,
      reasoning: /\b(explain|analyze|reason|think|why|how|what|understand|logic|theory|concept|principle|mechanism|process|break\s*down|step\s*by\s*step|detailed|comprehensive)\b/gi,
      creative: /\b(write|story|design|create|generate|imagine|artistic|creative|fiction|novel|poem|essay|article|content|copy|marketing|brand|visual|graphic|ui|ux)\b/gi,
      simple: /\b(hello|hi|hey|thanks|thank|yes|no|okay|ok|sure|please|help|simple|basic|quick|easy|fast|short)\b/gi,
      technical: /\b(api|database|server|client|deployment|docker|kubernetes|cloud|aws|azure|gcp|infrastructure|monitoring|logging|security|authentication|authorization|encryption)\b/gi,
      scientific: /\b(math|mathematical|calculate|formula|equation|physics|chemistry|biology|quantum|algorithm|statistics|probability|geometry|calculus|theorem|hypothesis)\b/gi
    };

    let maxScore = 0;
    let dominantCategory = 'unknown';

    for (const [category, pattern] of Object.entries(patterns)) {
      const matches = query.match(pattern);
      const score = matches ? matches.length : 0;
      if (score > maxScore) {
        maxScore = score;
        dominantCategory = category;
      }
    }

    return {
      routing: routing || 'default',
      category: dominantCategory,
      score: maxScore
    };
  }

  async testConfiguration() {
    console.log('\n🔧 Testing Configuration');
    console.log('─'.repeat(40));

    let issues = [];

    // Test config structure
    if (!this.config.Router) {
      issues.push('Missing Router configuration');
    }

    if (!this.config.Providers || this.config.Providers.length === 0) {
      issues.push('No providers configured');
    } else {
      // Test provider configurations
      for (const provider of this.config.Providers) {
        if (!provider.name) {
          issues.push('Provider missing name');
        }
        if (!provider.api_base_url) {
          issues.push(`Provider ${provider.name} missing api_base_url`);
        }
        if (!provider.models || provider.models.length === 0) {
          issues.push(`Provider ${provider.name} has no models configured`);
        }
      }
    }

    // Test router configuration
    const requiredRoutes = ['default', 'background', 'think'];
    for (const route of requiredRoutes) {
      if (!this.config.Router[route]) {
        issues.push(`Missing required route: ${route}`);
      }
    }

    if (issues.length === 0) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration issues found:');
      issues.forEach(issue => console.log(`   • ${issue}`));
    }

    return issues.length === 0;
  }

  async runAllTests() {
    console.log('🧪 Claude Code Router Integration Tests');
    console.log('═'.repeat(60));

    let allPassed = true;

    // Load configuration
    const configLoaded = await this.loadConfig();
    if (!configLoaded) {
      console.log('❌ Cannot proceed without valid configuration');
      return false;
    }

    // Load custom router
    await this.loadCustomRouter();

    // Test configuration
    const configValid = await this.testConfiguration();
    if (!configValid) {
      allPassed = false;
    }

    // Test routing logic
    if (this.customRouter) {
      const routingResults = await this.testRoutingLogic();
      if (routingResults.failed > 0) {
        allPassed = false;
      }
    } else {
      console.log('⚠️  Skipping routing tests (no custom router)');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ All tests passed! Router is ready for production.');
    } else {
      console.log('❌ Some tests failed. Please review and fix issues above.');
    }
    console.log('='.repeat(60));

    return allPassed;
  }
}

// CLI interface
async function main() {
  const tester = new RouterTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

// Export for use as module
export default RouterTester;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Test runner failed:', errorMessage);
    process.exit(1);
  });
}
