# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Router is a Node.js/TypeScript application that routes Claude Code requests to different LLM providers and models. It acts as a proxy server that transforms requests/responses and provides intelligent routing based on context (background tasks, reasoning, long context, etc.).

## Key Commands

### Development
- **Build project**: `npm run build`
- **Start development (both backend + UI)**: `npm run dev` or `./start-dev.sh`
- **Stop development servers**: `npm run dev:stop` or `./stop-dev.sh`
- **Start backend only**: `npm run dev:backend`
- **Start UI only**: `npm run dev:ui`

### CLI Commands
- **Start router service**: `ccr start`
- **Stop router service**: `ccr stop`
- **Restart router service**: `ccr restart`
- **Check service status**: `ccr status`
- **Open web UI**: `ccr ui`
- **Execute Claude Code**: `ccr code`

### Testing & Utilities
- **Run all tests**: `npm run test`
- **Test routing logic**: `npm run test:routing`
- **Test cost routing**: `npm run test:cost`
- **Test error handling**: `npm run test:error`
- **Health check providers**: `npm run health-check`
- **Performance testing**: `npm run performance`
- **Monitor system**: `npm run monitor`
- **Manage Ollama models**: `npm run model-manager`

### Setup & Maintenance
- **Quick setup**: `npm run setup`
- **Environment setup**: `npm run setup:env`
- **Cron job setup**: `npm run setup:cron`
- **System maintenance**: `npm run maintenance`

## Architecture

### Core Components

- **`src/index.ts`**: Main application entry point and service initialization
- **`src/cli.ts`**: CLI interface for managing the router service
- **`src/server.ts`**: HTTP server setup and custom transformer loading
- **`src/utils/router.ts`**: Core routing logic for model selection
- **`src/middleware/auth.ts`**: API key authentication middleware

### Directory Structure

```
src/
├── agents/             # AI agent implementations (image processing, etc.)
├── middleware/         # HTTP middleware (authentication, etc.)
├── transformers/       # API format transformers for different providers
├── types/             # TypeScript type definitions
└── utils/             # Utility modules
    ├── process/       # Process management (PID, service control)
    ├── streams/       # Stream processing (SSE parsing/serialization)
    ├── system/        # System utilities (logging, status, cleanup)
    ├── CleanupManager.ts  # Centralized cleanup management
    ├── cache.ts       # Request/response caching
    └── codeCommand.ts # Claude Code command execution
```

### Configuration

- **Main config**: `~/.claude-code-router/config.json` (see `ui/config.example.json` for structure)
- **Environment variables**: Supports interpolation using `$VAR_NAME` or `${VAR_NAME}` syntax
- **Custom transformers**: Can be loaded from `transformers/` directory or specified in config
- **Custom routing**: Custom router scripts can be specified via `CUSTOM_ROUTER_PATH`

### Routing Logic

The router automatically selects models based on context:
- **default**: General purpose tasks
- **background**: Background/agent tasks (typically cheaper/local models)
- **think**: Reasoning-heavy tasks (Plan Mode)
- **longContext**: Long context handling (>60K tokens by default)
- **webSearch**: Web search tasks
- **image**: Image processing tasks

### UI Development

The `ui/` directory contains a React/Vite frontend:
- **Tech stack**: React, TypeScript, Tailwind CSS, shadcn-ui
- **Package manager**: pnpm
- **Build target**: Single HTML file output
- **Internationalization**: English/Chinese support via i18next

## Development Notes

### TypeScript Configuration
- Uses ES2022 modules with strict mode disabled
- Source maps enabled for debugging
- Includes all TypeScript files in `src/`, `scripts/`, `tests/`, and `performance/`

### Testing
- Custom test runner in `tests/runner.ts`
- Integration tests for routing, cost optimization, and error handling
- Performance benchmarking in `performance/` directory

### Build Process
- **Main build**: Uses esbuild to bundle CLI entry point
- **TypeScript compilation**: Separate tsc compilation for type checking
- **Asset handling**: Copies tiktoken WASM files to dist

### Service Management
- **PID tracking**: Uses PID files for service management
- **Process monitoring**: Built-in health checks and monitoring
- **Cleanup**: Automated log rotation and cleanup management
- **Background operation**: Supports non-interactive mode for CI/CD

### Ollama Integration
- **Local models**: Full support for Ollama local model serving
- **Model management**: Automated pulling and updating of Ollama models
- **Performance optimization**: Designed for cost-effective local inference

## Environment Variables

Key environment variables that can be interpolated in config:
- Provider API keys (e.g., `OPENAI_API_KEY`, `GEMINI_API_KEY`)
- `CLAUDE_PATH`: Path to Claude CLI executable
- `NON_INTERACTIVE_MODE`: Enable for CI/CD environments
- `PROXY_URL`: HTTP proxy for API requests

## Key Files to Understand

- **Configuration examples**: `ui/config.example.json`
- **Main server logic**: `src/index.ts`
- **Routing implementation**: `src/utils/router.ts`
- **Stream processing**: `src/utils/streams/`
- **Cleanup management**: `src/utils/CleanupManager.ts`
- **Development scripts**: `scripts/ts/` and `scripts/shell/`