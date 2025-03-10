#!/bin/bash

# Start Telegram Mini App on Mac
# This script starts all the necessary components to run the NEDOMA Telegram mini app locally

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting NEDOMA Telegram Mini App ===${NC}"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}Error: ngrok is not installed.${NC}"
    echo -e "Please install ngrok first:"
    echo -e "${YELLOW}brew install ngrok${NC} or download from https://ngrok.com/download"
    exit 1
fi

# Check if ngrok is authenticated
echo -e "${YELLOW}Checking ngrok authentication...${NC}"
ngrok config check > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: ngrok is not authenticated.${NC}"
    echo -e "Please sign up for a free account at https://dashboard.ngrok.com/signup"
    echo -e "Then get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken"
    echo -e "And configure ngrok with your authtoken:"
    echo -e "${YELLOW}ngrok config add-authtoken YOUR_AUTHTOKEN${NC}"
    exit 1
fi

# Check if any processes are running on ports 3002 (backend) and 3004/3005 (frontend)
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

# Start the frontend development server in the background
echo -e "${GREEN}Starting frontend development server...${NC}"
cd ../frontend
npm run dev &
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

# Determine which port the frontend is using (3004 or 3005)
FRONTEND_PORT=3004
lsof -i :3004 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${YELLOW}Frontend is running on port 3004${NC}"
else
    echo -e "${YELLOW}Frontend is running on port 3005${NC}"
    FRONTEND_PORT=3005
fi

# Check if ngrok is already running
NGROK_RUNNING=$(ps aux | grep "ngrok http" | grep -v grep | wc -l)
if [ $NGROK_RUNNING -gt 0 ]; then
    echo -e "${YELLOW}ngrok is already running. Using existing session...${NC}"
    # Get the ngrok API URL
    NGROK_API_URL="http://localhost:4040/api/tunnels"
    # Try to get the URL from the ngrok API
    if command -v curl &> /dev/null; then
        NGROK_URL=$(curl -s $NGROK_API_URL | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
    elif command -v wget &> /dev/null; then
        NGROK_URL=$(wget -qO- $NGROK_API_URL | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
    fi
    
    if [ -z "$NGROK_URL" ]; then
        echo -e "${RED}Failed to get ngrok URL from API. Please enter it manually.${NC}"
        echo -e "${YELLOW}You can find it by opening http://localhost:4040 in your browser.${NC}"
        echo -e "${GREEN}Enter the ngrok URL (or press Enter to exit):${NC}"
        read -r NGROK_URL
        if [ -z "$NGROK_URL" ]; then
            cleanup
            exit 1
        fi
    else
        echo -e "${GREEN}Found existing ngrok URL: $NGROK_URL${NC}"
    fi
else
    # Start ngrok in the background to create an HTTPS tunnel to the frontend
    echo -e "${GREEN}Starting ngrok to create HTTPS tunnel to frontend (port $FRONTEND_PORT)...${NC}"
    ngrok http $FRONTEND_PORT > ngrok.log 2>&1 &
    NGROK_PID=$!
    echo -e "ngrok started with PID: $NGROK_PID"

    # Wait for ngrok to start and get the public URL
    echo -e "${YELLOW}Waiting for ngrok to start...${NC}"
    sleep 5
fi

# Extract the ngrok URL from the log file - improved pattern matching
NGROK_URL=$(grep -o 'Forwarding[[:space:]]*https://[^[:space:]]*' ngrok.log | grep -v "dashboard" | head -1 | awk '{print $2}')
if [ -z "$NGROK_URL" ]; then
    # Try alternative pattern
    NGROK_URL=$(grep -o 'url=https://[^[:space:]]*' ngrok.log | grep -v "dashboard" | head -1 | cut -d= -f2)
fi
if [ -z "$NGROK_URL" ]; then
    # Try alternative pattern
    NGROK_URL=$(grep -o 'url: https://[^[:space:]]*' ngrok.log | grep -v "dashboard" | head -1 | cut -d' ' -f2)
fi
if [ -z "$NGROK_URL" ]; then
    # Try another alternative pattern
    NGROK_URL=$(grep -o 'https://[^[:space:]]*\.ngrok\.io' ngrok.log | head -1)
fi
if [ -z "$NGROK_URL" ]; then
    # Try another alternative pattern for ngrok-free.app domains
    NGROK_URL=$(grep -o 'https://[^[:space:]]*\.ngrok-free\.app' ngrok.log | head -1)
fi

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}Failed to get ngrok URL automatically. Displaying ngrok log for manual inspection:${NC}"
    cat ngrok.log
    echo -e "${YELLOW}Please look for a URL like 'https://xxxx-xx-xx-xx-xx.ngrok.io' in the log above${NC}"
    echo -e "You can manually set the TELEGRAM_WEBAPP_URL environment variable:"
    echo -e "${YELLOW}export TELEGRAM_WEBAPP_URL=https://your-ngrok-url.ngrok.io/telegram.html${NC}"
    echo -e "Then start the bot with: ${YELLOW}cd backend && npm run bot${NC}"
    
    # Ask user to input the URL manually
    echo -e "${GREEN}Enter the ngrok URL from the log (or press Enter to exit):${NC}"
    read -r MANUAL_URL
    if [ -n "$MANUAL_URL" ]; then
        NGROK_URL=$MANUAL_URL
    else
        cleanup
        exit 1
    fi
else
    # Set the TELEGRAM_WEBAPP_URL environment variable
    TELEGRAM_WEBAPP_URL="${NGROK_URL}/telegram.html"
    echo -e "${GREEN}ngrok URL: ${TELEGRAM_WEBAPP_URL}${NC}"
    
    # Start the Telegram bot with the ngrok URL
    echo -e "${GREEN}Starting Telegram bot...${NC}"
    TELEGRAM_WEBAPP_URL=$TELEGRAM_WEBAPP_URL npm run bot
fi

# Cleanup function to kill all background processes when the script is terminated
cleanup() {
    echo -e "${YELLOW}Stopping all processes...${NC}"
    kill $FRONTEND_PID $BACKEND_PID $NGROK_PID 2>/dev/null
    exit 0
}

# Register the cleanup function to be called on exit
trap cleanup EXIT INT TERM

# Keep the script running
wait
