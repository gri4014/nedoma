#!/bin/bash

# Exit on error
set -e

echo "Starting NEDOMA deployment..."

# System updates
apt update && apt upgrade -y

# Install required packages
apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Create application directories
mkdir -p /opt/nedoma /var/log/nedoma /opt/nedoma/uploads /opt/nedoma/storage /opt/nedoma/backups

# Set up Git config
git config --global user.name "Grigorii Peruntsev"
git config --global user.email "gri4014@gmail.com"

# Clone repository
cd /opt/nedoma
if [ -d ".git" ]; then
  git pull origin main
else
  git clone https://github.com/gri4014/nedoma.git .
fi

# Database setup
su - postgres -c "psql -c \"CREATE DATABASE nedoma;\" || true"
su - postgres -c "psql -c \"ALTER ROLE postgres WITH PASSWORD 'postgres';\" || true"

# Environment configuration
cat > /opt/nedoma/backend/.env << 'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
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

# Install dependencies and build
cd /opt/nedoma/backend
npm install
npm run migrate

cd /opt/nedoma/frontend
npm install
npm run build --skip-typescript || npm run build

# Configure Nginx
cat > /etc/nginx/sites-available/nedoma.site << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name nedoma.site www.nedoma.site;
    
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
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    root /opt/nedoma/frontend/dist;
    index index.html;

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

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = / {
        return 301 /welcome;
    }

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

    location /admin {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
EOF

# Enable site configuration
ln -sf /etc/nginx/sites-available/nedoma.site /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Obtain SSL certificate
certbot --nginx -d nedoma.site -d www.nedoma.site --non-interactive --agree-tos --email gri4014@gmail.com

# Set up PM2 to run the application
cd /opt/nedoma/backend
pm2 start --name nedoma-backend npm -- run dev
pm2 save

# Final message
echo "NEDOMA deployment complete!"
echo "The application should now be accessible at https://nedoma.site"
