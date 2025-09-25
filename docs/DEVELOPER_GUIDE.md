# Developer Enhancement Guide

## Overview

This guide provides comprehensive documentation for developers working on the Claude Code Router enhancements. It covers the enhanced development environment, contribution guidelines, plugin development, debugging techniques, and advanced development patterns.

## Enhanced Development Environment

### Prerequisites

```bash
# Required Node.js version
node --version  # Should be >= 18.0.0

# Install global development tools
npm install -g tsx typescript eslint prettier husky

# Install enhanced project dependencies
npm install --save-dev \
  @types/node @types/jest @types/supertest \
  jest ts-jest supertest \
  eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  prettier eslint-config-prettier eslint-plugin-prettier \
  husky lint-staged \
  nodemon concurrently

# Install runtime dependencies
npm install --save \
  fastify @fastify/static @fastify/cors @fastify/helmet \
  zod lru-cache ioredis \
  winston correlation-id \
  jsonwebtoken bcrypt \
  @prometheus/client prom-client \
  class-transformer class-validator reflect-metadata
```

### Development Scripts Enhancement

```json
// package.json scripts section
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:types\"",
    "dev:server": "tsx --watch src/index.ts",
    "dev:types": "tsc --watch --noEmit",
    "dev:test": "jest --watch --coverage",
    "build": "npm run build:clean && npm run build:compile && npm run build:copy",
    "build:clean": "rm -rf dist",
    "build:compile": "tsc --project tsconfig.build.json",
    "build:copy": "cp -r src/templates dist/ && cp -r src/assets dist/",
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "jest --testPathPattern=tests/e2e",
    "test:coverage": "jest --coverage",
    "lint": "eslint src tests --ext .ts,.js",
    "lint:fix": "eslint src tests --ext .ts,.js --fix",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "validate": "npm run type-check && npm run lint && npm run test",
    "docs:generate": "typedoc --out docs/api src",
    "plugin:create": "tsx scripts/create-plugin.ts",
    "plugin:validate": "tsx scripts/validate-plugin.ts",
    "migration:create": "tsx scripts/create-migration.ts",
    "migration:run": "tsx scripts/run-migrations.ts"
  }
}
```

### TypeScript Configuration Enhancement

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/types/*": ["types/*"],
      "@/utils/*": ["utils/*"],
      "@/providers/*": ["providers/*"],
      "@/routing/*": ["routing/*"],
      "@/caching/*": ["caching/*"],
      "@/monitoring/*": ["monitoring/*"],
      "@/security/*": ["security/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", "coverage"]
}

// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["tests/**/*", "**/*.test.ts", "**/*.spec.ts"]
}
```

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    es2022: true
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'coverage/', 'node_modules/'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'error',

    // General code quality rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'prefer-destructuring': 'warn',
    'no-duplicate-imports': 'error',
    'sort-imports': ['error', { 'ignoreDeclarationSort': true }],

    // Performance rules
    'no-await-in-loop': 'warn',
    'require-atomic-updates': 'error',

    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error'
  }
};
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

## Plugin Development Framework

### Plugin System Architecture

```typescript
// src/plugins/plugin-system.ts
import { EventEmitter } from 'events';
import { FastifyInstance } from 'fastify';
import { watch, FSWatcher } from 'fs';
import { join, resolve } from 'path';
import { StructuredLogger } from '../core/logging';

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  permissions?: PluginPermission[];
}

export interface PluginPermission {
  resource: string;
  actions: string[];
  description: string;
}

export interface PluginContext {
  logger: winston.Logger;
  config: any;
  server: FastifyInstance;
  events: EventEmitter;
  utilities: PluginUtilities;
}

export interface PluginUtilities {
  http: HttpUtilities;
  cache: CacheUtilities;
  metrics: MetricsUtilities;
  validation: ValidationUtilities;
}

export abstract class BasePlugin {
  abstract metadata: PluginMetadata;

  constructor(protected context: PluginContext) {}

  abstract async initialize(): Promise<void>;
  abstract async destroy(): Promise<void>;

  // Lifecycle hooks
  async beforeRoute?(request: any, reply: any): Promise<void>;
  async afterRoute?(request: any, reply: any, payload: any): Promise<void>;
  async onError?(error: Error, request: any, reply: any): Promise<void>;

  // Plugin-specific methods
  registerRoute?(path: string, method: string, handler: Function): void;
  registerMiddleware?(middleware: Function): void;
  registerTransformer?(transformer: any): void;
}

export class PluginManager extends EventEmitter {
  private plugins = new Map<string, PluginInstance>();
  private watchers = new Map<string, FSWatcher>();
  private logger: winston.Logger;

