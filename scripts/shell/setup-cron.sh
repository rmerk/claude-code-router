#!/bin/bash

# Setup Cron Jobs for Ollama Maintenance
# This script sets up automated maintenance tasks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAINTENANCE_SCRIPT="$SCRIPT_DIR/auto-maintenance.sh"
LOG_FILE="$HOME/.ollama/maintenance.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Setting up automated Ollama maintenance...${NC}"

# Check if crontab is available
if ! command -v crontab &> /dev/null; then
    echo -e "${RED}Error: crontab is not available on this system${NC}"
    exit 1
fi

# Create maintenance log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Backup existing crontab
echo "Backing up existing crontab..."
crontab -l > "$HOME/.crontab.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

# Add maintenance jobs to crontab
echo "Adding maintenance jobs to crontab..."

# Weekly maintenance (Sundays at 2 AM)
(crontab -l 2>/dev/null; echo "# Ollama weekly maintenance") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * 0 $MAINTENANCE_SCRIPT >> $LOG_FILE 2>&1") | crontab -

# Daily health check (every day at 6 AM)
(crontab -l 2>/dev/null; echo "# Ollama daily health check") | crontab -
(crontab -l 2>/dev/null; echo "0 6 * * * $MAINTENANCE_SCRIPT health >> $LOG_FILE 2>&1") | crontab -

# Model update check (Mondays at 3 AM)
(crontab -l 2>/dev/null; echo "# Ollama model update check") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * 1 $MAINTENANCE_SCRIPT update >> $LOG_FILE 2>&1") | crontab -

echo -e "${GREEN}Cron jobs have been set up successfully!${NC}"
echo ""
echo "Scheduled tasks:"
echo "  • Weekly maintenance: Every Sunday at 2:00 AM"
echo "  • Daily health check: Every day at 6:00 AM"
echo "  • Model updates: Every Monday at 3:00 AM"
echo ""
echo "To view current crontab: crontab -l"
echo "To edit crontab manually: crontab -e"
echo "To remove all Ollama jobs: crontab -r (be careful!)"
echo ""
echo "Maintenance logs: $LOG_FILE"

# Test the maintenance script
echo ""
echo -e "${YELLOW}Testing maintenance script...${NC}"
if $MAINTENANCE_SCRIPT check; then
    echo -e "${GREEN}✅ Maintenance script is working correctly${NC}"
else
    echo -e "${RED}❌ Maintenance script has issues${NC}"
fi
