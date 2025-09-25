# Operations & Monitoring Enhancement Guide

## Overview

This comprehensive operations guide covers the enhanced monitoring, alerting, performance optimization, and operational procedures for the Claude Code Router. It provides detailed instructions for production deployment, maintenance, troubleshooting, and scaling strategies.

## Enhanced Monitoring Architecture

### Metrics Collection System

#### Prometheus Integration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'claude-code-router'
    static_configs:
      - targets: ['localhost:3456']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:6379']

  - job_name: 'custom-exporters'
    static_configs:
      - targets: ['localhost:8080'] # Custom application metrics
```

#### Custom Metrics Implementation

```typescript
// src/monitoring/metrics-system.ts
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { StructuredLogger } from '../core/logging';

export class EnhancedMetricsSystem {
  private readonly logger: winston.Logger;

  // Core metrics
  private readonly requestCounter: Counter<string>;
  private readonly requestDuration: Histogram<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly cacheHitRatio: Gauge<string>;

  // Provider metrics
  private readonly providerRequests: Counter<string>;
  private readonly providerLatency: Histogram<string>;
  private readonly providerErrors: Counter<string>;
  private readonly providerHealth: Gauge<string>;

  // Business metrics
  private readonly costTracking: Counter<string>;
  private readonly qualityScore: Histogram<string>;
  private readonly userSatisfaction: Gauge<string>;

  // System metrics
  private readonly memoryUsage: Gauge<string>;
  private readonly cpuUsage: Gauge<string>;
  private readonly diskUsage: Gauge<string>;

  constructor() {
    this.logger = StructuredLogger.child({ component: 'metrics' });

    // Enable default metrics
    collectDefaultMetrics();

    // Initialize custom metrics
    this.requestCounter = new Counter({
      name: 'ccr_requests_total',
      help: 'Total number of requests processed',
      labelNames: ['method', 'route', 'status_code', 'provider', 'user_tier'],
      registers: [register]
    });

    this.requestDuration = new Histogram({
      name: 'ccr_request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['method', 'route', 'provider', 'cache_status'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1.0, 2.0, 5.0, 10.0],
      registers: [register]
    });

    this.activeConnections = new Gauge({
      name: 'ccr_active_connections',
      help: 'Number of active connections',
      labelNames: ['provider'],
      registers: [register]
    });

    this.cacheHitRatio = new Gauge({
      name: 'ccr_cache_hit_ratio',
      help: 'Cache hit ratio (0-1)',
      labelNames: ['cache_level'],
      registers: [register]
    });

    this.providerRequests = new Counter({
      name: 'ccr_provider_requests_total',
      help: 'Total requests sent to providers',
      labelNames: ['provider', 'model', 'status'],
      registers: [register]
    });

    this.providerLatency = new Histogram({
      name: 'ccr_provider_latency_seconds',
      help: 'Provider response latency',
      labelNames: ['provider', 'model'],
      buckets: [0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 25.0, 50.0],
      registers: [register]
    });

    this.providerErrors = new Counter({
      name: 'ccr_provider_errors_total',
      help: 'Total provider errors',
      labelNames: ['provider', 'error_type'],
      registers: [register]
    });

    this.providerHealth = new Gauge({
      name: 'ccr_provider_health_score',
      help: 'Provider health score (0-1)',
      labelNames: ['provider'],
      registers: [register]
    });

    this.costTracking = new Counter({
      name: 'ccr_cost_total_usd',
      help: 'Total cost in USD',
      labelNames: ['provider', 'model', 'user_id'],
      registers: [register]
    });

    this.qualityScore = new Histogram({
      name: 'ccr_response_quality_score',
      help: 'Response quality score',
      labelNames: ['provider', 'model', 'content_type'],
      buckets: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      registers: [register]
    });

    this.userSatisfaction = new Gauge({
      name: 'ccr_user_satisfaction_score',
      help: 'User satisfaction score',
      labelNames: ['user_tier', 'provider'],
      registers: [register]
    });

    this.setupSystemMetrics();
    this.startPeriodicCollection();
  }

  // Request metrics
  incrementRequest(
    method: string,
    route: string,
    statusCode: number,
    provider: string,
    userTier: string
  ): void {
    this.requestCounter.inc({
      method,
      route,
      status_code: statusCode.toString(),
      provider,
      user_tier: userTier
    });
  }

  observeRequestDuration(
    method: string,
    route: string,
    provider: string,
    cacheStatus: 'hit' | 'miss',
    duration: number
  ): void {
    this.requestDuration.observe({
      method,
      route,
      provider,
      cache_status: cacheStatus
    }, duration);
  }

