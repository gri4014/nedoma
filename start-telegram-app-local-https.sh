#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting NEDOMA Telegram Mini App with HTTPS ===${NC}"

# Create SSL certificates directory if it doesn't exist
mkdir -p certificates

# Generate SSL certificate if it doesn't exist
if [ ! -f certificates/localhost.key ] || [ ! -f certificates/localhost.crt ]; then
    echo -e "${YELLOW}Generating SSL certificate...${NC}"
    openssl req -x509 -newkey rsa:2048 -keyout certificates/localhost.key -out certificates/localhost.crt -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
fi

# Update Vite config to use HTTPS
cat > frontend/vite.config.ts << EOL
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3004,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../certificates/localhost.key')),
      cert: fs.readFileSync(path.resolve(__dirname, '../certificates/localhost.crt')),
    },
  },
});
EOL

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

# Start the frontend development server in the background
echo -e "${GREEN}Starting frontend development server...${NC}"
cd frontend
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

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
else
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

# Set the TELEGRAM_WEBAPP_URL environment variable to use local HTTPS
TELEGRAM_WEBAPP_URL="https://${LOCAL_IP}:3004/telegram.html"
echo -e "${GREEN}Telegram Web App URL: ${TELEGRAM_WEBAPP_URL}${NC}"
echo -e "${YELLOW}Note: You'll need to accept the self-signed certificate in your browser first${NC}"
echo -e "${YELLOW}Visit https://${LOCAL_IP}:3004 in your browser and accept the certificate${NC}"

# Start the Telegram bot with the local HTTPS URL
echo -e "${GREEN}Starting Telegram bot...${NC}"
TELEGRAM_WEBAPP_URL=$TELEGRAM_WEBAPP_URL npm run bot

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
