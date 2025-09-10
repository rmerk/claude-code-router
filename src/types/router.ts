// Router-specific type definitions

import { Config, Message, HttpRequest, HttpResponse } from './index';

export interface RouterContext {
  config: Config;
  req: HttpRequest;
  res: HttpResponse;
}

export interface RoutingDecision {
  provider: string;
  model: string;
  reason?: string;
}

export interface RouterMiddleware {
  name: string;
  priority: number;
  process: (context: RouterContext) => Promise<RoutingDecision | null>;
}

export interface QueryAnalysis {
  category: QueryCategory;
  complexity: QueryComplexity;
  keywords: string[];
  confidence: number;
}

export type QueryCategory =
  | 'coding'
  | 'reasoning'
  | 'creative'
  | 'technical'
  | 'scientific'
  | 'simple'
  | 'unknown';

export type QueryComplexity =
  | 'simple'
  | 'medium'
  | 'complex'
  | 'expert';

export interface RoutingRule {
  condition: (analysis: QueryAnalysis, context: RouterContext) => boolean;
  action: (analysis: QueryAnalysis, context: RouterContext) => RoutingDecision;
  priority: number;
  name: string;
}

// Legacy router function type (for backward compatibility)
export type LegacyRouterFunction = (req: HttpRequest, config: Config) => Promise<string> | string;