  // Provider metrics
  incrementProviderRequest(
    provider: string,
    model: string,
    status: 'success' | 'error'
  ): void {
    this.providerRequests.inc({ provider, model, status });
  }

  observeProviderLatency(
    provider: string,
    model: string,
    latency: number
  ): void {
    this.providerLatency.observe({ provider, model }, latency);
  }

  incrementProviderError(
    provider: string,
    errorType: string
  ): void {
    this.providerErrors.inc({ provider, error_type: errorType });
  }

  setProviderHealth(provider: string, healthScore: number): void {
    this.providerHealth.set({ provider }, healthScore);
  }

  // Business metrics
  incrementCost(
    provider: string,
    model: string,
    userId: string,
    cost: number
  ): void {
    this.costTracking.inc({ provider, model, user_id: userId }, cost);
  }

  observeQuality(
    provider: string,
    model: string,
    contentType: string,
    quality: number
  ): void {
    this.qualityScore.observe({ provider, model, content_type: contentType }, quality);
  }

  // Cache metrics
  setCacheHitRatio(level: 'l1' | 'l2', ratio: number): void {
    this.cacheHitRatio.set({ cache_level: level }, ratio);
  }

  // Connection metrics
  setActiveConnections(provider: string, count: number): void {
    this.activeConnections.set({ provider }, count);
  }

  private setupSystemMetrics(): void {
    this.memoryUsage = new Gauge({
      name: 'ccr_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [register]
    });

    this.cpuUsage = new Gauge({
      name: 'ccr_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [register]
    });

    this.diskUsage = new Gauge({
      name: 'ccr_disk_usage_bytes',
      help: 'Disk usage in bytes',
      labelNames: ['mount'],
      registers: [register]
    });
  }

  private startPeriodicCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect cache metrics every 60 seconds
    setInterval(() => {
      this.collectCacheMetrics();
    }, 60000);
  }

  private collectSystemMetrics(): void {
    const memory = process.memoryUsage();
    this.memoryUsage.set({ type: 'heap_used' }, memory.heapUsed);
    this.memoryUsage.set({ type: 'heap_total' }, memory.heapTotal);
    this.memoryUsage.set({ type: 'external' }, memory.external);
    this.memoryUsage.set({ type: 'rss' }, memory.rss);

    // CPU usage would require additional monitoring
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.cpuUsage.set(cpuPercent);
  }

  private async collectCacheMetrics(): Promise<void> {
    // This would integrate with your cache implementation
    // Example implementation:
    try {
      // const cacheStats = await this.cacheManager.getStats();
      // this.setCacheHitRatio('l1', cacheStats.l1.hitRatio);
      // this.setCacheHitRatio('l2', cacheStats.l2.hitRatio);
    } catch (error) {
      this.logger.error('Failed to collect cache metrics', { error });
    }
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  async resetMetrics(): Promise<void> {
    register.resetMetrics();
    this.logger.info('Metrics reset');
  }
}
```

### Alerting System

#### Alert Rules Configuration

```yaml
# alert_rules.yml
groups:
  - name: claude_code_router
    rules:
      # High-level service alerts
      - alert: ServiceDown
        expr: up{job="claude-code-router"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Claude Code Router is down"
          description: "The Claude Code Router service has been down for more than 1 minute."

      - alert: HighErrorRate
        expr: rate(ccr_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second over the last 5 minutes."

      # Performance alerts
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(ccr_request_duration_seconds_bucket[5m])) > 5
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }}s over the last 5 minutes."

      - alert: VeryHighLatency
        expr: histogram_quantile(0.95, rate(ccr_request_duration_seconds_bucket[5m])) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Very high latency detected"
          description: "95th percentile latency is {{ $value }}s over the last 5 minutes."

      # Resource alerts
      - alert: HighMemoryUsage
        expr: ccr_memory_usage_bytes{type="heap_used"} / ccr_memory_usage_bytes{type="heap_total"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Heap memory usage is {{ $value | humanizePercentage }} of total heap."

      - alert: MemoryLeak
        expr: increase(ccr_memory_usage_bytes{type="heap_used"}[30m]) > 104857600  # 100MB increase
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Potential memory leak detected"
          description: "Heap usage increased by {{ $value | humanizeBytes }} in the last 30 minutes."

      # Provider alerts
      - alert: ProviderDown
        expr: ccr_provider_health_score < 0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Provider {{ $labels.provider }} is unhealthy"
          description: "Provider {{ $labels.provider }} health score is {{ $value }}."

      - alert: ProviderHighLatency
        expr: histogram_quantile(0.95, rate(ccr_provider_latency_seconds_bucket[5m])) > 30
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High provider latency"
          description: "Provider {{ $labels.provider }} 95th percentile latency is {{ $value }}s."

      # Business alerts
      - alert: HighCostBurn
        expr: rate(ccr_cost_total_usd[1h]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High cost burn rate"
          description: "Cost burn rate is ${{ $value }}/hour over the last hour."

      - alert: LowCacheHitRate
        expr: ccr_cache_hit_ratio < 0.3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }} for {{ $labels.cache_level }}."

  - name: infrastructure
    rules:
      # Redis alerts
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis instance has been down for more than 1 minute."

      - alert: RedisHighMemory
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis high memory usage"
          description: "Redis memory usage is {{ $value | humanizePercentage }}."

      # System alerts
      - alert: HighCpuUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}."

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Disk space is {{ $value | humanizePercentage }} on {{ $labels.mountpoint }}."
```

#### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@claudecoder.local'
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 5s
      repeat_interval: 30m
    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 2h

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/'

  - name: 'critical-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#critical-alerts'
        title: 'Critical Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
    email_configs:
      - to: 'ops-team@company.com'
        subject: 'Critical Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'warning-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'Warning: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

### Dashboard Configuration

#### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "id": null,
    "title": "Claude Code Router - Operations Dashboard",
    "tags": ["claude-code-router"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(ccr_requests_total[5m])",
            "legendFormat": "{{provider}} - {{status_code}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(ccr_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, rate(ccr_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, rate(ccr_request_duration_seconds_bucket[5m]))",
            "legendFormat": "99th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(ccr_requests_total{status_code=~\"5..\"}[5m]) / rate(ccr_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ],
        "thresholds": [
          {
            "value": 0.01,
            "colorMode": "critical",
            "op": "gt"
          },
          {
            "value": 0.005,
            "colorMode": "critical",
            "op": "gt"
          }
        ]
      },
      {
        "id": 4,
        "title": "Provider Health",
        "type": "table",
        "targets": [
          {
            "expr": "ccr_provider_health_score",
            "format": "table",
            "instant": true
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": {
                "__name__": true,
                "job": true,
                "instance": true
              }
            }
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

## Performance Optimization

### Performance Monitoring Implementation

```typescript
// src/monitoring/performance-monitor.ts
import { EventEmitter } from 'events';
import { StructuredLogger } from '../core/logging';

