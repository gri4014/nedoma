# Deployment Instructions

## Quick Start

1. From your local machine, copy deployment files to the server:
```bash
scp server-setup.sh deploy.sh test-env-setup.sh backup.sh SERVER-INSTRUCTIONS.md root@193.227.241.123:/root/
```

2. SSH into the server:
```bash
ssh root@193.227.241.123
```

3. Run the setup script:
```bash
cd /root
chmod +x *.sh
./server-setup.sh
```

## Files Overview

- `server-setup.sh`: Initial server configuration script
  - Installs Node.js, PostgreSQL 16, Git, and PM2
  - Sets up directories and permissions
  - Configures Git with your information

- `deploy.sh`: Deployment automation script
  - Handles code deployment from GitHub
  - Runs npm install and builds
  - Manages PM2 processes
  - Creates deployment logs

- `test-env-setup.sh`: Environment verification script
  - Checks all required software versions
  - Verifies directory permissions
  - Tests database connection
  - Validates environment files

- `backup.sh`: Backup automation script
  - Creates database backups
  - Backs up environment files
  - Maintains backup rotation
  - Logs backup operations

## Important URLs and Credentials

- Server: 193.227.241.123
- Login: root
- Password: JSwKu79nYgiqSfuj

## GitHub Repository

- URL: https://github.com/gri4014/nedoma
- Owner: Grigorii Peruntsev (gri4014@gmail.com)

## Directory Structure

```
/opt/nedoma/
├── backend/
├── frontend/
├── uploads/
├── storage/
└── backups/

/var/log/nedoma/
├── deploy_*.log
└── backup_*.log

/var/log/pm2/
└── pm2.log
```

## Common Tasks

### First Deployment
```bash
cd /root
./server-setup.sh
./test-env-setup.sh
./deploy.sh
```

### Update Application
```bash
cd /root
./deploy.sh
```

### Create Backup
```bash
cd /root
./backup.sh
```

For detailed instructions, see `SERVER-INSTRUCTIONS.md`
