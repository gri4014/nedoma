#!/bin/bash
set -e

echo "=== Applying user table fixes ==="

# Make scripts executable
chmod +x apply-migrations.sh
echo "✓ Made migration script executable"

# Run migrations
echo "Running migrations..."
./apply-migrations.sh

# Run user creation test
echo -e "\n=== Testing user functionality ==="
node test-user-creation.js

echo -e "\n=== Fix completed ==="
echo "You can now restart the server: cd backend && npm run dev"
