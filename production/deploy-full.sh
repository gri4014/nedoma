#!/bin/bash

# Configuration
SERVER_IP="194.58.114.113"
DOMAIN="nedoma.site"
APP_DIR="/opt/nedoma"
GITHUB_REPO="https://github.com/gri4014/nedoma.git"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

# Update system and install dependencies
setup_system() {
    log "Updating system packages..."
    apt update && apt upgrade -y || error "Failed to update system packages"
    
    log "Installing required packages..."
    apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx || error "Failed to install packages"

    # Install Node.js 20.x
    log "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs || error "Failed to install Node.js"

    # Install PM2 globally
    log "Installing PM2..."
    npm install -y pm2 -g || error "Failed to install PM2"
}

# Configure PostgreSQL
setup_database() {
    log "Configuring PostgreSQL..."
    systemctl start postgresql
    systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'GgvpIzikatka228!';"
    sudo -u postgres psql -c "CREATE DATABASE nedoma_copy;"
    sudo -u postgres psql -c "ALTER ROLE postgres WITH SUPERUSER;"
    
    # Update pg_hba.conf for password authentication
    echo "host    all             all             localhost            md5" >> /etc/postgresql/16/main/pg_hba.conf
    systemctl restart postgresql
}

# Configure Nginx and SSL
setup_nginx() {
    log "Configuring Nginx..."
    # Copy our Nginx configuration
    cp /opt/nedoma/production/nginx.conf /etc/nginx/sites-available/$DOMAIN
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t || error "Nginx configuration test failed"
    
    # Get SSL certificate
    log "Setting up SSL with Let's Encrypt..."
    certbot --nginx --non-interactive --agree-tos --email gri4014@gmail.com -d $DOMAIN -d www.$DOMAIN || error "Failed to obtain SSL certificate"
    
    systemctl restart nginx
}

# Clone and setup application
setup_application() {
    log "Setting up application..."
    
    # Create necessary directories
    mkdir -p $APP_DIR
    chown -R $USER:$USER $APP_DIR
    
    # Clone repository
    cd $APP_DIR
    git clone $GITHUB_REPO . || error "Failed to clone repository"
    
    # Backend setup
    log "Setting up backend..."
    cd $APP_DIR/backend
    npm install || error "Failed to install backend dependencies"
    npm run build || error "Failed to build backend"
    
    # Create backend environment file
    cat > .env << EOL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=GgvpIzikatka228!
POSTGRES_DB=nedoma_copy
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
JWT_SECRET=your-secret-key-here
DB_SSL=false
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://$DOMAIN
EOL
    
    # Frontend setup
    log "Setting up frontend..."
    cd $APP_DIR/frontend
    npm install || error "Failed to install frontend dependencies"
    
    # Create frontend environment file
    cat > .env << EOL
VITE_API_URL=https://$DOMAIN/api
PORT=3004
EOL
    
    npm run build || error "Failed to build frontend"
    
    # Run database migrations
    log "Running database migrations..."
    cd $APP_DIR/backend
    npm run migrate || error "Failed to run database migrations"
}

# Start application
start_application() {
    log "Starting application with PM2..."
    cd $APP_DIR/backend
    pm2 start npm --name "backend" -- run start
    cd $APP_DIR/frontend
    pm2 serve dist 3004 --name "frontend" --spa
    
    # Save PM2 process list
    pm2 save
    
    # Set up PM2 to start on system boot
    pm2 startup
}

# Main execution
main() {
    log "Starting deployment process..."
    setup_system
    setup_database
    setup_nginx
    setup_application
    start_application
    log "Deployment completed successfully!"
    log "Application is now accessible at https://$DOMAIN"
}

# Run main function
main
