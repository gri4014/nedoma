#!/bin/bash

# Exit on error
set -e

echo "Starting NEDOMA deployment on nedoma.site..."

# Create important directories
mkdir -p /opt/nedoma/uploads /opt/nedoma/storage /opt/nedoma/backups

# Clone/update repository
cd /opt
if [ -d "/opt/nedoma/.git" ]; then
  cd /opt/nedoma
  git pull origin main
else
  git clone https://github.com/gri4014/nedoma.git /opt/nedoma
fi

# Database setup - create database if not exists
su - postgres -c "psql -c \"CREATE DATABASE nedoma;\" || true"

# Environment files
cat > /opt/nedoma/backend/.env << 'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=GgvpIzikatka228!
POSTGRES_DB=nedoma
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
JWT_SECRET=nedoma-jwt-secret-7c49f80e-3cb5-4ebb-865c-e6a2e5fac592
DB_SSL=false
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://nedoma.site
EOF

cat > /opt/nedoma/frontend/.env << 'EOF'
VITE_API_URL=https://nedoma.site/api
EOF

# Install dependencies and run migrations
cd /opt/nedoma/backend
npm ci
node migrate-nedoma.js

# Build frontend
cd /opt/nedoma/frontend
npm ci
npm run build

# Configure Nginx
cat > /etc/nginx/sites-available/nedoma.site << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name nedoma.site www.nedoma.site;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name nedoma.site www.nedoma.site;

    ssl_certificate /etc/letsencrypt/live/nedoma.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nedoma.site/privkey.pem;
    
    # Static frontend files
    root /opt/nedoma/frontend/dist;
    index index.html;

    # API requests proxy
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Route to welcome page by default
    location = / {
        return 301 /welcome;
    }

    # Standard SPA handling
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Explicitly handle the requested routes
    location /welcome {
        try_files $uri $uri/ /index.html;
    }

    location /bubbles {
        try_files $uri $uri/ /index.html;
    }

    location /tags {
        try_files $uri $uri/ /index.html;
    }

    location /events {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/nedoma.site /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Setup SSL if not already done
if [ ! -d "/etc/letsencrypt/live/nedoma.site" ]; then
    certbot --nginx -d nedoma.site -d www.nedoma.site --non-interactive --agree-tos --email gri4014@gmail.com
fi

# Start the application using PM2
cd /opt/nedoma/backend
pm2 start npm --name "nedoma-backend" -- run dev

# Save PM2 configuration so it auto-starts after reboot
pm2 save

echo "NEDOMA deployment complete!"
echo "The application should now be accessible at https://nedoma.site"
