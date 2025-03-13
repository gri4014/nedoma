#!/bin/bash

# Configuration
APP_DIR="/opt/nedoma"
LOG_DIR="/var/log/nedoma"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GITHUB_REPO="https://github.com/gri4014/nedoma.git"
GITHUB_BRANCH="main"

# Ensure log directory exists
mkdir -p $LOG_DIR

# Log file
DEPLOY_LOG="$LOG_DIR/deploy_$TIMESTAMP.log"

# Function for logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $DEPLOY_LOG
}

# Error handling
set -e
trap 'log "Error: Command failed at line $LINENO"' ERR

# Print start message
log "Starting deployment process..."

# Initialize or update repository
if [ ! -d "$APP_DIR" ]; then
    log "Cloning repository..."
    git clone $GITHUB_REPO $APP_DIR
    cd $APP_DIR
else
    cd $APP_DIR
    log "Pulling latest changes from GitHub..."
    git pull origin $GITHUB_BRANCH
fi

# Create backup of current environment files
log "Backing up environment files..."
if [ -f backend/.env ]; then
    cp backend/.env backend/.env.backup_$TIMESTAMP
fi

# Install backend dependencies and build
log "Installing backend dependencies..."
cd backend || exit 1
npm install
npm run build

# Set up production environment
log "Setting up production environment..."
cp .env.production .env

# Install frontend dependencies and build
log "Installing frontend dependencies..."
cd ../frontend || exit 1
npm install
npm run build

# Run database migrations
log "Running database migrations..."
cd ../backend || exit 1
export NODE_ENV=production
npm run migrate

# Restart services with PM2
log "Restarting services..."
pm2 restart backend || pm2 start npm --name "backend" -- run start
pm2 restart frontend || pm2 serve ../frontend/dist 3004 --name "frontend"

# Save PM2 process list
pm2 save

log "Deployment completed successfully!"
log "Backend API running on port 3002"
log "Frontend running on port 3004"

# Check services status
log "Services status:"
pm2 list | tee -a $DEPLOY_LOG

# Show deployment log location
echo "Deployment log available at: $DEPLOY_LOG"