  constructor(
    private server: FastifyInstance,
    private pluginDirectory: string
  ) {
    super();
    this.logger = StructuredLogger.child({ component: 'plugin-manager' });
  }

  async loadPlugin(pluginPath: string): Promise<void> {
    try {
      this.logger.info('Loading plugin', { path: pluginPath });

      // Dynamic import for hot-reloading
      const pluginModule = await this.importPlugin(pluginPath);
      const PluginClass = pluginModule.default || pluginModule;

      if (!(PluginClass.prototype instanceof BasePlugin)) {
        throw new Error('Plugin must extend BasePlugin');
      }

      // Create plugin context
      const context = this.createPluginContext();

      // Instantiate plugin
      const plugin = new PluginClass(context);
      await this.validatePlugin(plugin);

      // Initialize plugin
      await plugin.initialize();

      // Store plugin instance
      const instance: PluginInstance = {
        plugin,
        metadata: plugin.metadata,
        path: pluginPath,
        loadTime: new Date(),
        status: 'active'
      };

      this.plugins.set(plugin.metadata.name, instance);

      // Setup hot-reloading
      if (process.env.NODE_ENV === 'development') {
        this.setupHotReload(pluginPath, plugin.metadata.name);
      }

      this.emit('pluginLoaded', { name: plugin.metadata.name, metadata: plugin.metadata });
      this.logger.info('Plugin loaded successfully', { name: plugin.metadata.name });

    } catch (error) {
      this.logger.error('Failed to load plugin', { path: pluginPath, error });
      throw error;
    }
  }

  async unloadPlugin(name: string): Promise<void> {
    const instance = this.plugins.get(name);
    if (!instance) {
      throw new Error(`Plugin ${name} not found`);
    }

    try {
      // Destroy plugin
      await instance.plugin.destroy();

      // Stop watching for changes
      const watcher = this.watchers.get(name);
      if (watcher) {
        watcher.close();
        this.watchers.delete(name);
      }

      // Remove from memory
      this.plugins.delete(name);

      // Clear from module cache for hot-reloading
      const resolvedPath = resolve(instance.path);
      if (require.cache[resolvedPath]) {
        delete require.cache[resolvedPath];
      }

      this.emit('pluginUnloaded', { name });
      this.logger.info('Plugin unloaded', { name });

    } catch (error) {
      this.logger.error('Failed to unload plugin', { name, error });
      throw error;
    }
  }

  async reloadPlugin(name: string): Promise<void> {
    const instance = this.plugins.get(name);
    if (!instance) {
      throw new Error(`Plugin ${name} not found`);
    }

    await this.unloadPlugin(name);
    await this.loadPlugin(instance.path);
  }

  private async importPlugin(pluginPath: string): Promise<any> {
    // Use dynamic import with timestamp to bust cache
    const timestamp = Date.now();
    return import(`${pluginPath}?t=${timestamp}`);
  }

  private createPluginContext(): PluginContext {
    return {
      logger: this.logger,
      config: {}, // Would be loaded from configuration
      server: this.server,
      events: this,
      utilities: {
        http: new HttpUtilities(),
        cache: new CacheUtilities(),
        metrics: new MetricsUtilities(),
        validation: new ValidationUtilities()
      }
    };
  }

  private async validatePlugin(plugin: BasePlugin): Promise<void> {
    const { metadata } = plugin;

    // Validate required metadata fields
    if (!metadata.name || !metadata.version) {
      throw new Error('Plugin metadata must include name and version');
    }

    // Check for name conflicts
    if (this.plugins.has(metadata.name)) {
      throw new Error(`Plugin with name ${metadata.name} already exists`);
    }

    // Validate permissions
    if (metadata.permissions) {
      await this.validatePermissions(metadata.permissions);
    }

    // Check dependencies
    if (metadata.dependencies) {
      await this.checkDependencies(metadata.dependencies);
    }
  }

  private setupHotReload(pluginPath: string, pluginName: string): void {
    const watcher = watch(pluginPath, (eventType) => {
      if (eventType === 'change') {
        this.logger.info('Plugin file changed, reloading', { name: pluginName });
        this.reloadPlugin(pluginName).catch(error => {
          this.logger.error('Failed to hot-reload plugin', { name: pluginName, error });
        });
      }
    });

    this.watchers.set(pluginName, watcher);
  }

  getPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(name: string): PluginInstance | undefined {
    return this.plugins.get(name);
  }

