# Implementation Guide: Claude Code Router Enhancements

## Overview

This comprehensive implementation guide provides step-by-step instructions for implementing the architectural enhancements identified in the Claude Code Router analysis. Each phase includes detailed implementation steps, code examples, testing procedures, and validation criteria.

## Prerequisites

### Development Environment Setup

```bash
# 1. Update Node.js to latest LTS
nvm install --lts
nvm use --lts

# 2. Install enhanced dependencies
npm install --save-dev @types/node typescript tsx esbuild
npm install --save fastify @fastify/static zod lru-cache ioredis
npm install --save @prometheus/client winston correlation-id jsonwebtoken

# 3. Setup development tools
npm install --save-dev jest @types/jest ts-jest eslint @typescript-eslint/eslint-plugin
npm install --save-dev prettier husky lint-staged

# 4. Initialize TypeScript strict configuration
npx tsc --init --strict --target ES2022 --module NodeNext --moduleResolution NodeNext
```

### Project Structure Enhancement

```bash
# Create enhanced directory structure
mkdir -p src/{core,providers,routing,caching,monitoring,security}
mkdir -p src/{types,interfaces,utils,middleware}
mkdir -p tests/{unit,integration,performance,e2e}
mkdir -p docs/{api,examples,migration}
mkdir -p config/{environments,schemas}
```

## Phase 1: Foundation Enhancement (Weeks 1-2)

### 1.1 Type Safety Implementation

#### Step 1: Create Core Type Definitions

```typescript
// src/types/core.ts
export interface Message {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string | ContentBlock[];
  readonly timestamp: Date;
  readonly metadata?: MessageMetadata;
}

export interface ContentBlock {
  readonly type: 'text' | 'image' | 'tool_use' | 'tool_result';
  readonly data: ContentData;
}

export type ContentData = TextContent | ImageContent | ToolUseContent | ToolResultContent;

export interface TextContent {
  readonly text: string;
}

export interface ImageContent {
  readonly source: ImageSource;
  readonly alt?: string;
}

export interface ToolUseContent {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export interface ToolResultContent {
  readonly toolUseId: string;
  readonly content: string | object;
  readonly isError?: boolean;
}

// Router types with strict typing
export interface RouterRequest {
  readonly body: {
    readonly model: string;
    readonly messages: readonly Message[];
    readonly system?: readonly SystemPrompt[];
    readonly tools?: readonly Tool[];
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly stream?: boolean;
  };
  readonly sessionId: string;
  readonly userId: string;
  readonly metadata: RequestMetadata;
}

export interface RouterResponse {
  readonly content: ContentBlock[];
  readonly usage: TokenUsage;
  readonly model: string;
  readonly stopReason: StopReason;
  readonly metadata: ResponseMetadata;
}

// Provider abstractions
export interface ProviderConfig {
  readonly name: string;
  readonly apiBaseUrl: string;
  readonly models: readonly string[];
  readonly capabilities: ProviderCapabilities;
  readonly rateLimit: RateLimitConfig;
  readonly timeout: number;
}

export interface ProviderCapabilities {
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  readonly supportsImages: boolean;
  readonly maxTokens: number;
  readonly maxMessages: number;
}
```

#### Step 2: Implement Zod Validation Schemas

```typescript
// src/schemas/validation.ts
import { z } from 'zod';

// Message validation schema
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string(),
    z.array(z.object({
      type: z.enum(['text', 'image', 'tool_use', 'tool_result']),
      data: z.unknown()
    }))
  ]),
  timestamp: z.date(),
  metadata: z.record(z.unknown()).optional()
});

// Router request validation
export const RouterRequestSchema = z.object({
  body: z.object({
    model: z.string().min(1),
    messages: z.array(MessageSchema).min(1),
    system: z.array(z.object({
      type: z.literal('text'),
      text: z.string()
    })).optional(),
    tools: z.array(z.object({
      name: z.string(),
      description: z.string(),
      input_schema: z.record(z.unknown())
    })).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(100000).optional(),
    stream: z.boolean().optional().default(true)
  }),
  sessionId: z.string().uuid(),
  userId: z.string().min(1),
  metadata: z.record(z.unknown())
});

// Provider configuration validation
export const ProviderConfigSchema = z.object({
  name: z.string().min(1),
  apiBaseUrl: z.string().url(),
  models: z.array(z.string()).min(1),
  capabilities: z.object({
    supportsStreaming: z.boolean(),
    supportsTools: z.boolean(),
    supportsImages: z.boolean(),
    maxTokens: z.number().min(1),
    maxMessages: z.number().min(1)
  }),
  rateLimit: z.object({
    requestsPerMinute: z.number().min(1),
    requestsPerHour: z.number().min(1),
    burstLimit: z.number().min(1)
  }),
  timeout: z.number().min(1000).max(300000)
});

// Validation middleware
export class ValidationMiddleware {
  static validateRouterRequest() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validated = RouterRequestSchema.parse({
          body: request.body,
          sessionId: request.headers['x-session-id'],
          userId: request.headers['x-user-id'],
          metadata: {
            userAgent: request.headers['user-agent'],
            ip: request.ip,
            timestamp: new Date()
          }
        });

        // Attach validated data to request
        (request as any).validated = validated;
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: 'Validation failed',
            details: error.errors
          });
          return;
        }
        throw error;
      }
    };
  }
}
```

