#!/usr/bin/env node

/**
 * Monitoring and Metrics Utility for Claude Code Router
 * Tracks performance, errors, and usage patterns
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions for metrics structure
interface ProviderStats {
  total: number;
  successful: number;
  failed: number;
}

interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  byProvider: Record<string, ProviderStats>;
  byModel: Record<string, ProviderStats>;
  byHour: Record<number, number>;
  averageLatency: number;
}

interface ErrorMetrics {
  total: number;
  byType: Record<string, number>;
  byProvider: Record<string, number>;
  recent: Array<{
    timestamp: string;
    type: string;
    provider: string;
  }>;
}

interface RoutingMetrics {
  decisions: Record<string, number>;
  fallbacks: number;
  customRoutes: number;
}

interface HealthMetrics {
  lastCheck: string | null;
  providerStatus: Record<string, any>;
  uptime: number;
}

interface MetricsData {
  startTime: number;
  requests: RequestMetrics;
  errors: ErrorMetrics;
  routing: RoutingMetrics;
  health: HealthMetrics;
}

class MonitoringService {
  private metricsPath: string;
  private metrics: MetricsData;
  private startTime: number;
  constructor() {
    this.metricsPath = path.join(os.homedir(), '.claude-code-router', 'metrics.json');
    this.metrics = this.loadMetrics();
    this.startTime = Date.now();
  }

  loadMetrics() {
    try {
      if (fs.existsSync(this.metricsPath)) {
        const data = fs.readFileSync(this.metricsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load metrics:', error.message);
    }

    // Return default metrics structure
    return {
      startTime: Date.now(),
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byProvider: {},
        byModel: {},
        byHour: {},
        averageLatency: 0
      },
      errors: {
        total: 0,
        byType: {},
        byProvider: {},
        recent: []
      },
      routing: {
        decisions: {},
        fallbacks: 0,
        customRoutes: 0
      },
      health: {
        lastCheck: null,
        providerStatus: {},
        uptime: 0
      }
    };
  }

  saveMetrics() {
    try {
      fs.writeFileSync(this.metricsPath, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error.message);
    }
  }

  recordRequest(provider, model, latency, success = true, errorType = null) {
    const hour = new Date().getHours();

    // Update request counts
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update provider stats
    if (!this.metrics.requests.byProvider[provider]) {
      this.metrics.requests.byProvider[provider] = { total: 0, successful: 0, failed: 0 };
    }
    this.metrics.requests.byProvider[provider].total++;
    if (success) {
      this.metrics.requests.byProvider[provider].successful++;
    } else {
      this.metrics.requests.byProvider[provider].failed++;
    }

    // Update model stats
    if (!this.metrics.requests.byModel[model]) {
      this.metrics.requests.byModel[model] = { total: 0, successful: 0, failed: 0 };
    }
    this.metrics.requests.byModel[model].total++;
    if (success) {
      this.metrics.requests.byModel[model].successful++;
    } else {
      this.metrics.requests.byModel[model].failed++;
    }

    // Update hourly stats
    if (!this.metrics.requests.byHour[hour]) {
      this.metrics.requests.byHour[hour] = 0;
    }
    this.metrics.requests.byHour[hour]++;

    // Update latency
    const currentAvg = this.metrics.requests.averageLatency;
    const newAvg = (currentAvg * (this.metrics.requests.total - 1) + latency) / this.metrics.requests.total;
    this.metrics.requests.averageLatency = Math.round(newAvg);

    // Record error if applicable
    if (!success && errorType) {
      this.recordError(errorType, provider);
    }

    this.saveMetrics();
  }

  recordError(errorType, provider) {
    this.metrics.errors.total++;

    // Update error type counts
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;

    // Update provider error counts
    if (!this.metrics.errors.byProvider[provider]) {
      this.metrics.errors.byProvider[provider] = 0;
    }
    this.metrics.errors.byProvider[provider]++;

    // Keep recent errors (last 10)
    this.metrics.errors.recent.unshift({
      timestamp: new Date().toISOString(),
      type: errorType,
      provider: provider
    });
    this.metrics.errors.recent = this.metrics.errors.recent.slice(0, 10);

    this.saveMetrics();
  }

  recordRoutingDecision(decision, wasFallback = false, wasCustom = false) {
    if (!this.metrics.routing.decisions[decision]) {
      this.metrics.routing.decisions[decision] = 0;
    }
    this.metrics.routing.decisions[decision]++;

    if (wasFallback) {
      this.metrics.routing.fallbacks++;
    }
    if (wasCustom) {
      this.metrics.routing.customRoutes++;
    }

    this.saveMetrics();
  }

  updateHealthStatus(providerStatuses) {
    this.metrics.health.lastCheck = new Date().toISOString();
    this.metrics.health.providerStatus = providerStatuses;
    this.metrics.health.uptime = Date.now() - this.startTime;

    this.saveMetrics();
  }

  generateReport() {
    const uptimeHours = Math.round(this.metrics.health.uptime / (1000 * 60 * 60) * 10) / 10;
    const successRate = this.metrics.requests.total > 0
      ? Math.round((this.metrics.requests.successful / this.metrics.requests.total) * 100)
      : 0;

    return {
      summary: {
        uptime: `${uptimeHours} hours`,
        totalRequests: this.metrics.requests.total,
        successRate: `${successRate}%`,
        averageLatency: `${this.metrics.requests.averageLatency}ms`,
        totalErrors: this.metrics.errors.total
      },
      topProviders: this.getTopItems(this.metrics.requests.byProvider, 3),
      topModels: this.getTopItems(this.metrics.requests.byModel, 3),
      errorBreakdown: this.metrics.errors.byType,
      routingEfficiency: {
        customRoutes: this.metrics.routing.customRoutes,
        fallbacks: this.metrics.routing.fallbacks,
        totalDecisions: Object.values(this.metrics.routing.decisions).reduce((a, b) => a + b, 0)
      },
      hourlyActivity: this.metrics.requests.byHour,
      recentErrors: this.metrics.errors.recent.slice(0, 5)
    };
  }

  getTopItems(obj: Record<string, ProviderStats>, limit: number) {
    return Object.entries(obj)
      .sort(([, a], [, b]) => (b.total as number) - (a.total as number))
      .slice(0, limit)
      .map(([key, value]) => ({ [key]: value }));
  }

  printReport() {
    const report = this.generateReport();

    console.log('\n📊 Claude Code Router Metrics Report');
    console.log('═'.repeat(60));

    console.log('\n📈 Summary:');
    console.log(`   Uptime: ${report.summary.uptime}`);
    console.log(`   Total Requests: ${report.summary.totalRequests}`);
    console.log(`   Success Rate: ${report.summary.successRate}`);
    console.log(`   Average Latency: ${report.summary.averageLatency}`);
    console.log(`   Total Errors: ${report.summary.totalErrors}`);

    if (report.topProviders.length > 0) {
      console.log('\n🏆 Top Providers:');
      report.topProviders.forEach(provider => {
        const [name, stats] = Object.entries(provider)[0];
        const providerStats = stats as ProviderStats;
        console.log(`   ${name}: ${providerStats.total} requests (${Math.round((providerStats.successful / providerStats.total) * 100)}% success)`);
      });
    }

    if (report.topModels.length > 0) {
      console.log('\n🤖 Top Models:');
      report.topModels.forEach(model => {
        const [name, stats] = Object.entries(model)[0];
        const modelStats = stats as ProviderStats;
        console.log(`   ${name}: ${modelStats.total} requests`);
      });
    }

    if (Object.keys(report.errorBreakdown).length > 0) {
      console.log('\n❌ Error Breakdown:');
      Object.entries(report.errorBreakdown).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }

    console.log('\n🎯 Routing Efficiency:');
    console.log(`   Custom Routes: ${report.routingEfficiency.customRoutes}`);
    console.log(`   Fallbacks Used: ${report.routingEfficiency.fallbacks}`);
    console.log(`   Total Routing Decisions: ${report.routingEfficiency.totalDecisions}`);

    if (report.recentErrors.length > 0) {
      console.log('\n🚨 Recent Errors:');
      report.recentErrors.forEach(error => {
        console.log(`   ${error.timestamp.split('T')[0]} ${error.type} (${error.provider})`);
      });
    }

    console.log('\n💾 Metrics saved to:', this.metricsPath);
  }

  reset() {
    this.metrics = {
      startTime: Date.now(),
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byProvider: {},
        byModel: {},
        byHour: {},
        averageLatency: 0
      },
      errors: {
        total: 0,
        byType: {},
        byProvider: {},
        recent: []
      },
      routing: {
        decisions: {},
        fallbacks: 0,
        customRoutes: 0
      },
      health: {
        lastCheck: null,
        providerStatus: {},
        uptime: 0
      }
    };
    this.saveMetrics();
    console.log('✅ Metrics reset successfully');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const monitoring = new MonitoringService();

  switch (command) {
    case 'report':
    case undefined:
      monitoring.printReport();
      break;

    case 'reset':
      monitoring.reset();
      break;

    case 'test':
      // Add some test data
      monitoring.recordRequest('openai', 'gpt-4', 1200, true);
      monitoring.recordRequest('deepseek', 'deepseek-chat', 800, true);
      monitoring.recordRequest('ollama', 'llama3.2:latest', 300, true);
      monitoring.recordRequest('openai', 'gpt-4', 2500, false, 'timeout');
      monitoring.recordRoutingDecision('think->deepseek-reasoner', false, false);
      monitoring.recordRoutingDecision('custom->anthropic-claude', false, true);
      console.log('✅ Test data added');
      monitoring.printReport();
      break;

    default:
      console.log('Usage: node monitoring.js [command]');
      console.log('Commands:');
      console.log('  report  - Show metrics report (default)');
      console.log('  reset   - Reset all metrics');
      console.log('  test    - Add test data and show report');
      break;
  }
}

// Export for use as module
export default MonitoringService;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Monitoring error:', errorMessage);
    process.exit(1);
  });
}
