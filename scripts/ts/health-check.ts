#!/usr/bin/env node

/**
 * Health Check Utility for Claude Code Router
 * Validates provider connectivity and model availability
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
interface Provider {
  name: string;
  api_base_url: string;
  models: string[];
  api_key?: string;
  [key: string]: any;
}

interface Config {
  Providers?: Provider[];
  [key: string]: any;
}

interface ConnectivityResult {
  success: boolean;
  latency: number;
  statusCode?: number;
  response?: any;
  error?: string;
}

interface ModelCheckResult {
  available: boolean;
  statusCode?: number;
  error?: string;
}

interface ProviderHealthResult {
  name: string;
  status: 'healthy' | 'partial' | 'degraded' | 'unreachable' | 'reachable' | 'error' | 'unknown';
  connectivity: boolean;
  models: Record<string, ModelCheckResult>;
  latency: number | null;
  errors: string[];
}

interface HealthCheckResults {
  timestamp: string;
  overall: 'healthy' | 'partial' | 'degraded' | 'unreachable' | 'no_providers' | 'unknown';
  providers: Record<string, ProviderHealthResult>;
  recommendations: string[];
}

class HealthChecker {
  private configPath: string;
  private config: Config | null;
  private results: HealthCheckResults;

  constructor(configPath: string | null = null) {
    this.configPath = configPath || path.join(os.homedir(), '.claude-code-router', 'config.json');
    this.config = null;
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      providers: {},
      recommendations: []
    };
  }

  async loadConfig(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Config file not found: ${this.configPath}`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);

      // Load environment variables
      const dotenv = await import('dotenv');
      dotenv.config({ path: path.join(path.dirname(this.configPath), '.env') });

      console.log('✅ Configuration loaded successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to load configuration:', errorMessage);
      this.results.recommendations.push('Create config.json file with provider configurations');
      return false;
    }
  }

  async checkAllProviders(): Promise<void> {
    if (!this.config || !this.config.Providers) {
      console.error('❌ No providers configured');
      return;
    }

    console.log(`🔍 Checking ${this.config.Providers.length} providers...`);

    for (const provider of this.config.Providers) {
      await this.checkProvider(provider);
    }

    this.determineOverallStatus();
    this.generateRecommendations();
  }

  async checkProvider(provider: Provider): Promise<void> {
    const providerName = provider.name;
    console.log(`\n🔍 Checking provider: ${providerName}`);

    const result: ProviderHealthResult = {
      name: providerName,
      status: 'unknown',
      connectivity: false,
      models: {},
      latency: null,
      errors: []
    };

    try {
      // Check basic connectivity
      const connectivityResult = await this.checkConnectivity(provider);
      result.connectivity = connectivityResult.success;
      result.latency = connectivityResult.latency;

      if (connectivityResult.success) {
        result.status = 'reachable';

        // Check model availability
        if (provider.models && provider.models.length > 0) {
          for (const model of provider.models.slice(0, 2)) { // Check first 2 models
            const modelResult = await this.checkModel(provider, model);
            result.models[model] = modelResult;
          }
        }

        // Determine overall provider status
        const modelStatuses = Object.values(result.models);
        if (modelStatuses.length > 0 && modelStatuses.every(m => m.available)) {
          result.status = 'healthy';
        } else if (modelStatuses.some(m => m.available)) {
          result.status = 'partial';
        } else {
          result.status = 'degraded';
        }

      } else {
        result.status = 'unreachable';
        result.errors.push(connectivityResult.error);
      }

    } catch (error) {
      result.status = 'error';
      result.errors.push(error.message);
      console.error(`❌ Error checking ${providerName}:`, error.message);
    }

    this.results.providers[providerName] = result;

    // Display result
    const statusEmoji = {
      'healthy': '✅',
      'partial': '⚠️',
      'degraded': '❌',
      'unreachable': '❌',
      'error': '❌',
      'unknown': '❓'
    };

    console.log(`${statusEmoji[result.status]} ${providerName}: ${result.status}`);
    if (result.latency) {
      console.log(`   Latency: ${result.latency}ms`);
    }
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
  }

  async checkConnectivity(provider: Provider): Promise<ConnectivityResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      try {
        // Special handling for Ollama
        let testPayload;
        if (provider.name === 'ollama') {
          // For Ollama proxy, use OpenAI format since proxy handles conversion
          testPayload = {
            model: provider.models?.[0] || 'llama3.2:latest',
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 1
          };
        } else {
          // Standard OpenAI-style request for other providers
          testPayload = {
            model: provider.models?.[0] || 'test-model',
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 1
          };
        }

        const postData = JSON.stringify(testPayload);
        const url = new URL(provider.api_base_url);
        const headers = {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        };

        // Add API key if available
        if (provider.api_key) {
          const apiKey = this.resolveApiKey(provider.api_key);
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
        }

        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers,
          timeout: 10000
        };

        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
          let data = '';
          const latency = Date.now() - startTime;

          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                // For all providers (including Ollama via proxy), check status code and parse response
                resolve({
                  success: true,
                  latency,
                  statusCode: res.statusCode,
                  response: data.length > 0 ? JSON.parse(data) : null
                });
              } else {
                resolve({
                  success: false,
                  latency,
                  statusCode: res.statusCode,
                  error: `HTTP ${res.statusCode}`
                });
              }
            } catch (error) {
              resolve({
                success: false,
                latency,
                error: 'Invalid response format'
              });
            }
          });
        });

        req.on('error', (error) => {
          const latency = Date.now() - startTime;
          resolve({
            success: false,
            latency,
            error: error.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          const latency = Date.now() - startTime;
          resolve({
            success: false,
            latency,
            error: 'Request timeout'
          });
        });

        req.write(postData);
        req.end();

      } catch (error) {
        const latency = Date.now() - startTime;
        resolve({
          success: false,
          latency,
          error: error.message
        });
      }
    });
  }

  async checkModel(provider: Provider, modelName: string): Promise<ModelCheckResult> {
    return new Promise((resolve) => {
      try {
        // For most providers, we can use a minimal test
        const testPayload = {
          model: modelName,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 1
        };

        const postData = JSON.stringify(testPayload);
        const url = new URL(provider.api_base_url);
        const headers = {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        };

        if (provider.api_key) {
          const apiKey = this.resolveApiKey(provider.api_key);
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
        }

        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers,
          timeout: 5000
        };

        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
          // Consume response data
          res.on('data', () => {});
          res.on('end', () => {
            resolve({
              available: true,
              statusCode: res.statusCode
            });
          });
        });

        req.on('error', (error) => {
          resolve({
            available: false,
            error: error.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            available: false,
            error: 'Request timeout'
          });
        });

        req.write(postData);
        req.end();

      } catch (error) {
        resolve({
          available: false,
          error: error.message
        });
      }
    });
  }

  resolveApiKey(apiKey: string): string | null {
    // Handle environment variable interpolation
    if (apiKey.startsWith('$')) {
      const envVar = apiKey.substring(1);
      return process.env[envVar] || null;
    }
    return apiKey;
  }

  determineOverallStatus(): void {
    const providerStatuses = Object.values(this.results.providers);

    if (providerStatuses.length === 0) {
      this.results.overall = 'no_providers';
      return;
    }

    const healthyCount = providerStatuses.filter(p => p.status === 'healthy').length;
    const partialCount = providerStatuses.filter(p => p.status === 'partial').length;
    const reachableCount = providerStatuses.filter(p => ['healthy', 'partial', 'degraded'].includes(p.status)).length;

    if (healthyCount === providerStatuses.length) {
      this.results.overall = 'healthy';
    } else if (reachableCount >= providerStatuses.length * 0.5) {
      this.results.overall = 'partial';
    } else if (reachableCount > 0) {
      this.results.overall = 'degraded';
    } else {
      this.results.overall = 'unreachable';
    }
  }

  generateRecommendations(): void {
    const recommendations = [];

    // Check for unreachable providers
    const unreachableProviders = Object.entries(this.results.providers)
      .filter(([_, p]) => p.status === 'unreachable')
      .map(([name, _]) => name);

    if (unreachableProviders.length > 0) {
      recommendations.push(`Fix connectivity for providers: ${unreachableProviders.join(', ')}`);
    }

    // Check for API key issues
    const providersWithoutKeys = Object.entries(this.results.providers)
      .filter(([name, p]) => {
        const provider = this.config.Providers.find(pr => pr.name === name);
        const apiKey = provider?.api_key;
        return apiKey && (!this.resolveApiKey(apiKey) || this.resolveApiKey(apiKey) === 'your_' + name.toLowerCase() + '_api_key_here');
      })
      .map(([name, _]) => name);

    if (providersWithoutKeys.length > 0) {
      recommendations.push(`Set valid API keys for providers: ${providersWithoutKeys.join(', ')}`);
    }

    // Check for missing Ollama
    const hasOllama = this.config.Providers.some(p => p.name === 'ollama');
    const ollamaStatus = this.results.providers.ollama;

    if (hasOllama && ollamaStatus?.status === 'unreachable') {
      recommendations.push('Install and start Ollama for local model support: https://ollama.ai');
    }

    this.results.recommendations = recommendations;
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 HEALTH CHECK SUMMARY');
    console.log('='.repeat(60));

    const statusEmoji = {
      'healthy': '✅',
      'partial': '⚠️',
      'degraded': '❌',
      'unreachable': '❌',
      'no_providers': '❓'
    };

    console.log(`${statusEmoji[this.results.overall]} Overall Status: ${this.results.overall.toUpperCase()}`);
    console.log(`📊 Checked ${Object.keys(this.results.providers).length} providers`);
    console.log(`🕐 Timestamp: ${this.results.timestamp}`);

    if (this.results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.results.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    console.log('\n📋 PROVIDER DETAILS:');
    Object.entries(this.results.providers).forEach(([name, provider]) => {
      const emoji = statusEmoji[provider.status] || '❓';
      console.log(`   ${emoji} ${name}: ${provider.status}`);
      if (provider.latency) {
        console.log(`      Latency: ${provider.latency}ms`);
      }
    });
  }

  saveResults(): void {
    const resultsPath = path.join(path.dirname(this.configPath), 'health-check-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);
  }

  getResults(): HealthCheckResults {
    return this.results;
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];

  const checker = new HealthChecker(configPath);

  console.log('🔍 Claude Code Router Health Check');
  console.log('=====================================');

  const configLoaded = await checker.loadConfig();
  if (!configLoaded) {
    process.exit(1);
  }

  await checker.checkAllProviders();
  checker.printSummary();
  checker.saveResults();

  // Exit with appropriate code
  const exitCodes: Record<string, number> = {
    'healthy': 0,
    'partial': 1,
    'degraded': 2,
    'unreachable': 3,
    'no_providers': 4
  };

  process.exit(exitCodes[checker.getResults().overall] || 1);
}

// Export for use as module
export default HealthChecker;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Health check failed:', errorMessage);
    process.exit(1);
  });
}
