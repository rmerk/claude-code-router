#!/bin/bash

# Claude Code Router Environment Setup Script
# This script helps create the .env file with proper API key configuration

echo "🔐 Claude Code Router Environment Setup"
echo "========================================"

ENV_FILE="$HOME/.claude-code-router/.env"
TEMPLATE_FILE="$HOME/.claude-code-router/env-template.txt"

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env file already exists at $ENV_FILE"
    echo "   Do you want to overwrite it? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "   Keeping existing .env file"
        exit 0
    fi
fi

# Copy template to .env
if [ -f "$TEMPLATE_FILE" ]; then
    cp "$TEMPLATE_FILE" "$ENV_FILE"
    echo "✅ Created .env file from template"
else
    # Create .env file from scratch if template doesn't exist
    cat > "$ENV_FILE" << 'EOF'
# Claude Code Router Environment Variables
# Fill in your API keys below. Required keys are marked with [REQUIRED]
# Optional keys are marked with [OPTIONAL]

# [REQUIRED] OpenAI API Key - Used for GPT-4, GPT-4 Turbo models
OPENAI_API_KEY=your_openai_api_key_here

# [REQUIRED] DeepSeek API Key - Used for DeepSeek reasoning and chat models
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# [REQUIRED] Anthropic API Key - Used for Claude models
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# [REQUIRED] Groq API Key - Used for fast Llama models
GROQ_API_KEY=your_groq_api_key_here

# [OPTIONAL] Additional provider keys
# GOOGLE_API_KEY=your_google_api_key_here
# OPENROUTER_API_KEY=your_openrouter_api_key_here
# SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# [OPTIONAL] Proxy settings (if needed behind corporate firewall)
# HTTP_PROXY=http://proxy.company.com:8080
# HTTPS_PROXY=http://proxy.company.com:8080

# [OPTIONAL] Custom logging level (DEBUG, INFO, WARN, ERROR)
# LOG_LEVEL=INFO
EOF
    echo "✅ Created new .env file with template"
fi

echo ""
echo "📝 Next steps:"
echo "1. Edit your .env file: $ENV_FILE"
echo "2. Replace placeholder values with your actual API keys"
echo "3. Remove the '#' from optional lines you want to use"
echo ""
echo "Example:"
echo "   nano $ENV_FILE"
echo ""
echo "🚀 Once configured, run: ./quick-start.sh"
