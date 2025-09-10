#!/usr/bin/env node

/**
 * Ollama Proxy for Claude Code Router
 * Converts between OpenAI chat format and Ollama's generate/chat format
 */

import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions for Ollama proxy
interface OllamaRequest {
  model: string;
  prompt?: string;
  messages?: Array<{
    role: string;
    content: string;
  }>;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  [key: string]: any;
}

interface OllamaResponse {
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
  [key: string]: any;
}

interface OllamaProxyError extends Error {
  statusCode?: number;
  responseData?: any;
}

class OllamaProxy {
  private port: number;
  private ollamaHost: string;
  private ollamaPort: number;
  constructor(port = 11435) {
    this.port = port;
    this.ollamaHost = 'localhost';
    this.ollamaPort = 11434;
  }

  start() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, () => {
      console.log(`🚀 Ollama Proxy running on http://localhost:${this.port}`);
      console.log(`🔗 Proxying to Ollama at http://${this.ollamaHost}:${this.ollamaPort}`);
    });
  }

  async handleRequest(req, res) {
    try {
      // Only handle chat completions requests
      if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        await this.handleChatCompletion(req, res);
      } else {
        // For other requests, proxy them through unchanged
        await this.proxyRequest(req, res);
      }
    } catch (error) {
      console.error('Proxy error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', message: error.message }));
    }
  }

  async handleChatCompletion(req, res) {
    // Read the OpenAI-style request
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const openaiRequest = JSON.parse(body);

        // Convert OpenAI format to Ollama format
        const ollamaRequest = this.convertOpenAIToOllama(openaiRequest);

        // Send request to Ollama
        const ollamaResponse = await this.callOllama(ollamaRequest);

        // Convert Ollama response back to OpenAI format
        const openaiResponse = this.convertOllamaToOpenAI(ollamaResponse, openaiRequest);

        // Send response back to client
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(openaiResponse));

    } catch (error) {
      console.error('Chat completion error:', error);

      // Convert to OpenAI-compatible error format
      const proxyError = error as OllamaProxyError;
      const openaiError = {
        error: {
          message: proxyError.message,
          type: proxyError.statusCode === 400 ? 'invalid_request_error' : 'internal_error',
          code: proxyError.statusCode || 500
        }
      };

      const statusCode = proxyError.statusCode || 500;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(openaiError));
    }
    });
  }

  convertOpenAIToOllama(openaiRequest) {
    // Extract model name (remove provider prefix if present)
    const model = openaiRequest.model.replace(/^ollama,/, '');

    // Convert messages to prompt
    const prompt = openaiRequest.messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        num_predict: openaiRequest.max_tokens || 100,
        temperature: openaiRequest.temperature || 0.7,
        top_p: openaiRequest.top_p || 0.9
      }
    };
  }

  convertOllamaToOpenAI(ollamaResponse, originalRequest) {
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: originalRequest.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: ollamaResponse.response || ''
        },
        finish_reason: ollamaResponse.done_reason || 'stop'
      }],
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count || 0,
        completion_tokens: ollamaResponse.eval_count || 0,
        total_tokens: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0)
      }
    };
  }

  async callOllama(requestData, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestData);
      const options = {
        hostname: this.ollamaHost,
        port: this.ollamaPort,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000 // 30 second timeout
      };

      const client = http;
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const response = JSON.parse(data);

              // Check if Ollama returned an error in the response body
              if (response.error) {
                const error = new Error(`Ollama model error: ${response.error}`) as OllamaProxyError;
                error.statusCode = 400; // Bad request for model errors
                error.responseData = response;
                reject(error);
                return;
              }

              resolve(response);
            } else {
              const error = new Error(`Ollama API error: ${res.statusCode}`) as OllamaProxyError;
              error.statusCode = res.statusCode;
              error.responseData = data;
              reject(error);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', async (error) => {
        console.log(`Ollama request failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);

        // Implement exponential backoff for retries
        if (retryCount < maxRetries && this.shouldRetry(error)) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Retrying in ${delay}ms...`);

          setTimeout(() => {
            this.callOllama(requestData, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          reject(error);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        const error = new Error('Ollama request timeout') as Error & { code: string };
        error.code = 'TIMEOUT';

        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Request timeout, retrying in ${delay}ms...`);

          setTimeout(() => {
            this.callOllama(requestData, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          reject(error);
        }
      });

      req.write(postData);
      req.end();
    });
  }

  shouldRetry(error) {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'TIMEOUT') {
      return true;
    }
    const proxyError = error as OllamaProxyError;
    if (proxyError.statusCode && proxyError.statusCode >= 500) {
      return true;
    }
    return false;
  }

  async proxyRequest(req, res) {
    // For non-chat requests, proxy through to Ollama unchanged
    const options = {
      hostname: this.ollamaHost,
      port: this.ollamaPort,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const client = http;
    const proxyReq = client.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error);
      res.writeHead(500);
      res.end('Proxy error');
    });

    req.pipe(proxyReq);
  }
}

// Start the proxy if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const proxy = new OllamaProxy();
  proxy.start();
}

export default OllamaProxy;
