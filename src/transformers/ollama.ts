/**
 * Ollama Transformer for Claude Code Router
 * Converts between OpenAI format and Ollama's API format
 */

import { OllamaTransformer } from '../types/transformer';
import { HttpRequest, HttpResponse, OllamaResponse, ChatResponse, StreamChunk } from '../types/index';

const transformer: OllamaTransformer = {
  name: 'ollama',
  endpoint: '/api/chat',

  // Transform incoming request from OpenAI format to Ollama format
  transformRequest: (req: HttpRequest): HttpRequest => {
    const openaiRequest = req.body;

    // Convert OpenAI chat format to Ollama chat format
    const ollamaRequest: {
      model: any;
      messages: any;
      stream: boolean;
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      tools?: any;
    } = {
      model: openaiRequest.model,
      messages: openaiRequest.messages,
      stream: openaiRequest.stream !== false, // Default to streaming
    };

    // Add optional parameters if present
    if (openaiRequest.max_tokens) {
      ollamaRequest.max_tokens = openaiRequest.max_tokens;
    }

    if (openaiRequest.temperature) {
      ollamaRequest.temperature = openaiRequest.temperature;
    }

    if (openaiRequest.top_p) {
      ollamaRequest.top_p = openaiRequest.top_p;
    }

    // Handle tools/function calling if present
    if (openaiRequest.tools) {
      ollamaRequest.tools = openaiRequest.tools;
    }

    return {
      ...req,
      body: ollamaRequest
    };
  },

  // Transform outgoing response from Ollama format to OpenAI format
  transformResponse: (response: HttpResponse, req: HttpRequest): HttpResponse => {
    // Since HttpResponse doesn't have a body property in the interface,
    // we return the response unchanged. The actual transformation
    // should be handled by the calling code or middleware.
    return response;
  }
};

export default transformer;
