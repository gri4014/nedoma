BEGIN;

-- Drop old tables and triggers if they exist
DROP TRIGGER IF EXISTS update_temp_users_last_active ON temp_users;
DROP TABLE IF EXISTS temp_users;

-- Modify users table
ALTER TABLE users
DROP COLUMN IF EXISTS device_id CASCADE;

-- Make telegram_id NOT NULL and change to BIGINT
ALTER TABLE users
ALTER COLUMN telegram_id TYPE BIGINT USING telegram_id::bigint,
ALTER COLUMN telegram_id SET NOT NULL;

-- Create category preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_category_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    preference_level INTEGER NOT NULL CHECK (preference_level BETWEEN 0 AND 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subcategory_id)
);

-- Add trigger for updated_at on preferences
DROP TRIGGER IF EXISTS update_user_category_preferences_updated_at ON user_category_preferences;
CREATE TRIGGER update_user_category_preferences_updated_at
    BEFORE UPDATE ON user_category_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