  async executeHook(
    hookName: string,
    ...args: any[]
  ): Promise<any[]> {
    const results: any[] = [];

    for (const [name, instance] of this.plugins) {
      if (instance.status !== 'active') continue;

      try {
        const hook = (instance.plugin as any)[hookName];
        if (typeof hook === 'function') {
          const result = await hook.apply(instance.plugin, args);
          results.push(result);
        }
      } catch (error) {
        this.logger.error('Plugin hook execution failed', {
          plugin: name,
          hook: hookName,
          error
        });
      }
    }

    return results;
  }
}

interface PluginInstance {
  plugin: BasePlugin;
  metadata: PluginMetadata;
  path: string;
  loadTime: Date;
  status: 'active' | 'inactive' | 'error';
}

// Utility classes for plugins
class HttpUtilities {
  async fetch(url: string, options: any): Promise<any> {
    // Enhanced fetch with logging, retries, etc.
    return fetch(url, options);
  }
}

class CacheUtilities {
  // Cache operations available to plugins
}

class MetricsUtilities {
  // Metrics collection utilities for plugins
}

class ValidationUtilities {
  // Validation helpers for plugins
}
```

### Plugin Template Generator

```typescript
// scripts/create-plugin.ts
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { program } from 'commander';

interface PluginOptions {
  name: string;
  author: string;
  description: string;
  type: 'transformer' | 'middleware' | 'agent' | 'extension';
}

const pluginTemplates = {
  transformer: `import { BasePlugin, PluginMetadata, PluginContext } from '@/plugins/plugin-system';

export default class {{PluginName}}Transformer extends BasePlugin {
  metadata: PluginMetadata = {
    name: '{{pluginName}}',
    version: '1.0.0',
    description: '{{description}}',
    author: '{{author}}',
    permissions: [
      {
        resource: 'requests',
        actions: ['read', 'transform'],
        description: 'Transform request/response data'
      }
    ]
  };

  async initialize(): Promise<void> {
    this.context.logger.info('{{PluginName}} transformer initialized');

    // Register transformer
    this.registerTransformer?.({
      name: '{{pluginName}}',
      transformRequest: this.transformRequest.bind(this),
      transformResponse: this.transformResponse.bind(this)
    });
  }

  async destroy(): Promise<void> {
    this.context.logger.info('{{PluginName}} transformer destroyed');
  }

  private transformRequest(request: any): any {
    // Transform request before sending to provider
    this.context.logger.debug('Transforming request', { request });

    // Add your transformation logic here
    return request;
  }

  private transformResponse(response: any): any {
    // Transform response before sending to client
    this.context.logger.debug('Transforming response', { response });

    // Add your transformation logic here
    return response;
  }
}`,

  middleware: `import { BasePlugin, PluginMetadata, PluginContext } from '@/plugins/plugin-system';

export default class {{PluginName}}Middleware extends BasePlugin {
  metadata: PluginMetadata = {
    name: '{{pluginName}}',
    version: '1.0.0',
    description: '{{description}}',
    author: '{{author}}',
    permissions: [
      {
        resource: 'requests',
        actions: ['read', 'modify'],
        description: 'Process incoming requests'
      }
    ]
  };

  async initialize(): Promise<void> {
    this.context.logger.info('{{PluginName}} middleware initialized');

    // Register middleware
    this.registerMiddleware?.(this.middleware.bind(this));
  }

  async destroy(): Promise<void> {
    this.context.logger.info('{{PluginName}} middleware destroyed');
  }

  private async middleware(request: any, reply: any, next: Function): Promise<void> {
    try {
      this.context.logger.debug('Processing request in middleware', {
        method: request.method,
        url: request.url
      });

      // Add your middleware logic here

      await next();
    } catch (error) {
      this.context.logger.error('Middleware error', { error });
      throw error;
    }
  }
}`,

  agent: `import { BasePlugin, PluginMetadata, PluginContext } from '@/plugins/plugin-system';

interface {{PluginName}}Config {
  enabled: boolean;
  // Add your config properties here
}

export default class {{PluginName}}Agent extends BasePlugin {
  metadata: PluginMetadata = {
    name: '{{pluginName}}',
    version: '1.0.0',
    description: '{{description}}',
    author: '{{author}}',
    permissions: [
      {
        resource: 'agents',
        actions: ['register', 'execute'],
        description: 'Register and execute agent functionality'
      }
    ]
  };

  private config: {{PluginName}}Config = {
    enabled: true
  };

  async initialize(): Promise<void> {
    this.context.logger.info('{{PluginName}} agent initialized');

    // Register agent tools
    this.registerTools();
  }

  async destroy(): Promise<void> {
    this.context.logger.info('{{PluginName}} agent destroyed');
  }

  private registerTools(): void {
    // Register tools that this agent provides
    const tools = [
      {
        name: '{{pluginName}}_action',
        description: 'Perform {{pluginName}} action',
        input_schema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Input for the action' }
          },
          required: ['input']
        },
        handler: this.handleAction.bind(this)
      }
    ];

    tools.forEach(tool => {
      // Register each tool with the system
      this.context.events.emit('registerTool', tool);
    });
  }

  private async handleAction(args: any): Promise<string> {
    this.context.logger.debug('Handling {{pluginName}} action', { args });

    // Implement your agent logic here
    return \`{{PluginName}} processed: \${args.input}\`;
  }

  shouldHandle(request: any, config: any): boolean {
    return this.config.enabled &&
           // Add your conditions for when this agent should handle the request
           true;
  }
}`,

  extension: `import { BasePlugin, PluginMetadata, PluginContext } from '@/plugins/plugin-system';

export default class {{PluginName}}Extension extends BasePlugin {
  metadata: PluginMetadata = {
    name: '{{pluginName}}',
    version: '1.0.0',
    description: '{{description}}',
    author: '{{author}}',
    permissions: [
      {
        resource: 'system',
        actions: ['extend'],
        description: 'Extend system functionality'
      }
    ]
  };

  async initialize(): Promise<void> {
    this.context.logger.info('{{PluginName}} extension initialized');

    // Register custom routes
    this.registerRoutes();

    // Listen to system events
    this.setupEventListeners();
  }

  async destroy(): Promise<void> {
    this.context.logger.info('{{PluginName}} extension destroyed');
  }

  private registerRoutes(): void {
    // Register custom API endpoints
    this.registerRoute?.('/api/{{pluginName}}/status', 'GET', this.getStatus.bind(this));
    this.registerRoute?.('/api/{{pluginName}}/config', 'POST', this.updateConfig.bind(this));
  }

  private setupEventListeners(): void {
    this.context.events.on('requestCompleted', this.onRequestCompleted.bind(this));
    this.context.events.on('providerError', this.onProviderError.bind(this));
  }

  private async getStatus(request: any, reply: any): Promise<any> {
    return {
      plugin: this.metadata.name,
      status: 'active',
      version: this.metadata.version
    };
  }

  private async updateConfig(request: any, reply: any): Promise<any> {
    // Handle configuration updates
    return { success: true, message: 'Configuration updated' };
  }

  private onRequestCompleted(data: any): void {
    this.context.logger.debug('Request completed', data);
    // Handle request completion events
  }

  private onProviderError(error: any): void {
    this.context.logger.error('Provider error detected', error);
    // Handle provider errors
  }
}`
};

