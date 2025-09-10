// Core type definitions for Claude Code Router

export interface Config {
  LOG?: boolean;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  Router?: RouterConfig;
  Providers?: Provider[];
  [key: string]: any;
}

export interface RouterConfig {
  default?: string;
  background?: string;
  think?: string;
  [key: string]: string | undefined;
}

export interface Provider {
  name: string;
  api_base_url: string;
  models: string[];
  api_key?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  [key: string]: any;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Tool[];
  [key: string]: any;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: Usage;
}

export interface ChatChoice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface StreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
}

export interface StreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
    tool_calls?: ToolCall[];
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

// Router function type
export type RouterFunction = (req: any, config: Config) => Promise<string> | string;

// Transformer types
export interface Transformer {
  name: string;
  endpoint?: string;
  transformRequest?: (req: any) => any;
  transformResponse?: (response: any, req: any) => any;
}

// Test types
export interface TestCase {
  query: string;
  expectedCategory: string;
}

export interface TestResult {
  routing: string;
  category: string;
  score: number;
}

export interface TestSummary {
  passed: number;
  failed: number;
  total: number;
}

// Build and script types
export interface BuildOptions {
  watch?: boolean;
  minify?: boolean;
  sourcemap?: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration?: number;
}

// Ollama specific types
export interface OllamaRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  tools?: Tool[];
  [key: string]: any; // Allow additional properties
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done?: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Express/Fastify request/response types
export interface HttpRequest {
  body: any;
  headers: Record<string, string>;
  method: string;
  url: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface HttpResponse {
  status: (code: number) => HttpResponse;
  json: (data: any) => void;
  send: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  write: (chunk: string) => void;
  end: () => void;
  headers?: Record<string, string>;
}

// Performance test types
export interface PerformanceResult {
  testName: string;
  duration: number;
  requestsPerSecond: number;
  averageLatency: number;
  p95Latency: number;
  errorRate: number;
  timestamp: number;
}

export interface PerformanceOptions {
  duration: number;
  concurrency: number;
  model: string;
  prompt: string;
  maxTokens: number;
}