#### Step 3: Implement Error Handling Framework

```typescript
// src/core/errors.ts
export abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context
    };
  }
}

export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string, public readonly errors: any[]) {
    super(message, { errors });
  }
}

export class ProviderError extends BaseError {
  readonly code = 'PROVIDER_ERROR';
  readonly statusCode = 502;

  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: Error
  ) {
    super(message, { provider, originalError: originalError?.message });
  }
}

export class RateLimitError extends BaseError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;

  constructor(
    message: string,
    public readonly limit: number,
    public readonly resetTime: Date
  ) {
    super(message, { limit, resetTime });
  }
}

// Global error handler
export class ErrorHandler {
  static setup(app: FastifyInstance) {
    app.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      const logger = request.log;

      if (error instanceof BaseError) {
        logger.warn({
          error: error.toJSON(),
          request: {
            method: request.method,
            url: request.url,
            headers: request.headers
          }
        }, 'Application error occurred');

        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            timestamp: error.timestamp
          }
        });
      }

      // Handle unexpected errors
      logger.error({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        request: {
          method: request.method,
          url: request.url
        }
      }, 'Unexpected error occurred');

      return reply.status(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      });
    });
  }
}
```

#### Step 4: Implement Structured Logging

```typescript
// src/core/logging.ts
import winston from 'winston';
import { randomUUID } from 'crypto';

export interface LogContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  provider?: string;
  operation?: string;
}

export class StructuredLogger {
  private static instance: winston.Logger;

  static getInstance(): winston.Logger {
    if (!this.instance) {
      this.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return JSON.stringify({
              timestamp,
              level,
              message,
              service: 'claude-code-router',
              ...meta
            });
          })
        ),
        transports: [
          new winston.transports.Console(),
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' })
        ]
      });
    }
    return this.instance;
  }

  static child(context: Partial<LogContext>): winston.Logger {
    return this.getInstance().child(context);
  }
}

// Correlation ID middleware
export function correlationIdMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (request.headers['x-correlation-id'] as string) || randomUUID();

    // Add to request context
    (request as any).correlationId = correlationId;

    // Add to response headers
    reply.header('x-correlation-id', correlationId);

    // Create logger with correlation context
    request.log = StructuredLogger.child({
      correlationId,
      userId: request.headers['x-user-id'] as string,
      sessionId: request.headers['x-session-id'] as string
    });
  };
}
```

### 1.2 Enhanced Router Implementation

#### Step 1: Create Type-Safe Router

