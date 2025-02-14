BEGIN;

-- Add device_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS device_id VARCHAR(255) UNIQUE;

-- Add index on device_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- Modify telegram_id to be VARCHAR
ALTER TABLE users 
ALTER COLUMN telegram_id TYPE VARCHAR(255) USING telegram_id::VARCHAR(255);

COMMIT;
