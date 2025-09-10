# Shell Scripts Directory

This directory contains shell scripts (`.sh`) for the Claude Code Router project. These scripts handle setup, configuration, maintenance, and automation tasks.

## Scripts Overview

### Setup Scripts
- **`quick-start.sh`** - Interactive setup script for first-time configuration
  - Validates API keys and configuration
  - Sets up environment files
  - Starts the server with default settings

- **`setup-env.sh`** - Automated environment file creation with API key validation
  - Creates `.env` files with proper structure
  - Validates API key formats
  - Sets secure permissions

- **`setup-cron.sh`** - Cron job setup for automated maintenance tasks
  - Configures scheduled cleanup tasks
  - Sets up log rotation
  - Enables automated health checks

### Maintenance Scripts
- **`auto-maintenance.sh`** - Automated system maintenance and cleanup
  - Cleans up old log files
  - Removes temporary files
  - Optimizes performance
  - Updates dependencies

## Usage

### Via npm scripts (recommended)
```bash
# Quick setup
npm run setup

# Environment setup
npm run setup:env

# Cron setup
npm run setup:cron

# Maintenance
npm run maintenance
```

### Direct execution
```bash
# Quick setup
./scripts/shell/quick-start.sh

# Environment setup
./scripts/shell/setup-env.sh

# Cron setup
./scripts/shell/setup-cron.sh

# Maintenance
./scripts/shell/auto-maintenance.sh
```

## Requirements

- Bash shell
- Standard Unix utilities (curl, grep, sed, etc.)
- Proper permissions (scripts should be executable)

## Notes

- All scripts include help text accessible via `--help` flag
- Scripts validate prerequisites before execution
- Error handling is built into all scripts
- Scripts are designed to be idempotent (safe to run multiple times)
