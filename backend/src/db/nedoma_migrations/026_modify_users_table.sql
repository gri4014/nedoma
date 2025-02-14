BEGIN;

-- Add temp_id column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS temp_id UUID UNIQUE DEFAULT uuid_generate_v4();

-- Add last_active_at column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create update_last_active_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_last_active_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_active_at
DROP TRIGGER IF EXISTS update_users_last_active ON users;
CREATE TRIGGER update_users_last_active
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active_at();

COMMIT;
