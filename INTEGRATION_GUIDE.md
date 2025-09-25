# 🏗️ Claude Code Router Integration Guide

## Step 1: Start the Router Service

First, ensure your Claude Code Router is running:

```bash
# Start the service
ccr start

# Verify it's running
ccr status
```

Expected output: `✅ Status: Running (PID: XXXX) on http://127.0.0.1:3456`

## Step 2: Configure Your Development Environment

### Option A: Global Setup (Recommended)
Set environment variables in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Add to your shell profile
export CLAUDE_API_BASE_URL="http://127.0.0.1:3456"
export CLAUDE_API_KEY="ccr-api-key"
```

### Option B: Project-Specific Setup
Create a `.env` file in your project root:

```bash
# .env file in your project
CLAUDE_API_BASE_URL=http://127.0.0.1:3456
CLAUDE_API_KEY=ccr-api-key
```

## Step 3: Navigate to Your Project

```bash
cd /path/to/your/project
```

## Step 4: Initialize Claude Code in Your Project

### Create Project-Specific CLAUDE.md
Create a `CLAUDE.md` file in your project root to guide Claude's behavior:

```bash
# Example CLAUDE.md for a React project
cat > CLAUDE.md << 'EOF'
# Project: My React App

## Tech Stack
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Jest for testing

## Key Commands
- **Start dev server**: `npm run dev`
- **Build**: `npm run build`
- **Test**: `npm test`
- **Lint**: `npm run lint`
- **Type check**: `npm run type-check`

## Architecture Notes
- Components in `src/components/`
- Utilities in `src/utils/`
- Types in `src/types/`
- Follow existing code patterns and naming conventions
EOF
```

## Step 5: Start Coding with Claude

### Method 1: Direct Claude Code Command
```bash
# Use the ccr wrapper
ccr code "Help me refactor this authentication component"

# Or use Claude directly (if CLAUDE_API_BASE_URL is set)
claude "Add TypeScript interfaces for my API responses"
```

### Method 2: Interactive Session
```bash
# Start an interactive Claude session
ccr code
# Then type your requests interactively
```

## Step 6: Understand Model Routing

Your requests will be automatically routed based on context:

- **General coding tasks** → `danielsheep/gpt-oss-20b-Unsloth:latest`
- **Background/agent tasks** → `qwen2.5-coder:latest`
- **Complex reasoning** → `danielsheep/gpt-oss-20b-Unsloth:latest`
- **Long context (>60K tokens)** → `danielsheep/gpt-oss-20b-Unsloth:latest`
- **Web search needs** → `danielsheep/gpt-oss-20b-Unsloth:latest`

## Step 7: Best Practices & Workflows

### Development Workflow Example
```bash
# 1. Start your dev environment
npm run dev

# 2. Start coding session
ccr code

# Example interactions:
# "Analyze my React component structure and suggest improvements"
# "Add error handling to my API client"
# "Write unit tests for my authentication utils"
# "Refactor this component to use TypeScript generics"
```

### Common Use Cases

**🔧 Code Review & Refactoring**
```bash
ccr code "Review my authentication service and suggest security improvements"
```

**🧪 Testing**
```bash
ccr code "Write comprehensive Jest tests for my user registration flow"
```

**🎨 UI Development**
```bash
ccr code "Help me build a responsive dashboard component with Tailwind CSS"
```

**🐛 Debugging**
```bash
ccr code "Help me debug this async/await issue in my data fetcher"
```

## Step 8: Monitor & Optimize

### Check Router Health
```bash
# Monitor your local models
npm run health-check

# Check system performance
npm run monitor
```

### View Logs
```bash
# Check router logs
tail -f ~/.claude-code-router/logs/ccr-*.log
```

## Step 9: Advanced Configuration

### Project-Specific Model Preferences
Your system has intelligent routing that considers:
- **Cost optimization** (prefers local models)
- **Complexity analysis** (routes complex tasks to appropriate models)
- **Project context** (can detect project types)
- **Performance requirements**

### Custom Routing Example
The custom router at `~/.claude-code-router/custom-router.js` provides:
- Cost-aware routing
- Performance-based selection
- Context-sensitive model choice
- Intelligent fallback chains

## Step 10: Troubleshooting

### Common Issues

**Service Not Starting**
```bash
# Check logs
tail ~/.claude-code-router/logs/ccr-*.log

# Restart service
ccr restart
```

**Model Not Responding**
```bash
# Check Ollama status
ollama list
ollama serve  # if not running

# Health check
npm run health-check
```

**Routing Issues**
```bash
# Check custom router logs
tail -f ~/.claude-code-router/logs/ccr-*.log | grep "Router"
```

## 🎯 Quick Start Checklist

- [ ] **Step 1**: `ccr start` - Start the router service
- [ ] **Step 2**: Set `CLAUDE_API_BASE_URL=http://127.0.0.1:3456`
- [ ] **Step 3**: `cd /your/project` - Navigate to your project
- [ ] **Step 4**: Create project `CLAUDE.md` with tech stack info
- [ ] **Step 5**: `ccr code "your request"` - Start coding!

## 💡 Pro Tips

1. **Cost Efficiency**: Your setup prioritizes the free local `danielsheep/gpt-oss-20b-Unsloth:latest` model
2. **Fallback Safety**: If local models fail, it automatically falls back to cloud providers
3. **Context Awareness**: The router automatically detects coding vs reasoning vs long-context needs
4. **Project Intelligence**: Custom router analyzes your project structure for optimal routing

## 🚀 Architecture Benefits

Your Claude Code Router is now configured as a smart proxy that provides:

- **🆓 Cost savings** through local model preference
- **⚡ Performance** with intelligent routing
- **🔄 Reliability** via robust fallback chains
- **🎯 Context awareness** for optimal model selection

## Configuration Summary

**Primary Model**: `danielsheep/gpt-oss-20b-Unsloth:latest` (local, free)
**Coding Tasks**: `qwen2.5-coder:latest` (specialized for development)
**Fallback Chain**: Multiple cloud providers available
**Router Port**: `127.0.0.1:3456`
**API Key**: `ccr-api-key`

Ready to code! 🚀