```typescript
// src/routing/enhanced-router.ts
import { RouterRequest, RouterResponse, RoutingDecision } from '../types/core';
import { ProviderManager } from '../providers/provider-manager';
import { StructuredLogger } from '../core/logging';

export interface RoutingContext {
  readonly request: RouterRequest;
  readonly session: SessionContext;
  readonly constraints: RoutingConstraints;
  readonly history: RoutingHistory;
}

export interface RoutingConstraints {
  readonly maxCost?: number;
  readonly maxLatency?: number;
  readonly requiredCapabilities?: string[];
  readonly excludedProviders?: string[];
  readonly optimization: OptimizationWeights;
}

export interface OptimizationWeights {
  readonly cost: number;
  readonly latency: number;
  readonly quality: number;
}

export class EnhancedRouter {
  constructor(
    private readonly providerManager: ProviderManager,
    private readonly routingStrategy: RoutingStrategy,
    private readonly logger: winston.Logger
  ) {}

  async route(context: RoutingContext): Promise<RoutingDecision> {
    const startTime = Date.now();

    try {
      // Extract routing features
      const features = this.extractRoutingFeatures(context);
      this.logger.debug('Extracted routing features', { features });

      // Get candidate providers
      const candidates = await this.getCandidateProviders(context, features);
      this.logger.debug('Found candidate providers', { candidates: candidates.map(c => c.name) });

      // Apply routing strategy
      const decision = await this.routingStrategy.selectProvider(candidates, context, features);

      // Log routing decision
      const duration = Date.now() - startTime;
      this.logger.info('Routing decision made', {
        decision,
        duration,
        candidateCount: candidates.length
      });

      return decision;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Routing failed', { error, duration });

      // Return fallback decision
      return this.createFallbackDecision(context);
    }
  }

  private extractRoutingFeatures(context: RoutingContext): RoutingFeatures {
    const { request } = context;

    return {
      tokenCount: this.calculateTokenCount(request.body.messages),
      messageCount: request.body.messages.length,
      averageMessageLength: this.calculateAverageMessageLength(request.body.messages),
      contentType: this.classifyContent(request.body.messages),
      complexity: this.analyzeComplexity(request.body.messages),
      hasTools: Boolean(request.body.tools?.length),
      hasImages: this.hasImageContent(request.body.messages),
      temperature: request.body.temperature || 1.0,
      maxTokens: request.body.maxTokens,
      timeOfDay: new Date().getHours(),
      userTier: context.session.userTier,
      budgetConstraints: context.constraints.maxCost
    };
  }

  private async getCandidateProviders(
    context: RoutingContext,
    features: RoutingFeatures
  ): Promise<Provider[]> {
    const allProviders = this.providerManager.getAvailableProviders();

    return allProviders.filter(provider => {
      // Check basic capabilities
      if (features.hasTools && !provider.capabilities.supportsTools) return false;
      if (features.hasImages && !provider.capabilities.supportsImages) return false;
      if (features.tokenCount > provider.capabilities.maxTokens) return false;

      // Check constraints
      if (context.constraints.excludedProviders?.includes(provider.name)) return false;
      if (context.constraints.requiredCapabilities?.some(cap =>
        !provider.capabilities[cap])) return false;

      // Check health status
      if (!this.providerManager.isProviderHealthy(provider.name)) return false;

      return true;
    });
  }

  private createFallbackDecision(context: RoutingContext): RoutingDecision {
    // Use the most reliable provider as fallback
    const fallbackProvider = this.providerManager.getFallbackProvider();

    return {
      provider: fallbackProvider.name,
      model: fallbackProvider.models[0], // Use first available model
      confidence: 0.1, // Low confidence for fallback
      reasoning: 'Fallback decision due to routing failure',
      fallbacks: [],
      estimatedCost: 0,
      estimatedLatency: 5000, // Conservative estimate
      expectedQuality: 0.7
    };
  }
}
```

### 1.3 Testing Implementation

#### Step 1: Unit Tests for Type Safety

```typescript
// tests/unit/types.test.ts
import { describe, it, expect } from '@jest/globals';
import { RouterRequestSchema, MessageSchema } from '../../src/schemas/validation';
import { ValidationError } from '../../src/core/errors';

describe('Type Safety', () => {
  describe('Message Schema Validation', () => {
    it('should validate correct message structure', () => {
      const validMessage = {
        role: 'user',
        content: 'Hello, world!',
        timestamp: new Date(),
        metadata: { source: 'test' }
      };

      expect(() => MessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should reject invalid role', () => {
      const invalidMessage = {
        role: 'invalid_role',
        content: 'Hello, world!',
        timestamp: new Date()
      };

      expect(() => MessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should handle complex content blocks', () => {
      const complexMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            data: { text: 'Hello' }
          },
          {
            type: 'image',
            data: { source: { type: 'base64', media_type: 'image/png', data: 'base64data' } }
          }
        ],
        timestamp: new Date()
      };

      expect(() => MessageSchema.parse(complexMessage)).not.toThrow();
    });
  });

  describe('Router Request Validation', () => {
    it('should validate complete router request', () => {
      const validRequest = {
        body: {
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: 'Hello',
            timestamp: new Date()
          }],
          temperature: 0.7,
          maxTokens: 1000,
          stream: true
        },
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user123',
        metadata: { ip: '127.0.0.1' }
      };

      expect(() => RouterRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject invalid session ID format', () => {
      const invalidRequest = {
        body: {
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: 'Hello',
            timestamp: new Date()
          }]
        },
        sessionId: 'invalid-uuid',
        userId: 'user123',
        metadata: {}
      };

      expect(() => RouterRequestSchema.parse(invalidRequest)).toThrow();
    });
  });
});
```

#### Step 2: Integration Tests for Enhanced Router

