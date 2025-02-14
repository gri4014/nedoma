-- Create temp_users table for the temporary user system
CREATE TABLE IF NOT EXISTS temp_users (
    id SERIAL PRIMARY KEY,
    temp_id UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    telegram_id BIGINT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_temp_users_temp_id ON temp_users(temp_id);
CREATE INDEX IF NOT EXISTS idx_temp_users_telegram_id ON temp_users(telegram_id);

-- Add trigger to update last_active_at
DROP TRIGGER IF EXISTS update_temp_users_last_active ON temp_users;
CREATE TRIGGER update_temp_users_last_active
    BEFORE UPDATE ON temp_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