export interface PerformanceProfile {
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
  context: Record<string, any>;
}

export interface PerformanceThresholds {
  maxDuration: number;
  maxMemoryIncrease: number;
  maxCpuUsage: number;
}

export class PerformanceMonitor extends EventEmitter {
  private readonly profiles = new Map<string, PerformanceProfile[]>();
  private readonly activeOperations = new Map<string, OperationContext>();
  private readonly logger: winston.Logger;
  private readonly thresholds: PerformanceThresholds;

  constructor(thresholds: PerformanceThresholds) {
    super();
    this.logger = StructuredLogger.child({ component: 'performance-monitor' });
    this.thresholds = thresholds;
  }

  startOperation(operationId: string, operation: string, context: Record<string, any> = {}): void {
    const startContext: OperationContext = {
      operation,
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      startCpu: process.cpuUsage(),
      context
    };

    this.activeOperations.set(operationId, startContext);

    this.logger.debug('Performance monitoring started', {
      operationId,
      operation,
      context
    });
  }

  endOperation(operationId: string): PerformanceProfile | null {
    const startContext = this.activeOperations.get(operationId);
    if (!startContext) {
      this.logger.warn('Performance monitoring end called for unknown operation', {
        operationId
      });
      return null;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(startContext.startCpu);

    const profile: PerformanceProfile = {
      operation: startContext.operation,
      duration: endTime - startContext.startTime,
      memoryUsage: {
        rss: endMemory.rss - startContext.startMemory.rss,
        heapTotal: endMemory.heapTotal - startContext.startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startContext.startMemory.heapUsed,
        external: endMemory.external - startContext.startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startContext.startMemory.arrayBuffers
      },
      cpuUsage: endCpu,
      timestamp: new Date(),
      context: startContext.context
    };

    // Store profile
    if (!this.profiles.has(startContext.operation)) {
      this.profiles.set(startContext.operation, []);
    }
    this.profiles.get(startContext.operation)!.push(profile);

    // Cleanup
    this.activeOperations.delete(operationId);

    // Check thresholds
    this.checkPerformanceThresholds(profile);

    this.logger.debug('Performance monitoring completed', {
      operationId,
      profile: {
        operation: profile.operation,
        duration: profile.duration,
        memoryIncrease: profile.memoryUsage.heapUsed,
        cpuTime: profile.cpuUsage.user + profile.cpuUsage.system
      }
    });

    return profile;
  }

  private checkPerformanceThresholds(profile: PerformanceProfile): void {
    const warnings: string[] = [];

    if (profile.duration > this.thresholds.maxDuration) {
      warnings.push(`Duration exceeded threshold: ${profile.duration}ms > ${this.thresholds.maxDuration}ms`);
    }

    if (profile.memoryUsage.heapUsed > this.thresholds.maxMemoryIncrease) {
      warnings.push(`Memory increase exceeded threshold: ${profile.memoryUsage.heapUsed} > ${this.thresholds.maxMemoryIncrease}`);
    }

    const cpuTime = profile.cpuUsage.user + profile.cpuUsage.system;
    if (cpuTime > this.thresholds.maxCpuUsage) {
      warnings.push(`CPU usage exceeded threshold: ${cpuTime}μs > ${this.thresholds.maxCpuUsage}μs`);
    }

    if (warnings.length > 0) {
      this.logger.warn('Performance threshold exceeded', {
        operation: profile.operation,
        warnings,
        profile
      });

      this.emit('thresholdExceeded', { profile, warnings });
    }
  }

  getOperationStats(operation: string): OperationStats | null {
    const profiles = this.profiles.get(operation);
    if (!profiles || profiles.length === 0) {
      return null;
    }

    const durations = profiles.map(p => p.duration);
    const memoryUsages = profiles.map(p => p.memoryUsage.heapUsed);

    return {
      operation,
      count: profiles.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.calculatePercentile(durations, 0.95),
      avgMemoryUsage: memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length,
      maxMemoryUsage: Math.max(...memoryUsages),
      lastExecuted: Math.max(...profiles.map(p => p.timestamp.getTime()))
    };
  }

  getAllStats(): OperationStats[] {
    return Array.from(this.profiles.keys())
      .map(op => this.getOperationStats(op))
      .filter((stats): stats is OperationStats => stats !== null);
  }

  clearStats(operation?: string): void {
    if (operation) {
      this.profiles.delete(operation);
      this.logger.info('Performance stats cleared for operation', { operation });
    } else {
      this.profiles.clear();
      this.logger.info('All performance stats cleared');
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
}

// Performance monitoring decorator
export function MonitorPerformance(operation?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = this.performanceMonitor || global.performanceMonitor;
      if (!monitor) return originalMethod.apply(this, args);

      const operationId = `${operationName}-${Date.now()}-${Math.random()}`;
      monitor.startOperation(operationId, operationName, {
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
      });

      try {
        const result = await originalMethod.apply(this, args);
        monitor.endOperation(operationId);
        return result;
      } catch (error) {
        monitor.endOperation(operationId);
        throw error;
      }
    };
  };
}

interface OperationContext {
  operation: string;
  startTime: number;
  startMemory: NodeJS.MemoryUsage;
  startCpu: NodeJS.CpuUsage;
  context: Record<string, any>;
}

interface OperationStats {
  operation: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  avgMemoryUsage: number;
  maxMemoryUsage: number;
  lastExecuted: number;
}
```

### Cost Optimization Strategies

```typescript
// src/optimization/cost-optimizer.ts
import { StructuredLogger } from '../core/logging';

export interface CostOptimizationConfig {
  budgets: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  costThresholds: {
    warning: number;
    critical: number;
  };
  optimizationStrategies: {
    cachingEnabled: boolean;
    smartRouting: boolean;
    budgetEnforcement: boolean;
    costAwareRouting: boolean;
  };
}

export interface CostMetrics {
  totalCost: number;
  costByProvider: Record<string, number>;
  costByUser: Record<string, number>;
  costByModel: Record<string, number>;
  period: {
    start: Date;
    end: Date;
  };
}

export interface CostSavings {
  cachingAmount: number;
  smartRoutingAmount: number;
  totalPotentialCost: number;
  actualCost: number;
  savingsPercentage: number;
}

export class CostOptimizer {
  private readonly logger: winston.Logger;
  private readonly config: CostOptimizationConfig;
  private costHistory: CostMetrics[] = [];