program
  .name('create-plugin')
  .description('Create a new plugin for Claude Code Router')
  .requiredOption('-n, --name <name>', 'Plugin name')
  .requiredOption('-a, --author <author>', 'Plugin author')
  .option('-d, --description <description>', 'Plugin description', 'A new plugin')
  .option('-t, --type <type>', 'Plugin type', 'extension')
  .action(async (options: PluginOptions) => {
    await createPlugin(options);
  });

async function createPlugin(options: PluginOptions): Promise<void> {
  const { name, author, description, type } = options;

  // Validate plugin type
  if (!Object.keys(pluginTemplates).includes(type)) {
    throw new Error(`Invalid plugin type: ${type}`);
  }

  // Create plugin directory
  const pluginDir = join(process.cwd(), 'plugins', name);
  await mkdir(pluginDir, { recursive: true });

  // Generate plugin code from template
  const template = pluginTemplates[type];
  const pluginCode = template
    .replace(/{{PluginName}}/g, toPascalCase(name))
    .replace(/{{pluginName}}/g, name)
    .replace(/{{author}}/g, author)
    .replace(/{{description}}/g, description);

  // Write main plugin file
  const pluginFile = join(pluginDir, `${name}.plugin.ts`);
  await writeFile(pluginFile, pluginCode);

  // Create package.json for the plugin
  const packageJson = {
    name: `@ccr/plugin-${name}`,
    version: '1.0.0',
    description,
    author,
    main: `${name}.plugin.ts`,
    keywords: ['claude-code-router', 'plugin'],
    peerDependencies: {
      '@ccr/core': '^1.0.0'
    }
  };

  await writeFile(
    join(pluginDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create README for the plugin
  const readme = `# ${toPascalCase(name)} Plugin

${description}

## Installation

\`\`\`bash
npm install @ccr/plugin-${name}
\`\`\`

## Configuration

\`\`\`json
{
  "plugins": {
    "${name}": {
      "enabled": true
    }
  }
}
\`\`\`

## Usage

This plugin automatically registers with the Claude Code Router when loaded.

## Development

\`\`\`bash
# Install dependencies
npm install

# Build plugin
npm run build

# Test plugin
npm test
\`\`\`

## Author

${author}
`;

  await writeFile(join(pluginDir, 'README.md'), readme);

  // Create basic test file
  const testFile = `import { ${toPascalCase(name)}${toPascalCase(type)} } from '../${name}.plugin';

describe('${toPascalCase(name)}${toPascalCase(type)}', () => {
  it('should initialize correctly', async () => {
    // Add your tests here
  });
});
`;

  await mkdir(join(pluginDir, 'tests'), { recursive: true });
  await writeFile(join(pluginDir, 'tests', `${name}.test.ts`), testFile);

  console.log(`✅ Plugin created successfully at: ${pluginDir}`);
  console.log(`\nNext steps:`);
  console.log(`1. cd ${pluginDir}`);
  console.log(`2. Implement your plugin logic in ${name}.plugin.ts`);
  console.log(`3. Add tests in tests/${name}.test.ts`);
  console.log(`4. Update the README.md with specific usage instructions`);
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^(.)/, char => char.toUpperCase());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);
}
```

## Advanced Debugging Techniques

### Debug Configuration

```typescript
// src/debugging/debug-manager.ts
import { StructuredLogger } from '../core/logging';
import { FastifyInstance } from 'fastify';

