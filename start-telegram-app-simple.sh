#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting NEDOMA Telegram Mini App ===${NC}"

# Kill any existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "node"
sleep 2

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
echo -e "${GREEN}Using local IP: ${LOCAL_IP}${NC}"

# Start the frontend development server in the background
echo -e "${GREEN}Starting frontend development server...${NC}"
cd frontend
npm run dev -- --host 0.0.0.0 &
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

# Start the Telegram bot
echo -e "${GREEN}Starting Telegram bot...${NC}"
echo -e "${YELLOW}Mini App will be available at: http://${LOCAL_IP}:3004/telegram.html${NC}"
npm run bot

# Cleanup function to kill all background processes
cleanup() {
    echo -e "${YELLOW}Stopping all processes...${NC}"
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit 0
}

# Register cleanup for script termination
trap cleanup EXIT INT TERM

# Keep script running
wait
