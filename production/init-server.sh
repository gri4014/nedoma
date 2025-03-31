#!/bin/bash

# Configuration
SERVER_IP="194.58.114.113"
SERVER_USER="root"
SERVER_PASS="0QEzDjwngNxXNJ9O"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Function for logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Create necessary directories
log "Creating remote directories..."
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "mkdir -p /opt/nedoma/production"

# Copy deployment files
log "Copying deployment files..."
scp production/nginx.conf $SERVER_USER@$SERVER_IP:/opt/nedoma/production/
scp production/deploy-full.sh $SERVER_USER@$SERVER_IP:/opt/nedoma/production/

# Make deploy script executable
log "Setting permissions..."
ssh $SERVER_USER@$SERVER_IP "chmod +x /opt/nedoma/production/deploy-full.sh"

# Create initial nameserver configuration for the domain
log "Configuring nameservers..."
ssh $SERVER_USER@$SERVER_IP "cat > /opt/nedoma/production/dns.txt << EOL
Domain: nedoma.site
Nameservers:
ns5.hosting.reg.ru
ns6.hosting.reg.ru

A Record:
nedoma.site -> 194.58.114.113
www.nedoma.site -> 194.58.114.113
EOL"

log "Starting deployment..."
ssh $SERVER_USER@$SERVER_IP "cd /opt/nedoma/production && ./deploy-full.sh"

log "Initialization completed. Please check the server logs for deployment status."
log "Once deployment is complete, visit https://nedoma.site"