export interface DebugConfig {
  enabled: boolean;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  modules: string[];
  requestTracking: boolean;
  performanceMonitoring: boolean;
  memoryProfiling: boolean;
}

export class DebugManager {
  private readonly logger: winston.Logger;
  private trackedRequests = new Map<string, RequestTrace>();
  private performanceMarks = new Map<string, number>();

  constructor(
    private readonly config: DebugConfig,
    private readonly server: FastifyInstance
  ) {
    this.logger = StructuredLogger.child({ component: 'debug-manager' });

    if (config.enabled) {
      this.setupDebugging();
    }
  }

  private setupDebugging(): void {
    // Request tracking
    if (this.config.requestTracking) {
      this.setupRequestTracking();
    }

    // Performance monitoring
    if (this.config.performanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Memory profiling
    if (this.config.memoryProfiling) {
      this.setupMemoryProfiling();
    }

    // Debug endpoints
    this.setupDebugEndpoints();
  }

  private setupRequestTracking(): void {
    this.server.addHook('onRequest', async (request: any) => {
      if (!this.shouldTrackRequest(request)) return;

      const trace: RequestTrace = {
        id: request.id,
        method: request.method,
        url: request.url,
        headers: { ...request.headers },
        timestamp: Date.now(),
        stages: [],
        performance: {
          start: Date.now(),
          stages: {}
        }
      };

      this.trackedRequests.set(request.id, trace);
      this.addTraceStage(request.id, 'request-received');
    });

    this.server.addHook('preHandler', async (request: any) => {
      this.addTraceStage(request.id, 'pre-handler');
    });

    this.server.addHook('onSend', async (request: any, reply, payload) => {
      this.addTraceStage(request.id, 'on-send');
      return payload;
    });

    this.server.addHook('onResponse', async (request: any, reply) => {
      const trace = this.trackedRequests.get(request.id);
      if (trace) {
        trace.response = {
          statusCode: reply.statusCode,
          headers: reply.getHeaders(),
          duration: Date.now() - trace.timestamp
        };

        this.addTraceStage(request.id, 'response-sent');
        this.logRequestTrace(trace);

        // Cleanup old traces
        setTimeout(() => {
          this.trackedRequests.delete(request.id);
        }, 60000); // Keep traces for 1 minute
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    // Performance hooks for critical paths
    const originalFetch = global.fetch;
    global.fetch = async (url: any, options?: any) => {
      const start = Date.now();
      const result = await originalFetch(url, options);
      const duration = Date.now() - start;

      this.logger.debug('HTTP request performance', {
        url: typeof url === 'string' ? url : url.toString(),
        method: options?.method || 'GET',
        status: result.status,
        duration
      });

      return result;
    };
  }

  private setupMemoryProfiling(): void {
    // Memory usage monitoring
    setInterval(() => {
      const usage = process.memoryUsage();
      this.logger.debug('Memory usage', {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss
      });

      // Warn on high memory usage
      if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
        this.logger.warn('High memory usage detected', { usage });
      }
    }, 30000); // Check every 30 seconds
  }

  private setupDebugEndpoints(): void {
    // Debug information endpoint
    this.server.get('/debug/info', async (request, reply) => {
      return {
        config: this.config,
        trackedRequests: this.trackedRequests.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };
    });

    // Request traces endpoint
    this.server.get('/debug/traces', async (request, reply) => {
      return {
        traces: Array.from(this.trackedRequests.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 100) // Return last 100 traces
      };
    });

    // Performance marks endpoint
    this.server.get('/debug/performance', async (request, reply) => {
      return {
        marks: Object.fromEntries(this.performanceMarks.entries())
      };
    });

    // Trigger garbage collection (development only)
    if (process.env.NODE_ENV === 'development') {
      this.server.post('/debug/gc', async (request, reply) => {
        if (global.gc) {
          global.gc();
          return { success: true, memoryUsage: process.memoryUsage() };
        } else {
          return { success: false, message: 'Garbage collection not available' };
        }
      });
    }
  }

  markPerformance(name: string): void {
    this.performanceMarks.set(name, Date.now());
  }

  measurePerformance(startMark: string, endMark?: string): number {
    const start = this.performanceMarks.get(startMark);
    if (!start) return 0;

    const end = endMark ? this.performanceMarks.get(endMark) : Date.now();
    if (!end) return 0;

    return end - start;
  }

  private shouldTrackRequest(request: any): boolean {
    // Skip tracking for debug endpoints
    if (request.url.startsWith('/debug/')) return false;

    // Track based on configuration
    return this.config.modules.some(module =>
      request.url.includes(module) ||
      request.headers['x-debug-module'] === module
    );
  }

  private addTraceStage(requestId: string, stage: string): void {
    const trace = this.trackedRequests.get(requestId);
    if (trace) {
      trace.stages.push({
        name: stage,
        timestamp: Date.now(),
        duration: Date.now() - trace.timestamp
      });
    }
  }

  private logRequestTrace(trace: RequestTrace): void {
    if (this.config.level === 'trace' || this.config.level === 'debug') {
      this.logger.debug('Request trace completed', {
        trace: {
          id: trace.id,
          method: trace.method,
          url: trace.url,
          duration: trace.response?.duration,
          statusCode: trace.response?.statusCode,
          stages: trace.stages
        }
      });
    }
  }
}

interface RequestTrace {
  id: string;
  method: string;
  url: string;
  headers: Record<string, any>;
  timestamp: number;
  stages: TraceStage[];
  performance: {
    start: number;
    stages: Record<string, number>;
  };
  response?: {
    statusCode: number;
    headers: Record<string, any>;
    duration: number;
  };
}

interface TraceStage {
  name: string;
  timestamp: number;
  duration: number;
}
```

### Interactive Debugging Tools

```typescript
// src/debugging/interactive-debugger.ts
import { createInterface } from 'readline';
import { FastifyInstance } from 'fastify';
import { StructuredLogger } from '../core/logging';

export class InteractiveDebugger {
  private readonly logger: winston.Logger;
  private readonly readline: any;
  private debugSession: DebugSession | null = null;

  constructor(private readonly server: FastifyInstance) {
    this.logger = StructuredLogger.child({ component: 'interactive-debugger' });

    if (process.env.NODE_ENV === 'development') {
      this.setupInteractiveDebugging();
    }
  }

  private setupInteractiveDebugging(): void {
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'CCR-Debug> '
    });

    this.readline.on('line', (line: string) => {
      this.handleCommand(line.trim());
    });

    console.log('🐛 Interactive debugging enabled. Type "help" for commands.');
    this.readline.prompt();
  }

  private async handleCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.split(' ');

    try {
      switch (cmd.toLowerCase()) {
        case 'help':
          this.showHelp();
          break;

        case 'status':
          await this.showStatus();
          break;

        case 'routes':
          this.showRoutes();
          break;

        case 'plugins':
          await this.showPlugins();
          break;

        case 'config':
          this.showConfig(args[0]);
          break;

        case 'logs':
          this.showLogs(parseInt(args[0]) || 10);
          break;

        case 'memory':
          this.showMemoryUsage();
          break;

        case 'providers':
          await this.showProviders();
          break;

        case 'cache':
          await this.showCacheStats();
          break;

        case 'test':
          await this.testProvider(args[0], args.slice(1).join(' '));
          break;

        case 'clear':
          console.clear();
          break;

        case 'exit':
        case 'quit':
          this.cleanup();
          process.exit(0);
          break;

        default:
          console.log(`Unknown command: ${cmd}. Type "help" for available commands.`);
      }
    } catch (error) {
      console.error(`Command failed:`, error);
    }

    this.readline.prompt();
  }