  constructor(config: CostOptimizationConfig) {
    this.config = config;
    this.logger = StructuredLogger.child({ component: 'cost-optimizer' });
  }

  async optimizeRoute(
    request: RouterRequest,
    candidates: Provider[],
    context: RoutingContext
  ): Promise<ProviderRanking[]> {
    if (!this.config.optimizationStrategies.costAwareRouting) {
      return candidates.map((provider, index) => ({
        provider,
        score: 1.0 - (index * 0.1),
        reasoning: 'Default ranking (cost optimization disabled)'
      }));
    }

    // Get current budget status
    const budgetStatus = await this.getBudgetStatus(context.session.userId);

    // Calculate cost-aware scores
    const rankings = await Promise.all(
      candidates.map(async provider => {
        const estimatedCost = await this.estimateCost(request, provider);
        const qualityScore = await this.getQualityScore(provider, request);
        const latencyScore = this.getLatencyScore(provider);

        // Apply cost weighting based on budget status
        let costWeight = 0.3; // Default weight
        if (budgetStatus.remaining < this.config.costThresholds.critical) {
          costWeight = 0.8; // Heavy cost focus when budget is critical
        } else if (budgetStatus.remaining < this.config.costThresholds.warning) {
          costWeight = 0.5; // Moderate cost focus when budget is low
        }

        const costScore = this.calculateCostScore(estimatedCost, provider);

        const overallScore =
          costScore * costWeight +
          qualityScore * (0.5 - costWeight * 0.5) +
          latencyScore * (0.2 - costWeight * 0.2);

        return {
          provider,
          score: overallScore,
          reasoning: this.generateReasoning(
            costScore,
            qualityScore,
            latencyScore,
            costWeight,
            estimatedCost,
            budgetStatus
          )
        };
      })
    );

    // Sort by score (highest first)
    return rankings.sort((a, b) => b.score - a.score);
  }