```typescript
// tests/integration/enhanced-router.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EnhancedRouter } from '../../src/routing/enhanced-router';
import { MockProviderManager } from '../mocks/provider-manager';
import { MockRoutingStrategy } from '../mocks/routing-strategy';
import { StructuredLogger } from '../../src/core/logging';

describe('Enhanced Router Integration', () => {
  let router: EnhancedRouter;
  let mockProviderManager: MockProviderManager;
  let mockRoutingStrategy: MockRoutingStrategy;

  beforeEach(() => {
    mockProviderManager = new MockProviderManager();
    mockRoutingStrategy = new MockRoutingStrategy();
    const logger = StructuredLogger.child({ test: true });

    router = new EnhancedRouter(mockProviderManager, mockRoutingStrategy, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should route simple text requests correctly', async () => {
    const context = createMockRoutingContext({
      body: {
        model: 'auto',
        messages: [{
          role: 'user',
          content: 'Hello, world!',
          timestamp: new Date()
        }],
        stream: true
      }
    });

    mockProviderManager.setAvailableProviders([
      createMockProvider('openai', { supportsStreaming: true }),
      createMockProvider('anthropic', { supportsStreaming: true })
    ]);

    const decision = await router.route(context);

    expect(decision.provider).toBeDefined();
    expect(decision.model).toBeDefined();
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.reasoning).toBeDefined();
  });

  it('should handle tool-enabled requests', async () => {
    const context = createMockRoutingContext({
      body: {
        model: 'auto',
        messages: [{
          role: 'user',
          content: 'Calculate 2+2',
          timestamp: new Date()
        }],
        tools: [{
          name: 'calculator',
          description: 'A simple calculator',
          input_schema: { type: 'object', properties: {} }
        }],
        stream: true
      }
    });

    mockProviderManager.setAvailableProviders([
      createMockProvider('openai', { supportsTools: true, supportsStreaming: true }),
      createMockProvider('anthropic', { supportsTools: false, supportsStreaming: true })
    ]);

    const decision = await router.route(context);

    // Should select provider that supports tools
    const selectedProvider = mockProviderManager.getProvider(decision.provider);
    expect(selectedProvider?.capabilities.supportsTools).toBe(true);
  });

  it('should fallback gracefully on routing failure', async () => {
    const context = createMockRoutingContext({
      body: {
        model: 'auto',
        messages: [{
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }],
        stream: true
      }
    });

    // Simulate routing failure
    mockRoutingStrategy.setShouldFail(true);
    mockProviderManager.setFallbackProvider(createMockProvider('fallback', {}));

    const decision = await router.route(context);

    expect(decision.provider).toBe('fallback');
    expect(decision.confidence).toBeLessThan(0.5);
    expect(decision.reasoning).toContain('Fallback');
  });

  it('should respect routing constraints', async () => {
    const context = createMockRoutingContext({
      body: {
        model: 'auto',
        messages: [{
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }],
        stream: true
      },
      constraints: {
        excludedProviders: ['openai'],
        maxCost: 0.01,
        optimization: { cost: 0.8, latency: 0.1, quality: 0.1 }
      }
    });

    mockProviderManager.setAvailableProviders([
      createMockProvider('openai', {}),
      createMockProvider('anthropic', {}),
      createMockProvider('groq', {})
    ]);

    const decision = await router.route(context);

    expect(decision.provider).not.toBe('openai');
  });
});

// Test helper functions
function createMockRoutingContext(overrides: Partial<RouterRequest> = {}): RoutingContext {
  return {
    request: {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'test-user',
      metadata: { timestamp: new Date() },
      body: {
        model: 'auto',
        messages: [],
        stream: true
      },
      ...overrides
    } as RouterRequest,
    session: {
      userTier: 'standard',
      preferences: {},
      budget: { monthlyLimit: 100, currentUsage: 10 }
    },
    constraints: {
      optimization: { cost: 0.33, latency: 0.33, quality: 0.34 }
    },
    history: {
      getPreferences: () => ({}),
      getUsagePattern: () => ({})
    }
  } as RoutingContext;
}

function createMockProvider(name: string, capabilities: Partial<ProviderCapabilities>): Provider {
  return {
    name,
    models: [`${name}-model-1`, `${name}-model-2`],
    capabilities: {
      supportsStreaming: false,
      supportsTools: false,
      supportsImages: false,
      maxTokens: 4096,
      maxMessages: 100,
      ...capabilities
    }
  } as Provider;
}
```

## Phase 2: Performance & Reliability (Weeks 3-4)

### 2.1 Connection Pooling Implementation

#### Step 1: HTTP Client with Connection Pooling