  private showHelp(): void {
    console.log(`
Available Commands:
  help              - Show this help message
  status            - Show server status
  routes            - List all registered routes
  plugins           - List loaded plugins
  config [section]  - Show configuration
  logs [count]      - Show recent log entries
  memory            - Show memory usage
  providers         - List provider status
  cache             - Show cache statistics
  test <provider>   - Test a provider with sample request
  clear             - Clear console
  exit/quit         - Exit debugger
    `);
  }

  private async showStatus(): Promise<void> {
    const status = {
      server: {
        listening: this.server.server.listening,
        address: this.server.server.address()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version
      },
      memory: process.memoryUsage()
    };

    console.log('Server Status:', JSON.stringify(status, null, 2));
  }

  private showRoutes(): void {
    console.log('\nRegistered Routes:');
    const routes = this.server.printRoutes({ commonPrefix: false });
    console.log(routes);
  }

  private async showPlugins(): Promise<void> {
    // This would integrate with the plugin manager
    console.log('\nLoaded Plugins:');
    console.log('(Plugin system integration needed)');
  }

  private showConfig(section?: string): void {
    // Show configuration based on section
    console.log('Configuration:');
    console.log('(Configuration display implementation needed)');
  }

  private showLogs(count: number): void {
    // Show recent log entries
    console.log(`\nRecent Log Entries (last ${count}):`);
    console.log('(Log history implementation needed)');
  }

