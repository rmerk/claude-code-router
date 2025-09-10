// Transformer-specific type definitions

import { HttpRequest, HttpResponse, OllamaRequest, OllamaResponse, ChatRequest, ChatResponse } from './index';

export interface Transformer {
  name: string;
  endpoint?: string;
  transformRequest: (req: HttpRequest) => HttpRequest;
  transformResponse: (response: HttpResponse, originalReq: HttpRequest) => HttpResponse;
}

export interface OllamaTransformer extends Transformer {
  name: 'ollama';
  endpoint: '/api/chat';
  transformRequest: (req: HttpRequest) => HttpRequest;
  transformResponse: (response: HttpResponse, originalReq: HttpRequest) => HttpResponse;
}

export interface TransformerModule {
  name: string;
  endpoint?: string;
  transformRequest?: (req: HttpRequest) => HttpRequest;
  transformResponse?: (response: HttpResponse, originalReq: HttpRequest) => HttpResponse;
}

// Type guards for transformer responses
export function isOllamaResponse(obj: any): obj is OllamaResponse {
  return obj && typeof obj === 'object' && 'model' in obj;
}

export function isStreamingResponse(response: HttpResponse): boolean {
  const contentType = response.headers?.['content-type'] || '';
  return contentType.includes('text/event-stream') || contentType.includes('text/plain');
}

// Utility types for transformer implementations
export interface TransformContext {
  originalRequest: HttpRequest;
  transformedRequest: HttpRequest;
  response: HttpResponse;
  startTime: number;
}

export interface TransformResult {
  success: boolean;
  transformedResponse: HttpResponse;
  duration: number;
  errors?: string[];
}
