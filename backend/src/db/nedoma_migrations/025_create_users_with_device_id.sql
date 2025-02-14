-- Create users table with device_id as primary identifier
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL UNIQUE,
    telegram_id VARCHAR(255) UNIQUE, -- Will be used later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on device_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- Add index on telegram_id for future use
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
