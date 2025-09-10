#!/bin/bash

# Claude Code Router Development Stop Script
# This script stops both the backend API server and the UI development server

echo "🛑 Stopping Claude Code Router Development Servers..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill processes by port
kill_by_port() {
    local port=$1
    local service_name=$2

    echo -e "${BLUE}🔍 Looking for $service_name on port $port...${NC}"

    # Find PIDs listening on the port
    local pids=$(lsof -ti :$port 2>/dev/null)

    if [ -n "$pids" ]; then
        echo -e "${YELLOW}⚠️  Found processes on port $port: $pids${NC}"
        echo -e "${RED}🛑 Killing processes...${NC}"
        kill $pids 2>/dev/null
        sleep 1

        # Check if they're still running
        if lsof -ti :$port >/dev/null 2>&1; then
            echo -e "${RED}❌ Force killing processes...${NC}"
            kill -9 $pids 2>/dev/null
            sleep 1
        fi

        if lsof -ti :$port >/dev/null 2>&1; then
            echo -e "${RED}❌ Failed to stop $service_name on port $port${NC}"
        else
            echo -e "${GREEN}✅ Successfully stopped $service_name${NC}"
        fi
    else
        echo -e "${GREEN}✅ No processes found on port $port${NC}"
    fi
}

# Stop specific processes
echo -e "${BLUE}🧹 Stopping development servers...${NC}"
echo ""

# Stop backend server (port 3456)
kill_by_port 3456 "Backend API Server"

# Stop UI server (port 5173)
kill_by_port 5173 "UI Development Server"

echo ""
echo -e "${GREEN}🎉 Cleanup complete!${NC}"
echo ""
echo -e "${BLUE}💡 Alternative stop commands:${NC}"
echo -e "${BLUE}   pkill -f 'vite' && pkill -f 'cli.js'${NC}"
echo -e "${BLUE}   killall node${NC}"