```typescript
// src/providers/http-client.ts
import http from 'http';
import https from 'https';
import { ProviderConfig } from '../types/core';
import { StructuredLogger } from '../core/logging';

export interface HttpClientConfig {
  timeout: number;
  maxSockets: number;
  maxFreeSockets: number;
  keepAlive: boolean;
  keepAliveMsecs: number;
}

export class PooledHttpClient {
  private readonly agents = new Map<string, http.Agent>();
  private readonly logger: winston.Logger;

  constructor(private readonly config: HttpClientConfig) {
    this.logger = StructuredLogger.child({ component: 'http-client' });
  }

  getAgent(providerConfig: ProviderConfig): http.Agent {
    const key = `${providerConfig.name}-${providerConfig.apiBaseUrl}`;

    if (!this.agents.has(key)) {
      const isHttps = providerConfig.apiBaseUrl.startsWith('https:');

      const agent = isHttps
        ? new https.Agent({
            keepAlive: this.config.keepAlive,
            maxSockets: this.config.maxSockets,
            maxFreeSockets: this.config.maxFreeSockets,
            keepAliveMsecs: this.config.keepAliveMsecs,
            timeout: this.config.timeout
          })
        : new http.Agent({
            keepAlive: this.config.keepAlive,
            maxSockets: this.config.maxSockets,
            maxFreeSockets: this.config.maxFreeSockets,
            keepAliveMsecs: this.config.keepAliveMsecs,
            timeout: this.config.timeout
          });

      this.agents.set(key, agent);

      this.logger.debug('Created new HTTP agent', {
        provider: providerConfig.name,
        isHttps,
        config: this.config
      });
    }

    return this.agents.get(key)!;
  }

  async request<T>(
    providerConfig: ProviderConfig,
    options: RequestOptions
  ): Promise<HttpResponse<T>> {
    const agent = this.getAgent(providerConfig);
    const startTime = Date.now();

    try {
      const response = await fetch(options.url, {
        ...options,
        // @ts-ignore - Node.js specific
        agent,
        timeout: this.config.timeout
      });

      const duration = Date.now() - startTime;

      this.logger.debug('HTTP request completed', {
        provider: providerConfig.name,
        url: options.url,
        method: options.method,
        status: response.status,
        duration
      });

      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await response.text()
        );
      }

      const data = await response.json() as T;
      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('HTTP request failed', {
        provider: providerConfig.name,
        url: options.url,
        error: error.message,
        duration
      });

      throw error;
    }
  }

  getConnectionStats(): ConnectionStats[] {
    return Array.from(this.agents.entries()).map(([key, agent]) => ({
      provider: key,
      activeSockets: this.getSocketCount(agent, 'sockets'),
      freeSockets: this.getSocketCount(agent, 'freeSockets'),
      requests: this.getSocketCount(agent, 'requests')
    }));
  }

  private getSocketCount(agent: http.Agent, property: string): number {
    const sockets = (agent as any)[property];
    if (!sockets) return 0;

    return Object.values(sockets).reduce((total: number, socketArray: any) => {
      return total + (Array.isArray(socketArray) ? socketArray.length : 0);
    }, 0);
  }

  destroy(): void {
    for (const [key, agent] of this.agents) {
      agent.destroy();
      this.logger.debug('Destroyed HTTP agent', { provider: key });
    }
    this.agents.clear();
  }
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
```

### 2.2 Intelligent Caching Implementation

#### Step 1: Multi-Level Cache System