  private async estimateCost(
    request: RouterRequest,
    provider: Provider
  ): Promise<number> {
    const tokenCount = this.calculateTokenCount(request);
    const model = this.selectModelForProvider(provider, request);

    // Get pricing from provider configuration
    const pricing = provider.pricing || {
      inputTokensPerMillion: 1.0,
      outputTokensPerMillion: 3.0
    };

    // Estimate input and output tokens
    const inputTokens = tokenCount;
    const estimatedOutputTokens = request.body.maxTokens ||
      Math.min(tokenCount * 0.5, provider.capabilities.maxTokens * 0.1);

    const cost =
      (inputTokens / 1000000) * pricing.inputTokensPerMillion +
      (estimatedOutputTokens / 1000000) * pricing.outputTokensPerMillion;

    return cost;
  }

  private calculateCostScore(estimatedCost: number, provider: Provider): number {
    // Normalize cost score (lower cost = higher score)
    const maxCost = 0.10; // $0.10 as reference maximum
    return Math.max(0, (maxCost - estimatedCost) / maxCost);
  }

  async trackCost(
    userId: string,
    provider: string,
    model: string,
    actualCost: number,
    context: CostContext
  ): Promise<void> {
    // Record the cost
    await this.recordCost({
      userId,
      provider,
      model,
      cost: actualCost,
      timestamp: new Date(),
      context
    });

    // Check budget limits
    await this.checkBudgetLimits(userId, actualCost);

    // Update optimization strategies
    await this.updateOptimizationStrategies(provider, actualCost, context);
  }

  async getBudgetStatus(userId: string): Promise<BudgetStatus> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyUsage = await this.getCostForPeriod(userId, startOfMonth, now);
    const dailyUsage = await this.getDailyCost(userId);

    return {
      monthly: {
        limit: this.config.budgets.monthly,
        used: monthlyUsage,
        remaining: this.config.budgets.monthly - monthlyUsage,
        percentage: (monthlyUsage / this.config.budgets.monthly) * 100
      },
      daily: {
        limit: this.config.budgets.daily,
        used: dailyUsage,
        remaining: this.config.budgets.daily - dailyUsage,
        percentage: (dailyUsage / this.config.budgets.daily) * 100
      },
      projectedMonthly: this.projectMonthlyCost(dailyUsage, now)
    };
  }

