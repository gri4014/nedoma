#!/bin/bash
set -e

echo "Starting database migration process..."

# Run migrations
npx ts-node src/db/migrate.ts

# Verify users table structure
echo "Verifying users table structure..."
psql $DATABASE_URL -c "\d users"

# Verify constraints
echo "Verifying foreign key constraints..."
psql $DATABASE_URL -c "
  SELECT 
    tc.table_name, kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
  FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name IN ('users', 'user_category_preferences', 'user_tag_preferences')
    AND tc.constraint_type = 'FOREIGN KEY';"

echo "Database migration and verification complete."
