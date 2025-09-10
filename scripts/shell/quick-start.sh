#!/bin/bash

# Claude Code Router Quick Start Script

echo "🚀 Claude Code Router Quick Start"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "dist/cli.js" ]; then
    echo "❌ Error: dist/cli.js not found. Please run 'npm run build' first."
    exit 1
fi

# Create config directory if it doesn't exist
if [ ! -d "$HOME/.claude-code-router" ]; then
    echo "📁 Creating configuration directory..."
    mkdir -p "$HOME/.claude-code-router"
fi

# Check if config.json exists
if [ ! -f "$HOME/.claude-code-router/config.json" ]; then
    echo "⚠️  Configuration file not found. Please create ~/.claude-code-router/config.json"
    echo "   See SETUP_GUIDE.md for configuration examples."
    exit 1
fi

# Check if .env file exists
if [ ! -f "$HOME/.claude-code-router/.env" ]; then
    echo "⚠️  Environment file not found."
    echo ""
    echo "🔧 Run the setup script to create your .env file:"
    echo "   ./setup-env.sh"
    echo ""
    echo "   Or manually create it:"
    echo "   cp ~/.claude-code-router/env-template.txt ~/.claude-code-router/.env"
    echo "   # Then edit .env with your API keys"
    exit 1
fi

# Validate .env file has actual API keys (not placeholders)
echo "🔍 Validating API keys..."
MISSING_KEYS=()
if grep -q "your_openai_api_key_here" "$HOME/.claude-code-router/.env"; then
    MISSING_KEYS+=("OPENAI_API_KEY")
fi
if grep -q "your_deepseek_api_key_here" "$HOME/.claude-code-router/.env"; then
    MISSING_KEYS+=("DEEPSEEK_API_KEY")
fi
if grep -q "your_anthropic_api_key_here" "$HOME/.claude-code-router/.env"; then
    MISSING_KEYS+=("ANTHROPIC_API_KEY")
fi
if grep -q "your_groq_api_key_here" "$HOME/.claude-code-router/.env"; then
    MISSING_KEYS+=("GROQ_API_KEY")
fi

if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
    echo "⚠️  The following API keys need to be configured:"
    for key in "${MISSING_KEYS[@]}"; do
        echo "   • $key"
    done
    echo ""
    echo "📝 Edit your .env file:"
    echo "   nano $HOME/.claude-code-router/.env"
    echo ""
    echo "💡 You can get API keys from:"
    echo "   • OpenAI: https://platform.openai.com/api-keys"
    echo "   • DeepSeek: https://platform.deepseek.com/api-keys"
    echo "   • Anthropic: https://console.anthropic.com/settings/keys"
    echo "   • Groq: https://console.groq.com/keys"
    echo ""
    echo "⚠️  Continuing with placeholder keys may cause routing failures."
    echo "   Press Ctrl+C to cancel, or wait 10 seconds to continue anyway..."
    sleep 10
fi

echo "✅ Configuration files validated"

# Stop any existing server
echo "🛑 Stopping any existing server..."
node dist/cli.js stop 2>/dev/null || true

# Start the server
echo "🚀 Starting Claude Code Router server..."
node dist/cli.js start

# Wait a moment for server to start
sleep 3

# Check if server is running
if node dist/cli.js status >/dev/null 2>&1; then
    echo "✅ Server started successfully!"
    echo ""

    # Run health check if available
    if [ -f "health-check.js" ]; then
        echo "🔍 Running provider health check..."
        node health-check.js
    fi

    echo ""
    echo "🌐 Server is running at: http://127.0.0.1:3456"
    echo "🖥️  Web UI available at: http://127.0.0.1:3456"
    echo ""
    echo "📋 Available commands:"
    echo "   • Stop server: node dist/cli.js stop"
    echo "   • Check status: node dist/cli.js status"
    echo "   • Run health check: node health-check.js"
    echo "   • Open web UI: node dist/cli.js ui"
    echo ""
    echo "🚀 To use with Claude Code:"
    echo "   export ANTHROPIC_BASE_URL=http://127.0.0.1:3456"
    echo "   claude \"Your prompt here\""
else
    echo "❌ Server failed to start. Check logs in ~/.claude-code-router/logs/"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "   1. Check logs: tail -20 ~/.claude-code-router/logs/ccr-*.log"
    echo "   2. Verify API keys in .env file"
    echo "   3. Run health check: node health-check.js"
    echo "   4. Ensure Ollama is running (if using local models)"
    exit 1
fi