  async generateCostReport(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<CostReport> {
    const costs = await this.getCostsForPeriod(startDate, endDate, userId);
    const savings = await this.calculateSavings(startDate, endDate, userId);

    return {
      period: { start: startDate, end: endDate },
      totalCost: costs.reduce((sum, c) => sum + c.cost, 0),
      costBreakdown: {
        byProvider: this.groupCostsByProvider(costs),
        byModel: this.groupCostsByModel(costs),
        byUser: userId ? { [userId]: costs.reduce((sum, c) => sum + c.cost, 0) } : this.groupCostsByUser(costs)
      },
      savings,
      recommendations: await this.generateRecommendations(costs, savings),
      trends: this.analyzeCostTrends(costs)
    };
  }

  private async generateRecommendations(
    costs: CostRecord[],
    savings: CostSavings
  ): Promise<CostRecommendation[]> {
    const recommendations: CostRecommendation[] = [];

    // Cache hit rate analysis
    if (savings.cachingAmount / savings.totalPotentialCost < 0.3) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        title: 'Improve cache hit rate',
        description: 'Current cache savings are low. Consider increasing cache TTL or improving cache key strategies.',
        potentialSavings: savings.totalPotentialCost * 0.2
      });
    }

    // Provider cost analysis
    const providerCosts = this.groupCostsByProvider(costs);
    const expensiveProviders = Object.entries(providerCosts)
      .filter(([_, cost]) => cost > savings.actualCost * 0.3)
      .map(([provider, cost]) => ({ provider, cost }));

    if (expensiveProviders.length > 0) {
      recommendations.push({
        type: 'provider-optimization',
        priority: 'medium',
        title: 'Consider alternative providers',
        description: `Providers ${expensiveProviders.map(p => p.provider).join(', ')} represent high cost. Evaluate cheaper alternatives.`,
        potentialSavings: expensiveProviders.reduce((sum, p) => sum + p.cost, 0) * 0.3
      });
    }

    // Usage pattern analysis
    const hourlyUsage = this.analyzeUsagePatterns(costs);
    if (hourlyUsage.peakHours.length > 0) {
      recommendations.push({
        type: 'load-balancing',
        priority: 'low',
        title: 'Optimize usage patterns',
        description: 'Consider load balancing during peak hours to reduce costs.',
        potentialSavings: savings.actualCost * 0.1
      });
    }

    return recommendations;
  }

  private async checkBudgetLimits(userId: string, newCost: number): Promise<void> {
    const budgetStatus = await this.getBudgetStatus(userId);

    // Check daily limit
    if (budgetStatus.daily.used + newCost > this.config.budgets.daily) {
      this.logger.warn('Daily budget limit exceeded', {
        userId,
        currentUsage: budgetStatus.daily.used,
        newCost,
        dailyLimit: this.config.budgets.daily
      });

      // Emit event for budget enforcement
      this.emit('budgetLimitExceeded', {
        userId,
        type: 'daily',
        usage: budgetStatus.daily.used + newCost,
        limit: this.config.budgets.daily
      });
    }

    // Check monthly projection
    if (budgetStatus.projectedMonthly > this.config.budgets.monthly * 1.2) {
      this.logger.warn('Monthly budget projection exceeded', {
        userId,
        projectedMonthly: budgetStatus.projectedMonthly,
        monthlyLimit: this.config.budgets.monthly
      });
    }
  }
}

// Interfaces
interface ProviderRanking {
  provider: Provider;
  score: number;
  reasoning: string;
}

interface BudgetStatus {
  monthly: {
    limit: number;
    used: number;
    remaining: number;
    percentage: number;
  };
  daily: {
    limit: number;
    used: number;
    remaining: number;
    percentage: number;
  };
  projectedMonthly: number;
}

interface CostRecord {
  userId: string;
  provider: string;
  model: string;
  cost: number;
  timestamp: Date;
  context: CostContext;
}

interface CostContext {
  tokenCount: number;
  cacheHit: boolean;
  requestType: string;
}

interface CostReport {
  period: { start: Date; end: Date };
  totalCost: number;
  costBreakdown: {
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    byUser: Record<string, number>;
  };
  savings: CostSavings;
  recommendations: CostRecommendation[];
  trends: CostTrends;
}

interface CostRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  potentialSavings: number;
}

interface CostTrends {
  dailyAverage: number;
  weeklyTrend: number; // Percentage change
  monthlyProjection: number;
}
```

## Troubleshooting Playbooks

### Common Issue Resolution

#### High Latency Investigation

```bash
#!/bin/bash
# high-latency-investigation.sh

echo "🔍 High Latency Investigation Playbook"
echo "======================================"

# Check current latency metrics
echo "📊 Current Latency Metrics:"
curl -s "http://localhost:3456/metrics" | grep ccr_request_duration | tail -5

# Check provider health
echo -e "\n🏥 Provider Health Status:"
curl -s "http://localhost:3456/api/providers/health" | jq '.'

# Check active connections
echo -e "\n🔗 Active Connections:"
curl -s "http://localhost:3456/debug/connections" | jq '.'

# Check cache performance
echo -e "\n💾 Cache Performance:"
curl -s "http://localhost:3456/api/cache/stats" | jq '.hitRatio'

# Check system resources
echo -e "\n🖥️  System Resources:"
echo "Memory Usage:"
free -h
echo -e "\nCPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'

# Check logs for errors
echo -e "\n📋 Recent Errors:"
tail -50 logs/error.log | grep -E "(ERROR|WARN)" | tail -10

# Generate recommendations
echo -e "\n💡 Recommendations:"
echo "1. If provider latency is high: Consider switching to faster providers"
echo "2. If cache hit rate is low: Review cache configuration and TTL settings"
echo "3. If memory usage is high: Consider restarting service or scaling up"
echo "4. If CPU usage is high: Check for expensive operations in logs"

# Check for recent configuration changes
echo -e "\n⚙️ Recent Configuration Changes:"
git log --oneline -5 --grep="config"