```typescript
// src/caching/intelligent-cache.ts
import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { RouterRequest, RouterResponse } from '../types/core';
import { StructuredLogger } from '../core/logging';

export interface CacheConfig {
  l1: {
    maxItems: number;
    ttl: number;
  };
  l2: {
    redis: {
      host: string;
      port: number;
      password?: string;
    };
    keyPrefix: string;
    ttl: number;
  };
  strategy: CacheStrategyConfig;
}

export interface CacheStrategyConfig {
  contentTypeMultipliers: Record<string, number>;
  userTierMultipliers: Record<string, number>;
  providerMultipliers: Record<string, number>;
  minTTL: number;
  maxTTL: number;
}

export interface CacheContext {
  contentType: string;
  userTier: string;
  provider: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  context: CacheContext;
  hitCount: number;
  lastAccessed: number;
}

export class IntelligentCache {
  private readonly l1Cache: LRUCache<string, CacheEntry>;
  private readonly l2Cache: Redis;
  private readonly strategy: CacheStrategy;
  private readonly logger: winston.Logger;

  constructor(config: CacheConfig) {
    this.logger = StructuredLogger.child({ component: 'cache' });

    // Initialize L1 cache (memory)
    this.l1Cache = new LRUCache({
      max: config.l1.maxItems,
      ttl: config.l1.ttl,
      updateAgeOnGet: true,
      allowStale: false
    });

    // Initialize L2 cache (Redis)
    this.l2Cache = new Redis({
      host: config.l2.redis.host,
      port: config.l2.redis.port,
      password: config.l2.redis.password,
      keyPrefix: config.l2.keyPrefix,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.strategy = new CacheStrategy(config.strategy);

    this.setupEventHandlers();
  }

  async get<T>(key: string, context: CacheContext): Promise<CacheResult<T>> {
    // Try L1 cache first
    const l1Result = this.getFromL1<T>(key, context);
    if (l1Result.hit) {
      this.logger.debug('Cache hit (L1)', { key, context });
      return l1Result;
    }

    // Try L2 cache
    const l2Result = await this.getFromL2<T>(key, context);
    if (l2Result.hit) {
      // Promote to L1
      const ttl = this.strategy.calculateTTL(context);
      this.setInL1(key, l2Result.data!, context, ttl);

      this.logger.debug('Cache hit (L2)', { key, context });
      return l2Result;
    }

    this.logger.debug('Cache miss', { key, context });
    return { hit: false, source: 'none', data: null };
  }

  async set<T>(key: string, data: T, context: CacheContext): Promise<void> {
    const ttl = this.strategy.calculateTTL(context);

    // Store in both levels
    this.setInL1(key, data, context, ttl);
    await this.setInL2(key, data, context, ttl);

    this.logger.debug('Cache set', { key, context, ttl });
  }

  createCacheKey(request: RouterRequest): string {
    // Extract relevant parts for cache key
    const relevant = {
      model: request.body.model,
      messages: this.normalizeMessages(request.body.messages),
      system: request.body.system,
      temperature: request.body.temperature,
      maxTokens: request.body.maxTokens,
      tools: request.body.tools?.map(t => ({ name: t.name, description: t.description }))
    };

    // Sort keys for consistent hashing
    const normalized = JSON.stringify(relevant, this.sortObjectKeys);

    return createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 32); // Use first 32 chars for readability
  }

  private getFromL1<T>(key: string, context: CacheContext): CacheResult<T> {
    const entry = this.l1Cache.get(key);

    if (!entry) {
      return { hit: false, source: 'none', data: null };
    }

    if (this.strategy.shouldExpire(entry, context)) {
      this.l1Cache.delete(key);
      return { hit: false, source: 'none', data: null };
    }

    // Update access statistics
    entry.hitCount++;
    entry.lastAccessed = Date.now();

    return {
      hit: true,
      source: 'l1',
      data: entry.data as T,
      metadata: {
        hitCount: entry.hitCount,
        age: Date.now() - entry.timestamp
      }
    };
  }

  private async getFromL2<T>(key: string, context: CacheContext): Promise<CacheResult<T>> {
    try {
      const cached = await this.l2Cache.get(key);

      if (!cached) {
        return { hit: false, source: 'none', data: null };
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      if (this.strategy.shouldExpire(entry, context)) {
        await this.l2Cache.del(key);
        return { hit: false, source: 'none', data: null };
      }

      return {
        hit: true,
        source: 'l2',
        data: entry.data,
        metadata: {
          hitCount: entry.hitCount,
          age: Date.now() - entry.timestamp
        }
      };

    } catch (error) {
      this.logger.error('L2 cache get failed', { key, error });
      return { hit: false, source: 'none', data: null };
    }
  }

  private setInL1<T>(key: string, data: T, context: CacheContext, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      context,
      hitCount: 0,
      lastAccessed: Date.now()
    };

    this.l1Cache.set(key, entry, { ttl });
  }

  private async setInL2<T>(key: string, data: T, context: CacheContext, ttl: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        context,
        hitCount: 0,
        lastAccessed: Date.now()
      };

      await this.l2Cache.setex(key, Math.floor(ttl / 1000), JSON.stringify(entry));
    } catch (error) {
      this.logger.error('L2 cache set failed', { key, error });
    }
  }

  private normalizeMessages(messages: readonly any[]): any[] {
    // Take only last N messages to avoid cache explosion
    const maxMessages = 10;
    const relevantMessages = messages.slice(-maxMessages);

    return relevantMessages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string'
        ? msg.content
        : msg.content?.map((c: any) => ({
            type: c.type,
            // Normalize content but preserve structure
            text: c.type === 'text' ? c.text : undefined
          }))
    }));
  }

  private sortObjectKeys(key: string, value: any): any {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: any = {};
      Object.keys(value).sort().forEach(k => {
        sorted[k] = value[k];
      });
      return sorted;
    }
    return value;
  }

  private setupEventHandlers(): void {
    this.l2Cache.on('connect', () => {
      this.logger.info('Connected to Redis cache');
    });

    this.l2Cache.on('error', (error) => {
      this.logger.error('Redis cache error', { error });
    });

    this.l2Cache.on('ready', () => {
      this.logger.info('Redis cache ready');
    });
  }

  async getStats(): Promise<CacheStats> {
    const l1Stats = {
      size: this.l1Cache.size,
      max: this.l1Cache.max,
      hitRatio: 0 // Would need to track hits/misses
    };

    let l2Stats = {
      keyCount: 0,
      memoryUsage: 0
    };

    try {
      const info = await this.l2Cache.info('memory');
      const keyspaceInfo = await this.l2Cache.info('keyspace');

      l2Stats = {
        keyCount: this.parseKeyspaceInfo(keyspaceInfo),
        memoryUsage: this.parseMemoryInfo(info)
      };
    } catch (error) {
      this.logger.error('Failed to get L2 cache stats', { error });
    }

    return {
      l1: l1Stats,
      l2: l2Stats,
      totalHitRatio: 0 // Would need global tracking
    };
  }

  private parseKeyspaceInfo(info: string): number {
    const match = info.match(/keys=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private parseMemoryInfo(info: string): number {
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async destroy(): Promise<void> {
    this.l1Cache.clear();
    await this.l2Cache.quit();
    this.logger.info('Cache destroyed');
  }
}

class CacheStrategy {
  constructor(private readonly config: CacheStrategyConfig) {}

  calculateTTL(context: CacheContext): number {
    const baseTTL = 15 * 60 * 1000; // 15 minutes

    // Apply multipliers
    const contentMultiplier = this.config.contentTypeMultipliers[context.contentType] || 1.0;
    const userMultiplier = this.config.userTierMultipliers[context.userTier] || 1.0;
    const providerMultiplier = this.config.providerMultipliers[context.provider] || 1.0;

    const calculatedTTL = baseTTL * contentMultiplier * userMultiplier * providerMultiplier;

    // Enforce bounds
    return Math.max(
      this.config.minTTL,
      Math.min(this.config.maxTTL, calculatedTTL)
    );
  }

  shouldExpire(entry: CacheEntry, context: CacheContext): boolean {
    const age = Date.now() - entry.timestamp;
    const dynamicTTL = this.calculateTTL(context);

    return age > dynamicTTL;
  }
}
```

