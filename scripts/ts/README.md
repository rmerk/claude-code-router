# TypeScript Scripts Directory

This directory contains TypeScript scripts (`.ts`) for the Claude Code Router project. These scripts handle build processes, monitoring, model management, and other development tasks.

## Scripts Overview

### Build Scripts
- **`build.ts`** - Main build script for the entire project
  - Compiles TypeScript files
  - Builds CLI application
  - Builds UI components
  - Copies assets and transformers

### Monitoring & Health Scripts
- **`health-check.ts`** - Comprehensive provider connectivity and model availability testing
  - Tests API endpoints for all configured providers
  - Validates model availability
  - Measures response latency
  - Generates health reports

- **`monitoring.ts`** - Performance metrics collection and reporting
  - Real-time system monitoring
  - Performance data collection
  - Generates monitoring reports
  - Supports various output formats

### Model Management Scripts
- **`model-manager.ts`** - Ollama model management and automated updates
  - Manages local Ollama models
  - Handles model updates and cleanup
  - Optimizes model storage
  - Provides model usage statistics

### Proxy Scripts
- **`ollama-proxy.ts`** - Ollama proxy server for API compatibility
  - Converts between OpenAI and Ollama APIs
  - Handles streaming responses
  - Manages model routing
  - Provides unified API interface

## Usage

### Via npm scripts (recommended)
```bash
# Build the project
npm run build

# Health check
npm run health-check

# Monitoring
npm run monitor

# Model management
npm run model-manager

# Ollama proxy
npm run ollama-proxy
```

### Direct execution
```bash
# Build the project
tsx scripts/ts/build.ts

# Health check
tsx scripts/ts/health-check.ts

# Monitoring
tsx scripts/ts/monitoring.ts

# Model management
tsx scripts/ts/model-manager.ts

# Ollama proxy
tsx scripts/ts/ollama-proxy.ts
```

## Requirements

- Node.js (v18 or higher)
- TypeScript execution environment (tsx recommended)
- Project dependencies installed (`npm install`)
- Proper configuration files

## Development Notes

- Scripts use ES modules and modern JavaScript features
- Type safety is enforced with TypeScript
- Error handling and logging are built into all scripts
- Scripts support command-line arguments and configuration files
- All scripts include help text and usage information
