#!/bin/bash

# Claude Code Router Development Startup Script
# This script starts both the backend API server and the UI development server

echo "🚀 Starting Claude Code Router Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    local name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $port ($name) is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port ($name) is available${NC}"
        return 0
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${BLUE}⏳ Waiting for $service_name to be ready on port $port...${NC}"

    while [ $attempt -le $max_attempts ]; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
            echo -e "${GREEN}✅ $service_name is ready on port $port${NC}"
            return 0
        fi
        echo -e "${BLUE}   Attempt $attempt/$max_attempts...${NC}"
        sleep 1
        ((attempt++))
    done

    echo -e "${RED}❌ $service_name failed to start within expected time${NC}"
    return 1
}

# Check if required files exist
if [ ! -f "dist/cli.js" ]; then
    echo -e "${RED}❌ Backend CLI not found. Please build the project first:${NC}"
    echo "   npm run build"
    exit 1
fi

if [ ! -d "ui" ]; then
    echo -e "${RED}❌ UI directory not found${NC}"
    exit 1
fi

# Check if ports are available
echo "🔍 Checking port availability..."
check_port 3456 "Backend API"
backend_available=$?
check_port 5173 "UI Development"
ui_available=$?

if [ $backend_available -eq 1 ] && [ $ui_available -eq 1 ]; then
    echo -e "${RED}❌ Both ports are in use. Please stop existing services first.${NC}"
    echo "   Use: pkill -f 'vite' && pkill -f 'cli.js'"
    exit 1
fi

echo ""

# Start backend server
echo -e "${BLUE}🔧 Starting Backend API Server...${NC}"
node /Users/rchoi/Developer/claude-code-router/dist/cli.js start &
BACKEND_PID=$!

# Wait for backend to be ready
if wait_for_service 3456 "Backend API Server"; then
    echo ""
else
    echo -e "${RED}❌ Backend server failed to start. Check logs above.${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start UI development server
echo -e "${BLUE}🎨 Starting UI Development Server...${NC}"
cd ui
pnpm dev &
UI_PID=$!
cd ..

# Wait for UI to be ready
if wait_for_service 5173 "UI Development Server"; then
    echo ""
else
    echo -e "${RED}❌ UI server failed to start. Check logs above.${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $UI_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Both servers started successfully!${NC}"
echo ""
echo -e "${GREEN}🌐 UI Server:        http://localhost:5173/${NC}"
echo -e "${GREEN}🔗 Backend API:      http://localhost:3456/${NC}"
echo ""
echo -e "${BLUE}📊 Process IDs:${NC}"
echo -e "${BLUE}   Backend: $BACKEND_PID${NC}"
echo -e "${BLUE}   UI:      $UI_PID${NC}"
echo ""
echo -e "${YELLOW}🛑 To stop both servers:${NC}"
echo -e "${YELLOW}   kill $BACKEND_PID $UI_PID${NC}"
echo -e "${YELLOW}   Or use: pkill -f 'vite' && pkill -f 'cli.js'${NC}"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "${BLUE}   Backend logs will appear above${NC}"
echo -e "${BLUE}   UI logs will appear above${NC}"

# Wait for user to stop (Ctrl+C)
echo ""
echo -e "${BLUE}Press Ctrl+C to stop both servers...${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $UI_PID 2>/dev/null
    echo -e "${GREEN}✅ Both servers stopped${NC}"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