### 2.3 Circuit Breaker Implementation

```typescript
// src/reliability/circuit-breaker.ts
import { EventEmitter } from 'events';
import { StructuredLogger } from '../core/logging';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitoringWindow: number;
  slowCallThreshold: number;
  slowCallRateThreshold: number;
}

export class AdaptiveCircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailure = 0;
  private lastStateChange = 0;
  private callHistory: CallRecord[] = [];
  private readonly logger: winston.Logger;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {
    super();
    this.logger = StructuredLogger.child({
      component: 'circuit-breaker',
      name: this.name
    });
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
      } else {
        this.recordRejection();
        if (fallback) {
          this.logger.debug('Executing fallback due to open circuit');
          return await fallback();
        }
        throw new CircuitBreakerOpenError(
          `Circuit breaker ${this.name} is OPEN`,
          this.getStateInfo()
        );
      }
    }

    const startTime = Date.now();

    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise<T>()
      ]);

      const duration = Date.now() - startTime;
      this.recordSuccess(duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordFailure(error as Error, duration);

      if (this.state === CircuitBreakerState.OPEN && fallback) {
        this.logger.debug('Executing fallback due to failure');
        return await fallback();
      }

      throw error;
    }
  }

  private recordSuccess(duration: number): void {
    this.addCallRecord({
      timestamp: Date.now(),
      success: true,
      duration,
      error: null
    });

    this.failures = 0;
    this.successes++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitBreakerState.CLOSED);
        this.successes = 0;
      }
    }

    this.emit('success', { duration, state: this.state });
  }

  private recordFailure(error: Error, duration: number): void {
    this.addCallRecord({
      timestamp: Date.now(),
      success: false,
      duration,
      error: error.message
    });

    this.failures++;
    this.lastFailure = Date.now();

    const threshold = this.calculateAdaptiveThreshold();

    if (this.shouldOpenCircuit(threshold)) {
      this.transitionTo(CircuitBreakerState.OPEN);
      this.failures = 0;
    }

    this.emit('failure', { error, duration, state: this.state, failures: this.failures });
  }

  private recordRejection(): void {
    this.emit('rejection', { state: this.state });
  }

  private shouldOpenCircuit(threshold: number): boolean {
    if (this.failures >= threshold) return true;

    // Check slow call rate
    const recentCalls = this.getRecentCalls();
    if (recentCalls.length >= 10) {
      const slowCalls = recentCalls.filter(call => call.duration > this.config.slowCallThreshold);
      const slowCallRate = slowCalls.length / recentCalls.length;

      if (slowCallRate >= this.config.slowCallRateThreshold) {
        this.logger.warn('Opening circuit due to slow call rate', {
          slowCallRate,
          threshold: this.config.slowCallRateThreshold,
          recentCalls: recentCalls.length
        });
        return true;
      }
    }

    return false;
  }

  private calculateAdaptiveThreshold(): number {
    const baseThreshold = this.config.failureThreshold;
    const recentCalls = this.getRecentCalls();

    if (recentCalls.length < 10) return baseThreshold;

    const recentFailureRate = recentCalls.filter(c => !c.success).length / recentCalls.length;
    const averageLatency = recentCalls.reduce((sum, call) => sum + call.duration, 0) / recentCalls.length;

    // Lower threshold if we're seeing high failure rates or slow responses
    if (recentFailureRate > 0.3 || averageLatency > this.config.slowCallThreshold) {
      return Math.floor(baseThreshold * 0.7);
    }

    return baseThreshold;
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastStateChange >= this.config.timeout;
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    this.logger.info('Circuit breaker state changed', {
      from: previousState,
      to: newState,
      failures: this.failures,
      successes: this.successes
    });

    this.emit('stateChange', {
      from: previousState,
      to: newState,
      timestamp: this.lastStateChange
    });
  }

  private addCallRecord(record: CallRecord): void {
    this.callHistory.push(record);

    // Keep only records within monitoring window
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.callHistory = this.callHistory.filter(record => record.timestamp > cutoff);
  }

  private getRecentCalls(): CallRecord[] {
    const cutoff = Date.now() - this.config.monitoringWindow;
    return this.callHistory.filter(record => record.timestamp > cutoff);
  }

  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStateInfo(): CircuitBreakerStateInfo {
    const recentCalls = this.getRecentCalls();
    const recentFailures = recentCalls.filter(c => !c.success);

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastStateChange: this.lastStateChange,
      recentCallCount: recentCalls.length,
      recentFailureCount: recentFailures.length,
      recentFailureRate: recentCalls.length > 0 ? recentFailures.length / recentCalls.length : 0
    };
  }

  getMetrics(): CircuitBreakerMetrics {
    const recentCalls = this.getRecentCalls();
    const successfulCalls = recentCalls.filter(c => c.success);
    const failedCalls = recentCalls.filter(c => !c.success);

    return {
      name: this.name,
      state: this.state,
      totalCalls: recentCalls.length,
      successfulCalls: successfulCalls.length,
      failedCalls: failedCalls.length,
      successRate: recentCalls.length > 0 ? successfulCalls.length / recentCalls.length : 0,
      averageLatency: recentCalls.length > 0
        ? recentCalls.reduce((sum, call) => sum + call.duration, 0) / recentCalls.length
        : 0,
      p95Latency: this.calculatePercentile(recentCalls.map(c => c.duration), 0.95),
      stateHistory: this.getStateHistory()
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }

  private getStateHistory(): StateHistoryEntry[] {
    // This would be implemented with persistent storage in a real system
    return [];
  }
}

// Custom errors
export class CircuitBreakerOpenError extends Error {
  constructor(message: string, public readonly stateInfo: CircuitBreakerStateInfo) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// Interfaces
interface CallRecord {
  timestamp: number;
  success: boolean;
  duration: number;
  error: string | null;
}

interface CircuitBreakerStateInfo {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailure: number;
  lastStateChange: number;
  recentCallCount: number;
  recentFailureCount: number;
  recentFailureRate: number;
}

interface CircuitBreakerMetrics {
  name: string;
  state: CircuitBreakerState;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  averageLatency: number;
  p95Latency: number;
  stateHistory: StateHistoryEntry[];
}

interface StateHistoryEntry {
  timestamp: number;
  from: CircuitBreakerState;
  to: CircuitBreakerState;
  reason: string;
}
```

This implementation guide provides the foundation for implementing the first two phases of the enhancement plan. Each component is thoroughly documented with TypeScript interfaces, comprehensive error handling, and extensive testing examples.

The next phases (Developer Experience and Advanced Features) would build upon this foundation, adding the plugin system, CLI enhancements, ML-based routing, and advanced monitoring capabilities.