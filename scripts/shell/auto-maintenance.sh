#!/bin/bash

# Ollama Model Auto-Maintenance Script
# Run this script periodically (e.g., weekly) to maintain Ollama models

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$HOME/.ollama/maintenance.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo -e "$2$1${NC}"
}

# Error handling
error_exit() {
    log "ERROR: $1" "$RED"
    exit 1
}

# Check if Ollama is running
check_ollama() {
    if ! command -v ollama &> /dev/null; then
        error_exit "Ollama is not installed"
    fi

    if ! pgrep -x "ollama" > /dev/null; then
        log "Starting Ollama service..." "$BLUE"
        ollama serve &
        sleep 5
    fi

    if ! ollama list &> /dev/null; then
        error_exit "Cannot connect to Ollama"
    fi

    log "Ollama is running and accessible" "$GREEN"
}

# Update required models
update_models() {
    log "Checking for model updates..." "$BLUE"

    # Required models for the router
    REQUIRED_MODELS=("llama3.2:latest" "qwen2.5-coder:latest")

    for model in "${REQUIRED_MODELS[@]}"; do
        if ollama list | grep -q "$model"; then
            log "Model $model is already installed" "$GREEN"
        else
            log "Pulling model: $model" "$YELLOW"
            if ollama pull "$model"; then
                log "Successfully pulled $model" "$GREEN"
            else
                log "Failed to pull $model" "$RED"
            fi
        fi
    done
}

# Clean up old models and free disk space
cleanup_models() {
    log "Checking disk usage..." "$BLUE"

    # Get Ollama models directory
    OLLAMA_MODELS_DIR="$HOME/.ollama/models"

    if [ -d "$OLLAMA_MODELS_DIR" ]; then
        # Calculate disk usage in GB
        DISK_USAGE=$(du -sb "$OLLAMA_MODELS_DIR" 2>/dev/null | awk '{print int($1/1024/1024/1024)}')

        log "Current disk usage: ${DISK_USAGE}GB" "$BLUE"

        # If usage exceeds 30GB, remove optional models
        if [ "$DISK_USAGE" -gt 30 ]; then
            log "Disk usage high, cleaning up optional models..." "$YELLOW"

            OPTIONAL_MODELS=("deepseek-coder-v2:latest")

            for model in "${OPTIONAL_MODELS[@]}"; do
                if ollama list | grep -q "$model"; then
                    log "Removing optional model: $model" "$YELLOW"
                    ollama rm "$model"
                fi
            done
        fi
    fi
}

# Health check
health_check() {
    log "Running health check..." "$BLUE"

    # Test basic functionality
    if timeout 10s ollama run llama3.2:latest "Hello" --format json &> /dev/null; then
        log "Health check passed" "$GREEN"
    else
        log "Health check failed" "$RED"
    fi
}

# Performance test
performance_test() {
    log "Running quick performance test..." "$BLUE"

    # Simple performance measurement
    local start_time=$(date +%s%3N)
    if timeout 30s ollama run llama3.2:latest "Write a short hello world program in Python" --format json &> /dev/null; then
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        log "Performance test completed in ${duration}ms" "$GREEN"
    else
        log "Performance test failed or timed out" "$RED"
    fi
}

# Backup models (optional)
backup_models() {
    log "Creating model backup..." "$BLUE"

    BACKUP_DIR="$HOME/.ollama/backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

    mkdir -p "$BACKUP_DIR"

    if [ -d "$HOME/.ollama/models" ]; then
        if cp -r "$HOME/.ollama/models" "$BACKUP_PATH" 2>/dev/null; then
            log "Backup created: $BACKUP_PATH" "$GREEN"

            # Clean old backups (keep last 3)
            cd "$BACKUP_DIR" || exit
            ls -t backup_* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null
        else
            log "Backup failed" "$RED"
        fi
    else
        log "No models directory to backup" "$YELLOW"
    fi
}

# Main maintenance routine
main() {
    log "=== Starting Ollama Auto-Maintenance ===" "$BLUE"

    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"

    # Run maintenance tasks
    check_ollama
    update_models
    cleanup_models
    health_check
    performance_test
    backup_models

    log "=== Maintenance completed ===" "$GREEN"

    # Show recent log entries
    echo ""
    echo "Recent log entries:"
    tail -10 "$LOG_FILE"
}

# Allow running specific functions
case "$1" in
    "check")
        check_ollama
        ;;
    "update")
        update_models
        ;;
    "cleanup")
        cleanup_models
        ;;
    "health")
        health_check
        ;;
    "backup")
        backup_models
        ;;
    *)
        main
        ;;
esac
