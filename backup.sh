#!/bin/bash

# Configuration
BACKUP_DIR="/opt/nedoma/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="/var/log/nedoma"
DB_NAME="nedoma_copy"
DB_USER="postgres"

# Ensure backup and log directories exist
mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

# Log file
BACKUP_LOG="$LOG_DIR/backup_$TIMESTAMP.log"

# Function for logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $BACKUP_LOG
}

# Error handling
set -e
trap 'log "Error: Command failed at line $LINENO"' ERR

# Start backup process
log "Starting backup process..."

# Backup database
log "Creating database backup..."
pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Backup environment files
log "Backing up environment files..."
if [ -f "/opt/nedoma/backend/.env" ]; then
    cp /opt/nedoma/backend/.env "$BACKUP_DIR/env_backup_$TIMESTAMP"
fi

# Backup uploads directory
log "Backing up uploads directory..."
if [ -d "/opt/nedoma/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" -C /opt/nedoma uploads/
fi

# Clean old backups (keep last 5)
log "Cleaning old backups..."
cd $BACKUP_DIR
ls -t db_backup_* | tail -n +6 | xargs -r rm
ls -t env_backup_* | tail -n +6 | xargs -r rm
ls -t uploads_backup_* | tail -n +6 | xargs -r rm

# List current backups
log "Current backups:"
ls -lh $BACKUP_DIR

# Print completion message
log "Backup completed successfully!"
log "Backup files are located in: $BACKUP_DIR"
log "Backup log available at: $BACKUP_LOG"

# Check disk space
df -h $BACKUP_DIR | tee -a $BACKUP_LOG