  private showMemoryUsage(): void {
    const usage = process.memoryUsage();
    console.log('\nMemory Usage:');
    console.log(`  RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  External: ${(usage.external / 1024 / 1024).toFixed(2)} MB`);
  }

  private async showProviders(): Promise<void> {
    console.log('\nProvider Status:');
    console.log('(Provider manager integration needed)');
  }

  private async showCacheStats(): Promise<void> {
    console.log('\nCache Statistics:');
    console.log('(Cache manager integration needed)');
  }

  private async testProvider(provider: string, message: string): Promise<void> {
    if (!provider || !message) {
      console.log('Usage: test <provider> <message>');
      return;
    }

    console.log(`Testing provider ${provider} with message: "${message}"`);
    console.log('(Provider test implementation needed)');
  }

  private cleanup(): void {
    if (this.readline) {
      this.readline.close();
    }
  }
}

interface DebugSession {
  id: string;
  startTime: Date;
  commands: string[];
  state: Record<string, any>;
}
```

## Code Quality Guidelines

### Coding Standards

```typescript
// Code quality examples and patterns

// ✅ Good: Clear, type-safe function with proper error handling
export async function processProviderRequest<T>(
  request: RouterRequest,
  provider: Provider,
  context: RequestContext
): Promise<ProviderResponse<T>> {
  const logger = context.logger.child({
    provider: provider.name,
    requestId: request.sessionId
  });

  try {
    logger.debug('Processing provider request', {
      model: request.body.model,
      messageCount: request.body.messages.length
    });

    const transformedRequest = provider.transformRequest(request);
    const validation = await validateRequest(transformedRequest);

    if (!validation.isValid) {
      throw new ValidationError('Request validation failed', validation.errors);
    }

    const response = await provider.sendRequest(transformedRequest);
    return provider.transformResponse(response);

  } catch (error) {
    logger.error('Provider request failed', { error });
    throw new ProviderError(
      `Request to ${provider.name} failed: ${error.message}`,
      provider.name,
      error as Error
    );
  }
}

// ❌ Bad: Unclear function with any types and poor error handling
export async function doStuff(req: any, prov: any): Promise<any> {
  try {
    const resp = await prov.send(req);
    return resp;
  } catch (e) {
    console.log('Error:', e);
    return null;
  }
}

// ✅ Good: Proper class design with clear responsibilities
export class TypeSafeRouter implements IRouter {
  private readonly providers = new Map<string, Provider>();
  private readonly strategy: RoutingStrategy;
  private readonly logger: winston.Logger;

  constructor(
    strategy: RoutingStrategy,
    logger: winston.Logger
  ) {
    this.strategy = strategy;
    this.logger = logger.child({ component: 'router' });
  }

  async route(context: RoutingContext): Promise<RoutingDecision> {
    const features = this.extractFeatures(context);
    const candidates = this.getCandidates(features);

    if (candidates.length === 0) {
      throw new NoViableProviderError('No providers match the request requirements');
    }

    return this.strategy.selectProvider(candidates, features);
  }

  private extractFeatures(context: RoutingContext): RoutingFeatures {
    // Implementation with proper typing
  }

  private getCandidates(features: RoutingFeatures): Provider[] {
    // Implementation with proper filtering
  }
}

