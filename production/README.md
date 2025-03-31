# NEDOMA Production Deployment Guide

This guide explains how to deploy the NEDOMA application to a production server and configure it with the domain nedoma.site.

## Prerequisites

- Ubuntu 24.04 LTS server (IP: 194.58.114.113)
- Domain name: nedoma.site
- DNS nameservers configured at reg.ru
- Root access to the server

## Initial Server Setup

### 1. DNS Configuration

Configure your domain with the following nameservers at reg.ru:
- ns5.hosting.reg.ru
- ns6.hosting.reg.ru

Configure A records:
- nedoma.site -> 194.58.114.113
- www.nedoma.site -> 194.58.114.113

### 2. Deployment Process

From your local machine, run:

```bash
cd production
./init-server.sh
```

This script will:
1. Copy necessary configuration files to the server
2. Set up the server environment
3. Install required dependencies
4. Configure PostgreSQL database
5. Set up Nginx with SSL
6. Deploy the application

## Application Structure

The application is structured with the following components:

```
/opt/nedoma/
├── backend/         # Node.js backend
├── frontend/        # React frontend
├── production/      # Deployment configurations
└── uploads/         # User uploaded files
```

## User Flow

The application follows this routing sequence:
1. / -> redirects to /welcome
2. /welcome -> Welcome page
3. /bubbles -> Bubble selection
4. /tags -> Tag selection
5. /events -> Events listing/swiping

## Services

The following services are running:
- Backend API (Port 3002)
- Frontend static files served by Nginx
- PostgreSQL database
- PM2 process manager

## Monitoring & Maintenance

### View Service Status
```bash
# Check PM2 processes
pm2 list

# View backend logs
pm2 logs backend

# View frontend logs
pm2 logs frontend

# Check Nginx status
systemctl status nginx
```

### Update Application

When you push changes to GitHub:

1. SSH into the server:
```bash
ssh root@194.58.114.113
```

2. Navigate to the app directory:
```bash
cd /opt/nedoma/production
```

3. Run the deployment script:
```bash
./deploy-full.sh
```

### Backup Database

To create a database backup:
```bash
cd /opt/nedoma/production
./backup.sh
```

Backups are stored in `/opt/nedoma/backups/`

## SSL Certificate

SSL certificates are automatically managed by Certbot/Let's Encrypt. They will auto-renew when needed.

To check certificate status:
```bash
certbot certificates
```

## Troubleshooting

1. If the site is inaccessible:
```bash
# Check Nginx status
systemctl status nginx

# Check SSL certificate
certbot certificates

# Verify DNS settings
dig nedoma.site
```

2. If the backend is not responding:
```bash
# Check PM2 processes
pm2 list

# Check backend logs
pm2 logs backend
```

3. Database issues:
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check database connectivity
sudo -u postgres psql -d nedoma_copy -c "\l"
```

For additional support, check the logs in `/var/log/nedoma/`
