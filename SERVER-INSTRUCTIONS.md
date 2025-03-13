# Server Setup and Deployment Instructions

## Initial Server Setup (Ubuntu 24.04 LTS)

1. Connect to the server:
```bash
ssh root@193.227.241.123
password: JSwKu79nYgiqSfuj
```

2. Copy setup files to server:
```bash
# From your local machine
scp server-setup.sh deploy.sh test-env-setup.sh backup.sh root@193.227.241.123:/root/
```

3. Make scripts executable and run setup:
```bash
cd /root
chmod +x server-setup.sh deploy.sh test-env-setup.sh backup.sh
./server-setup.sh
```

4. Clone the repository:
```bash
cd /opt/nedoma
git clone https://github.com/gri4014/nedoma.git .
```

5. Run environment test:
```bash
cd /root
./test-env-setup.sh
```

## Database Setup

1. Run migrations:
```bash
cd /opt/nedoma/backend
npm run migrate
```

2. Verify database setup:
```bash
psql -U postgres -d nedoma_copy -c "\dt"
```

## Application Deployment

1. First deployment:
```bash
cd /root
./deploy.sh
```

2. Verify services are running:
```bash
pm2 list
pm2 logs
```

## Regular Maintenance

### Daily Backups
```bash
cd /root
./backup.sh
```

### Check service status:
```bash
pm2 list
systemctl status postgresql
```

### View logs:
```bash
# Application logs
pm2 logs

# Deployment logs
ls -l /var/log/nedoma/deploy_*.log

# Backup logs
ls -l /var/log/nedoma/backup_*.log
```

### Update application:
```bash
cd /root
./deploy.sh
```

## Troubleshooting

1. If PostgreSQL fails to start:
```bash
systemctl status postgresql
journalctl -xe
# Check version-specific path
ls /etc/postgresql/16/main/
```

2. If PM2 processes fail:
```bash
pm2 logs
pm2 restart all
```

3. If environment test fails:
```bash
./test-env-setup.sh
```

4. Check disk space and permissions:
```bash
df -h
ls -la /opt/nedoma/
ls -la /var/log/nedoma/
```

## Environment Configuration

Important directories:
- Application: /opt/nedoma
- Logs: /var/log/nedoma
- Uploads: /opt/nedoma/uploads
- Storage: /opt/nedoma/storage
- Backups: /opt/nedoma/backups
- PM2 logs: /var/log/pm2

File locations:
- Backend: /opt/nedoma/backend
- Frontend: /opt/nedoma/frontend
- Environment files: /opt/nedoma/backend/.env.*

## Security Notes

1. Protect environment files:
```bash
chmod 600 /opt/nedoma/backend/.env*
```

2. Regular system updates:
```bash
apt update
apt upgrade
```

3. Monitor auth logs:
```bash
tail -f /var/log/auth.log
```

## Contact Information

For any issues, please contact:
- Name: Grigorii Peruntsev
- Email: gri4014@gmail.com
- GitHub: https://github.com/gri4014/nedoma
