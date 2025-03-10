#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting NEDOMA Telegram Mini App ===${NC}"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}Installing cloudflared...${NC}"
    brew install cloudflared
fi

# Check if any processes are running on ports 3002 (backend) and 3004 (frontend)
echo -e "${YELLOW}Checking for processes using required ports...${NC}"
lsof -i :3002 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${RED}Port 3002 is already in use. Killing the process...${NC}"
    kill $(lsof -t -i:3002) 2>/dev/null || true
    sleep 2
fi

lsof -i :3004 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${RED}Port 3004 is already in use. Killing the process...${NC}"
    kill $(lsof -t -i:3004) 2>/dev/null || true
    sleep 2
fi

# Kill any existing cloudflared processes
pkill cloudflared

# Start the frontend development server in the background
echo -e "${GREEN}Starting frontend development server...${NC}"
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
echo -e "Frontend server started with PID: $FRONTEND_PID"

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 5

# Start the backend server in the background
echo -e "${GREEN}Starting backend server...${NC}"
cd ../backend
npm run dev &
BACKEND_PID=$!
echo -e "Backend server started with PID: $BACKEND_PID"

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 5

# Start cloudflared tunnel
echo -e "${GREEN}Starting Cloudflare tunnel...${NC}"
cloudflared tunnel --url http://localhost:3004 > tunnel.log &
TUNNEL_PID=$!

# Wait for tunnel to start and get URL
sleep 5
TUNNEL_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' tunnel.log | head -n 1)

if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}Failed to get tunnel URL. Please check tunnel.log for details.${NC}"
    exit 1
fi

# Set the TELEGRAM_WEBAPP_URL environment variable
TELEGRAM_WEBAPP_URL="${TUNNEL_URL}/telegram.html"
echo -e "${GREEN}Telegram Web App URL: ${TELEGRAM_WEBAPP_URL}${NC}"

# Start the Telegram bot with the tunnel URL
echo -e "${GREEN}Starting Telegram bot...${NC}"
TELEGRAM_WEBAPP_URL=$TELEGRAM_WEBAPP_URL npm run bot

# Cleanup function to kill all background processes
cleanup() {
    echo -e "${YELLOW}Stopping all processes...${NC}"
    kill $FRONTEND_PID $BACKEND_PID $TUNNEL_PID 2>/dev/null
    pkill cloudflared
    exit 0
}

# Register cleanup for script termination
trap cleanup EXIT INT TERM

# Keep script running
wait
