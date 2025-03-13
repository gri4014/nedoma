# Deployment Guide

This guide explains how to set up and deploy the application in both development (Mac) and production (Ubuntu) environments.

## Local Development (Mac)

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <repository-name>
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up local environment files:
```bash
# Copy development environment files
cp .env.development .env
cd ../frontend
cp .env.development .env
```

4. Start PostgreSQL using Docker:
```bash
docker-compose up -d db
```

5. Run database migrations:
```bash
cd ../backend
npm run migrate
```

6. Start the development servers:
```bash
# Start backend (in backend directory)
npm run dev

# Start frontend (in frontend directory)
cd ../frontend
npm run dev
```

## Production Deployment (Ubuntu Server)

### Initial Server Setup

1. Copy deployment files to your server:
```bash
scp server-setup.sh deploy.sh root@193.227.241.123:/root/
```

2. SSH into your server:
```bash
ssh root@193.227.241.123
```

3. Run the server setup script:
```bash
cd /root
chmod +x server-setup.sh
./server-setup.sh
```

4. Clone your repository:
```bash
cd /opt/nedoma
git clone <your-repo-url> .
```

5. Set up production environment files:
```bash
cd backend
cp .env.production .env
```

6. Run the deployment script:
```bash
cd /root
chmod +x deploy.sh
./deploy.sh
```

### Updating the Application

When you push changes to GitHub:

1. SSH into your server:
```bash
ssh root@193.227.241.123
```

2. Run the deployment script:
```bash
cd /root
./deploy.sh
```

## Environment Files

### Backend (.env.production)
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=nedoma_copy
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
JWT_SECRET=your-secret-key-here
DB_SSL=false
NODE_ENV=production
PORT=3002
FRONTEND_URL=http://localhost:3004
```

### Frontend (.env.production)
```
VITE_API_URL=http://localhost:3002
PORT=3004
```

## PM2 Process Management

The deployment script automatically manages the PM2 processes. To manually manage them:

```bash
# List all processes
pm2 list

# Restart a process
pm2 restart backend
pm2 restart frontend

# View logs
pm2 logs backend
pm2 logs frontend
```

## Database Backup

To create a database backup:
```bash
pg_dump -U postgres nedoma_copy > backup.sql
```

To restore from backup:
```bash
psql -U postgres nedoma_copy < backup.sql
```

## Troubleshooting

1. If the backend fails to start, check the logs:
```bash
pm2 logs backend
```

2. If the database connection fails, verify PostgreSQL is running:
```bash
systemctl status postgresql
```

3. If the frontend can't connect to the backend, check if the backend is running and the API URL is correct:
```bash
curl http://localhost:3002
```

4. To restart both services:
```bash
pm2 restart all