// ❌ Bad: Poor class design with mixed responsibilities
export class BadRouter {
  constructor(private stuff: any) {}

  async route(req: any): Promise<any> {
    // Mixed concerns: routing, logging, error handling, validation all in one method
    console.log('Routing request');
    if (!req.model) return null;

    try {
      const result = await this.stuff.process(req);
      if (result.error) {
        console.error('Error:', result.error);
        return { error: 'Something went wrong' };
      }
      return result;
    } catch (e) {
      return null;
    }
  }
}
```

### Testing Guidelines

```typescript
// Testing best practices

// ✅ Good: Comprehensive test with proper setup and assertions
describe('TypeSafeRouter', () => {
  let router: TypeSafeRouter;
  let mockStrategy: jest.Mocked<RoutingStrategy>;
  let mockLogger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    mockStrategy = createMockRoutingStrategy();
    mockLogger = createMockLogger();
    router = new TypeSafeRouter(mockStrategy, mockLogger);
  });

  describe('route', () => {
    it('should return routing decision for valid request', async () => {
      // Arrange
      const context = createMockRoutingContext({
        body: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello', timestamp: new Date() }]
        }
      });

      const expectedDecision: RoutingDecision = {
        provider: 'openai',
        model: 'gpt-4',
        confidence: 0.9,
        reasoning: 'Best match for general conversation',
        fallbacks: ['anthropic']
      };

      mockStrategy.selectProvider.mockResolvedValue(expectedDecision);

      // Act
      const result = await router.route(context);

      // Assert
      expect(result).toEqual(expectedDecision);
      expect(mockStrategy.selectProvider).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          tokenCount: expect.any(Number),
          contentType: expect.any(String)
        })
      );
    });

    it('should throw NoViableProviderError when no providers match', async () => {
      // Arrange
      const context = createMockRoutingContext({
        body: {
          model: 'unsupported-model',
          messages: [{ role: 'user', content: 'Hello', timestamp: new Date() }]
        }
      });

      // Mock no viable providers
      jest.spyOn(router as any, 'getCandidates').mockReturnValue([]);

      // Act & Assert
      await expect(router.route(context)).rejects.toThrow(NoViableProviderError);
    });

    it('should handle routing strategy errors gracefully', async () => {
      // Arrange
      const context = createMockRoutingContext();
      const strategyError = new Error('Strategy failed');

      mockStrategy.selectProvider.mockRejectedValue(strategyError);

      // Act & Assert
      await expect(router.route(context)).rejects.toThrow('Strategy failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Routing failed',
        expect.objectContaining({ error: strategyError })
      );
    });
  });
});

// ❌ Bad: Incomplete test with poor structure
describe('Router', () => {
  it('should work', async () => {
    const router = new Router();
    const result = await router.route({ model: 'gpt-4' });
    expect(result).toBeTruthy();
  });
});
```

## Contribution Guidelines

### Git Workflow

```bash
# Feature development workflow
git checkout -b feature/intelligent-caching
git commit -m "feat: implement intelligent caching layer

- Add multi-level cache with L1/L2 architecture
- Implement adaptive TTL calculation
- Add cache statistics and monitoring
- Include comprehensive tests

Closes #123"

# Push and create PR
git push origin feature/intelligent-caching
gh pr create --title "Implement intelligent caching layer" --body "..."

# Code review and merge
# After approval, squash and merge
```

### Commit Message Convention

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code
- refactor: A code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools

Examples:
feat(router): implement ML-based provider selection
fix(cache): resolve memory leak in L1 cache cleanup
docs(api): add comprehensive plugin development guide
perf(http): optimize connection pooling for high throughput
```

### Pull Request Template

```markdown
# Pull Request

## Description
Brief description of the changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Performance tests added/updated
- [ ] All tests pass locally

## Code Quality
- [ ] Self-review completed
- [ ] Code follows style guidelines
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling implemented
- [ ] Logging added where appropriate

## Documentation
- [ ] Code comments added/updated
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Migration guide updated if breaking changes

## Performance Impact
- [ ] No performance impact
- [ ] Performance improvement (include benchmarks)
- [ ] Minor performance impact (acceptable)
- [ ] Significant performance impact (requires discussion)

## Security Considerations
- [ ] No security implications
- [ ] Security review completed
- [ ] Secrets handling verified
- [ ] Input validation implemented

## Breaking Changes
List any breaking changes and migration steps required.

## Additional Context
Add any other context about the pull request here.
```

This developer guide provides a comprehensive foundation for working with the enhanced Claude Code Router. It covers the modern development environment, plugin system, debugging tools, and quality guidelines that will enable effective development of the enhancement features.