#!/bin/bash

# Test environment configuration script
echo "Testing environment configuration..."

# Check Node.js installation
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Check npm installation
NPM_VERSION=$(npm -v)
echo "npm version: $NPM_VERSION"

# Check PostgreSQL installation
PG_VERSION=$(psql --version)
echo "PostgreSQL version: $PG_VERSION"

# Test PostgreSQL connection
echo "Testing PostgreSQL connection..."
psql -U postgres -d nedoma_copy -c "SELECT version();" || {
    echo "Error: PostgreSQL connection failed"
    exit 1
}

# Check PM2 installation
PM2_VERSION=$(pm2 -v)
echo "PM2 version: $PM2_VERSION"

# Check required directories
echo "Checking required directories..."
for dir in "/opt/nedoma" "/var/log/nedoma" "/opt/nedoma/uploads" "/opt/nedoma/storage"
do
    if [ -d "$dir" ]; then
        echo "$dir exists"
        ls -ld "$dir"
    else
        echo "Warning: $dir does not exist"
    fi
done

# Check environment files
echo "Checking environment files..."
for file in "/opt/nedoma/backend/.env.production" "/opt/nedoma/backend/.env.development"
do
    if [ -f "$file" ]; then
        echo "$file exists"
    else
        echo "Warning: $file does not exist"
    fi
done

# Test frontend build directory
if [ -d "/opt/nedoma/frontend/dist" ]; then
    echo "Frontend build directory exists"
else
    echo "Warning: Frontend build directory does not exist"
fi

echo "Environment test completed"