echo -e "\n✅ Investigation complete. Check above metrics and recommendations."
```

#### Memory Leak Detection

```bash
#!/bin/bash
# memory-leak-detection.sh

echo "🔍 Memory Leak Detection Playbook"
echo "================================"

# Take initial memory snapshot
INITIAL_MEMORY=$(curl -s "http://localhost:3456/metrics" | grep ccr_memory_usage_bytes | grep heap_used | awk '{print $2}')
echo "📊 Initial Heap Memory: $INITIAL_MEMORY bytes"

# Wait and monitor for pattern
echo "⏳ Monitoring memory usage for 5 minutes..."
for i in {1..10}; do
    sleep 30
    CURRENT_MEMORY=$(curl -s "http://localhost:3456/metrics" | grep ccr_memory_usage_bytes | grep heap_used | awk '{print $2}')
    echo "Memory at ${i}min: $CURRENT_MEMORY bytes"

    # Check for consistent growth
    if [ $CURRENT_MEMORY -gt $((INITIAL_MEMORY + 52428800)) ]; then  # 50MB increase
        echo "⚠️ Significant memory increase detected!"
    fi
done

# Generate heap dump if available
if command -v node &> /dev/null; then
    echo "📸 Generating heap dump..."
    kill -USR2 $(pgrep -f "claude-code-router")
    echo "Heap dump saved to heapdump.$(date +%s).heapsnapshot"
fi

# Check for known leak patterns
echo "🔎 Checking for leak patterns..."
curl -s "http://localhost:3456/debug/traces" | jq '.traces | length'
echo "Active request traces (should be minimal)"

# Recommendations
echo -e "\n💡 If memory leak is confirmed:"
echo "1. Review recent code changes"
echo "2. Check for unclosed resources (database connections, file handles)"
echo "3. Review cache configurations for unbounded growth"
echo "4. Consider restarting service as immediate mitigation"
echo "5. Enable heap profiling for detailed analysis"
```

#### Provider Connectivity Issues

```bash
#!/bin/bash
# provider-connectivity-check.sh

echo "🔍 Provider Connectivity Investigation"
echo "====================================="

PROVIDERS=("openai" "anthropic" "groq" "deepseek")

for provider in "${PROVIDERS[@]}"; do
    echo -e "\n🔗 Testing $provider connectivity:"

    # Check basic connectivity
    echo "  Ping test:"
    case $provider in
        "openai")
            ping -c 3 api.openai.com
            ;;
        "anthropic")
            ping -c 3 api.anthropic.com
            ;;
        "groq")
            ping -c 3 api.groq.com
            ;;
        "deepseek")
            ping -c 3 api.deepseek.com
            ;;
    esac

    # Check SSL certificate
    echo "  SSL certificate check:"
    case $provider in
        "openai")
            echo | openssl s_client -connect api.openai.com:443 2>/dev/null | openssl x509 -noout -dates
            ;;
        "anthropic")
            echo | openssl s_client -connect api.anthropic.com:443 2>/dev/null | openssl x509 -noout -dates
            ;;
        # Add other providers as needed
    esac

    # Test API endpoint
    echo "  API endpoint test:"
    curl -s -w "HTTP Status: %{http_code}\nTime: %{time_total}s\n" \
         -H "Authorization: Bearer test" \
         "https://api.${provider}.com/" -o /dev/null
done

# Check circuit breaker status
echo -e "\n🔄 Circuit Breaker Status:"
curl -s "http://localhost:3456/debug/circuit-breakers" | jq '.'

# Check recent provider errors
echo -e "\n❌ Recent Provider Errors:"
curl -s "http://localhost:3456/metrics" | grep ccr_provider_errors_total

echo -e "\n💡 Troubleshooting Steps:"
echo "1. If ping fails: Check network connectivity and DNS resolution"
echo "2. If SSL cert is expired: Provider may be having issues"
echo "3. If API returns 5xx: Provider service issues"
echo "4. If API returns 401/403: Check API key configuration"
echo "5. If circuit breaker is open: Wait for automatic retry or manually reset"
```

### Operational Procedures

#### Deployment Checklist

```bash
#!/bin/bash
# deployment-checklist.sh

echo "🚀 Claude Code Router Deployment Checklist"
echo "=========================================="

CHECKS_PASSED=0
TOTAL_CHECKS=10

check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
        ((CHECKS_PASSED++))
    else
        echo "❌ $1"
    fi
}

echo "1. Checking Node.js version..."
node --version | grep -E "v1[89]\.|v[2-9][0-9]\."
check_status "Node.js version is 18+ or higher"

echo -e "\n2. Checking TypeScript compilation..."
npm run build
check_status "TypeScript compilation successful"

echo -e "\n3. Running tests..."
npm test
check_status "All tests pass"

