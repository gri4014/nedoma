#!/bin/bash

# Update system
apt update
apt upgrade -y

# Install Node.js 20.x and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL and Git
apt-get install -y postgresql postgresql-contrib git

# Configure Git
git config --global user.name "Grigorii Peruntsev"
git config --global user.email "gri4014@gmail.com"

# Install PM2 globally
npm install -y pm2 -g

# Create application directory
mkdir -p /opt/nedoma
chown -R $USER:$USER /opt/nedoma

# Create logs directory
mkdir -p /var/log/nedoma
chown -R $USER:$USER /var/log/nedoma

# Create uploads and storage directories
mkdir -p /opt/nedoma/uploads
mkdir -p /opt/nedoma/storage
mkdir -p /opt/nedoma/backups

# Set up PostgreSQL
su - postgres -c "psql -c \"CREATE USER postgres WITH PASSWORD 'postgres';\""
su - postgres -c "psql -c \"CREATE DATABASE nedoma_copy;\""
su - postgres -c "psql -c \"ALTER ROLE postgres WITH SUPERUSER;\""

# Configure PostgreSQL to allow connections from application
echo "host    all             all             localhost            md5" >> /etc/postgresql/16/main/pg_hba.conf
systemctl restart postgresql

# Print installation completion message
echo "Server setup completed successfully!"
echo "Next steps:"
echo "1. Clone the repository: git clone https://github.com/gri4014/nedoma.git /opt/nedoma"
echo "2. Run npm install in both backend and frontend directories"
echo "3. Run database migrations"
echo "4. Start the application with PM2"

# Create directory for PM2 logs
mkdir -p /var/log/pm2
chown -R $USER:$USER /var/log/pm2

# Set proper permissions
chmod -R 755 /opt/nedoma
chmod -R 755 /var/log/nedoma
chmod -R 755 /var/log/pm2