echo -e "\n4. Checking environment configuration..."
[ -f .env ] && [ -s .env ]
check_status "Environment file exists and is not empty"

echo -e "\n5. Validating API keys..."
grep -q "API_KEY=" .env && ! grep -q "your_api_key_here" .env
check_status "API keys are configured"

echo -e "\n6. Checking Redis connectivity..."
redis-cli ping | grep -q PONG
check_status "Redis is accessible"

echo -e "\n7. Checking disk space..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
[ $DISK_USAGE -lt 80 ]
check_status "Sufficient disk space (less than 80% used)"

echo -e "\n8. Checking memory availability..."
AVAILABLE_MEMORY=$(free -m | grep '^Mem:' | awk '{print $7}')
[ $AVAILABLE_MEMORY -gt 1000 ]
check_status "Sufficient memory available (>1GB free)"

echo -e "\n9. Validating configuration..."
npm run validate-config
check_status "Configuration is valid"

echo -e "\n10. Testing service startup..."
timeout 30s npm run dev > /dev/null 2>&1 &
PID=$!
sleep 10
kill $PID 2>/dev/null
[ $? -eq 0 ]
check_status "Service starts successfully"

echo -e "\n📊 Results: $CHECKS_PASSED/$TOTAL_CHECKS checks passed"

if [ $CHECKS_PASSED -eq $TOTAL_CHECKS ]; then
    echo "🎉 All checks passed! Ready for deployment."
    exit 0
else
    echo "⚠️ Some checks failed. Please resolve issues before deploying."
    exit 1
fi
```

#### Health Check Script

```bash
#!/bin/bash
# comprehensive-health-check.sh

echo "🏥 Claude Code Router Health Check"
echo "================================="

# Service availability
echo "1. Service Availability:"
HTTP_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:3456/health")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Service is responding"
else
    echo "❌ Service is not responding (HTTP $HTTP_STATUS)"
fi

# Database connectivity
echo -e "\n2. Database Connectivity:"
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Redis is connected"
else
    echo "❌ Redis connection failed"
fi

# Provider health
echo -e "\n3. Provider Health:"
curl -s "http://localhost:3456/api/providers/health" | jq -r '.[] | "\(.name): \(.status)"'

# Resource utilization
echo -e "\n4. Resource Utilization:"
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')

echo "Memory: ${MEMORY_USAGE}%"
echo "CPU: ${CPU_USAGE}%"
echo "Disk: ${DISK_USAGE}"

# Performance metrics
echo -e "\n5. Performance Metrics:"
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:3456/health")
echo "Response time: ${RESPONSE_TIME}s"

ERROR_RATE=$(curl -s "http://localhost:3456/metrics" | grep ccr_requests_total | grep '5..' | awk '{sum += $2} END {print sum+0}')
TOTAL_REQUESTS=$(curl -s "http://localhost:3456/metrics" | grep ccr_requests_total | awk '{sum += $2} END {print sum+0}')

if [ $TOTAL_REQUESTS -gt 0 ]; then
    ERROR_PERCENTAGE=$(echo "scale=2; $ERROR_RATE / $TOTAL_REQUESTS * 100" | bc -l)
    echo "Error rate: ${ERROR_PERCENTAGE}%"
else
    echo "Error rate: 0%"
fi

# Generate health score
echo -e "\n📊 Overall Health Score:"
HEALTH_SCORE=100

# Deduct points for issues
[ "$HTTP_STATUS" != "200" ] && HEALTH_SCORE=$((HEALTH_SCORE - 30))
[ $(echo "$MEMORY_USAGE > 80" | bc -l) -eq 1 ] && HEALTH_SCORE=$((HEALTH_SCORE - 20))
[ $(echo "$CPU_USAGE > 80" | bc -l) -eq 1 ] && HEALTH_SCORE=$((HEALTH_SCORE - 20))
[ $(echo "$RESPONSE_TIME > 2" | bc -l) -eq 1 ] && HEALTH_SCORE=$((HEALTH_SCORE - 15))
[ $(echo "$ERROR_PERCENTAGE > 5" | bc -l) -eq 1 ] && HEALTH_SCORE=$((HEALTH_SCORE - 15))

echo "Health Score: $HEALTH_SCORE/100"

if [ $HEALTH_SCORE -ge 80 ]; then
    echo "🟢 System is healthy"
elif [ $HEALTH_SCORE -ge 60 ]; then
    echo "🟡 System has minor issues"
else
    echo "🔴 System has significant issues"
fi
```

This comprehensive operations and monitoring guide provides the foundation for running the Claude Code Router in production with enterprise-grade reliability, observability, and optimization capabilities. The monitoring system, alerting configuration, and operational procedures ensure robust service management and rapid issue resolution.